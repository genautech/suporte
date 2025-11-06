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
  increment,
} from 'firebase/firestore';
import { FAQEntry, FAQCategory } from '../types';

const faqCollection = collection(db, 'faq');

const faqFromFirestore = (docSnapshot: any): FAQEntry => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
    views: data.views || 0,
    helpful: data.helpful || 0,
  } as FAQEntry;
};

export const faqService = {
  getFAQEntries: async (category?: FAQCategory): Promise<FAQEntry[]> => {
    try {
      // Buscar todos os documentos e filtrar/ordenar em memória para evitar necessidade de índice composto
      let q;
      if (category) {
        // Se tem categoria, filtrar por categoria e ordenar
        q = query(
          faqCollection,
          where('category', '==', category),
          orderBy('order', 'asc')
        );
      } else {
        // Sem categoria, apenas ordenar
        q = query(
          faqCollection,
          orderBy('order', 'asc')
        );
      }
      
      const snapshot = await getDocs(q);
      const allEntries = snapshot.docs.map(faqFromFirestore);
      
      // Filtrar por active em memória e garantir ordenação correta
      return allEntries
        .filter(entry => entry.active !== false) // Incluir apenas ativos (default true se não definido)
        .sort((a, b) => {
          // Ordenar por order primeiro, depois por createdAt
          if (a.order !== b.order) {
            return (a.order || 0) - (b.order || 0);
          }
          return (a.createdAt || 0) - (b.createdAt || 0);
        });
    } catch (error) {
      console.error('Error fetching FAQ entries:', error);
      // Fallback: buscar todos sem filtros e ordenar em memória
      try {
        const snapshot = await getDocs(faqCollection);
        const allEntries = snapshot.docs.map(faqFromFirestore);
        return allEntries
          .filter(entry => entry.active !== false)
          .filter(entry => !category || entry.category === category)
          .sort((a, b) => {
            if (a.order !== b.order) {
              return (a.order || 0) - (b.order || 0);
            }
            return (a.createdAt || 0) - (b.createdAt || 0);
          });
      } catch (fallbackError) {
        console.error('Error in fallback fetch:', fallbackError);
        return [];
      }
    }
  },

  getFAQEntry: async (id: string): Promise<FAQEntry | null> => {
    try {
      const docRef = doc(db, 'faq', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return faqFromFirestore(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error fetching FAQ entry:', error);
      return null;
    }
  },

  createFAQEntry: async (data: Omit<FAQEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      // Se não tiver order, calcular o próximo número
      let order = data.order;
      if (order === undefined) {
        const allEntries = await faqService.getFAQEntries();
        order = allEntries.length > 0 
          ? Math.max(...allEntries.map(e => e.order)) + 1 
          : 0;
      }

      const newEntry = {
        ...data,
        order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        views: 0,
        helpful: 0,
      };

      const docRef = await addDoc(faqCollection, newEntry);
      return docRef.id;
    } catch (error) {
      console.error('Error creating FAQ entry:', error);
      throw error;
    }
  },

  updateFAQEntry: async (id: string, data: Partial<Omit<FAQEntry, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> => {
    try {
      const docRef = doc(db, 'faq', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating FAQ entry:', error);
      throw error;
    }
  },

  deleteFAQEntry: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'faq', id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting FAQ entry:', error);
      throw error;
    }
  },

  searchFAQ: async (queryText: string): Promise<FAQEntry[]> => {
    try {
      const allEntries = await faqService.getFAQEntries();
      const lowerQuery = queryText.toLowerCase();
      const queryWords = lowerQuery.split(' ').filter(w => w.length > 2);

      return allEntries
        .map(entry => {
          let score = 0;
          const questionLower = entry.question.toLowerCase();
          const answerLower = entry.answer.toLowerCase();
          const tagsLower = entry.tags.join(' ').toLowerCase();

          // Match exato na pergunta
          if (questionLower.includes(lowerQuery)) score += 10;
          
          // Match exato na resposta
          if (answerLower.includes(lowerQuery)) score += 5;

          // Match em tags
          if (tagsLower.includes(lowerQuery)) score += 8;

          // Match de palavras individuais
          queryWords.forEach(word => {
            if (questionLower.includes(word)) score += 3;
            if (answerLower.includes(word)) score += 1;
            if (tagsLower.includes(word)) score += 2;
          });

          return { entry, score };
        })
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.entry)
        .slice(0, 10); // Limitar a 10 resultados
    } catch (error) {
      console.error('Error searching FAQ:', error);
      return [];
    }
  },

  incrementFAQViews: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'faq', id);
      await updateDoc(docRef, {
        views: increment(1),
      });
    } catch (error) {
      console.error('Error incrementing FAQ views:', error);
      // Não lançar erro, é uma operação não crítica
    }
  },

  markFAQHelpful: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'faq', id);
      await updateDoc(docRef, {
        helpful: increment(1),
      });
    } catch (error) {
      console.error('Error marking FAQ as helpful:', error);
      // Não lançar erro, é uma operação não crítica
    }
  },

  // Método para obter todas as entradas (incluindo inativas) - útil para admin
  getAllFAQEntries: async (): Promise<FAQEntry[]> => {
    try {
      const q = query(faqCollection, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(faqFromFirestore);
    } catch (error) {
      console.error('Error fetching all FAQ entries:', error);
      return [];
    }
  },

  // Método para reordenar FAQ entries
  reorderFAQEntries: async (entries: Array<{ id: string; order: number }>): Promise<void> => {
    try {
      const updates = entries.map(({ id, order }) => {
        const docRef = doc(db, 'faq', id);
        return updateDoc(docRef, {
          order,
          updatedAt: serverTimestamp(),
        });
      });

      await Promise.all(updates);
    } catch (error) {
      console.error('Error reordering FAQ entries:', error);
      throw error;
    }
  },
};

