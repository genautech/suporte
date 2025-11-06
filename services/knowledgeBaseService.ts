import { db } from '../firebase';
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { KnowledgeBaseEntry } from '../types';
import { supportService } from './supportService';
import { Ticket } from '../types';

const knowledgeBaseCollection = collection(db, 'knowledgeBase');

const knowledgeEntryFromFirestore = (docSnapshot: any): KnowledgeBaseEntry => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
    verified: data.verified || false,
    relatedTickets: data.relatedTickets || [],
  } as KnowledgeBaseEntry;
};

export const knowledgeBaseService = {
  getKnowledgeBaseEntries: async (filters?: {
    category?: string;
    verified?: boolean;
  }): Promise<KnowledgeBaseEntry[]> => {
    try {
      let q: any = query(knowledgeBaseCollection, orderBy('createdAt', 'desc'));

      if (filters?.category) {
        q = query(knowledgeBaseCollection, where('category', '==', filters.category), orderBy('createdAt', 'desc'));
      }

      if (filters?.verified !== undefined) {
        if (filters.category) {
          q = query(
            knowledgeBaseCollection,
            where('category', '==', filters.category),
            where('verified', '==', filters.verified),
            orderBy('createdAt', 'desc')
          );
        } else {
          q = query(
            knowledgeBaseCollection,
            where('verified', '==', filters.verified),
            orderBy('createdAt', 'desc')
          );
        }
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(knowledgeEntryFromFirestore);
    } catch (error) {
      console.error('Error fetching knowledge base entries:', error);
      return [];
    }
  },

  getKnowledgeEntry: async (id: string): Promise<KnowledgeBaseEntry | null> => {
    try {
      const docRef = doc(db, 'knowledgeBase', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return knowledgeEntryFromFirestore(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error fetching knowledge entry:', error);
      return null;
    }
  },

  createKnowledgeEntry: async (
    data: Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    try {
      const newEntry = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        verified: data.verified || false,
        relatedTickets: data.relatedTickets || [],
      };

      const docRef = await addDoc(knowledgeBaseCollection, newEntry);
      return docRef.id;
    } catch (error) {
      console.error('Error creating knowledge entry:', error);
      throw error;
    }
  },

  updateKnowledgeEntry: async (
    id: string,
    data: Partial<Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> => {
    try {
      const docRef = doc(db, 'knowledgeBase', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating knowledge entry:', error);
      throw error;
    }
  },

  deleteKnowledgeEntry: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'knowledgeBase', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting knowledge entry:', error);
      throw error;
    }
  },

  searchKnowledgeBase: async (
    queryText: string,
    useGemini: boolean = false
  ): Promise<{ answer: string; sources: KnowledgeBaseEntry[] }> => {
    try {
      const allEntries = await knowledgeBaseService.getKnowledgeBaseEntries({
        verified: true,
      });

      const lowerQuery = queryText.toLowerCase();
      const queryWords = lowerQuery.split(' ').filter(w => w.length > 2);

      // Busca simples primeiro
      const matchingEntries = allEntries
        .map(entry => {
          let score = 0;
          const titleLower = entry.title.toLowerCase();
          const contentLower = entry.content.toLowerCase();
          const tagsLower = entry.tags.join(' ').toLowerCase();

          if (titleLower.includes(lowerQuery)) score += 10;
          if (contentLower.includes(lowerQuery)) score += 5;
          if (tagsLower.includes(lowerQuery)) score += 8;

          queryWords.forEach(word => {
            if (titleLower.includes(word)) score += 3;
            if (contentLower.includes(word)) score += 1;
            if (tagsLower.includes(word)) score += 2;
          });

          return { entry, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.entry)
        .slice(0, 5);

      if (matchingEntries.length > 0) {
        // Se encontrou resultados, sintetizar resposta
        const answer = matchingEntries
          .map(
            (entry, index) =>
              `${index + 1}. ${entry.title}\n${entry.content.substring(0, 200)}...`
          )
          .join('\n\n');

        return {
          answer,
          sources: matchingEntries,
        };
      }

      // Se não encontrou e useGemini é true, retornar resposta padrão
      // (a integração com Gemini será feita no geminiService)
      return {
        answer: 'Não encontrei informações específicas na base de conhecimento. Posso ajudar de outra forma?',
        sources: [],
      };
    } catch (error) {
      console.error('Error searching knowledge base:', error);
      return {
        answer: 'Erro ao buscar na base de conhecimento.',
        sources: [],
      };
    }
  },

  suggestFromTicket: async (ticketId: string): Promise<string | null> => {
    try {
      // Buscar o ticket
      const tickets = await supportService.getTickets();
      const ticket = tickets.find(t => t.id === ticketId);

      if (!ticket || ticket.status !== 'resolvido') {
        return null;
      }

      // Extrair informações relevantes do ticket
      const title = `Solução para: ${ticket.subject}`;
      const content = `Problema: ${ticket.description}\n\nSolução: ${
        ticket.history
          .filter(h => h.author === 'admin' && h.type === 'comment')
          .map(h => h.content)
          .join('\n\n') || 'Ticket resolvido.'
      }`;

      // Criar entrada de conhecimento sugerida
      const entryId = await knowledgeBaseService.createKnowledgeEntry({
        title,
        content,
        category: extractCategoryFromTicket(ticket),
        tags: extractTagsFromTicket(ticket),
        source: 'ticket',
        relatedTickets: [ticketId],
        verified: false, // Precisa ser verificado por admin
      });

      return entryId;
    } catch (error) {
      console.error('Error suggesting knowledge from ticket:', error);
      return null;
    }
  },

  verifyKnowledgeEntry: async (id: string): Promise<void> => {
    try {
      await knowledgeBaseService.updateKnowledgeEntry(id, { verified: true });
    } catch (error) {
      console.error('Error verifying knowledge entry:', error);
      throw error;
    }
  },
};

// Helper functions
const extractCategoryFromTicket = (ticket: Ticket): string => {
    const subject = ticket.subject.toLowerCase();
    if (subject.includes('cancelamento') || subject.includes('cancelar')) {
      return 'cancelamento';
    }
    if (subject.includes('reembolso') || subject.includes('reembolsar')) {
      return 'reembolso';
    }
    if (subject.includes('troca') || subject.includes('trocar')) {
      return 'troca';
    }
    if (subject.includes('rastreio') || subject.includes('rastrear')) {
      return 'rastreio';
    }
    if (subject.includes('pagamento') || subject.includes('pagar')) {
      return 'compra';
    }
    return 'geral';
};

const extractTagsFromTicket = (ticket: Ticket): string[] => {
    const tags: string[] = [];
    const subject = ticket.subject.toLowerCase();
    const description = ticket.description.toLowerCase();

    // Tags baseadas no assunto
    if (subject.includes('produto')) tags.push('produto');
    if (subject.includes('pedido')) tags.push('pedido');
    if (subject.includes('entrega')) tags.push('entrega');
    if (subject.includes('pagamento')) tags.push('pagamento');

    // Tags baseadas na descrição
    if (description.includes('defeito')) tags.push('defeito');
    if (description.includes('errado')) tags.push('produto-errado');
    if (description.includes('não recebido')) tags.push('não-recebido');
    if (description.includes('atraso')) tags.push('atraso');

    // Tags do pedido se houver
    if (ticket.orderNumber) {
      tags.push(`pedido-${ticket.orderNumber}`);
    }

    return [...new Set(tags)]; // Remover duplicatas
};

