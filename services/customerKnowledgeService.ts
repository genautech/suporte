// Serviço para gerenciar conhecimento específico por cliente
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
  arrayUnion,
} from 'firebase/firestore';
import { CustomerKnowledge, CustomerKnowledgeEntry } from '../types';
import { companyService } from './companyService';
import { conversationService } from './conversationService';
import { supportService } from './supportService';

const customerKnowledgeCollection = collection(db, 'customerKnowledge');

// Converter conhecimento do Firestore para objeto
const customerKnowledgeFromFirestore = (docSnapshot: any): CustomerKnowledge => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    knowledgeEntries: data.knowledgeEntries || [],
    faqEntries: data.faqEntries || [],
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
  } as CustomerKnowledge;
};

export const customerKnowledgeService = {
  /**
   * Busca ou cria conhecimento para um cliente
   */
  getOrCreateCustomerKnowledge: async (
    customerEmail: string,
    companyId?: string
  ): Promise<CustomerKnowledge> => {
    try {
      const normalizedEmail = customerEmail.toLowerCase().trim();
      
      // Identificar empresa se não fornecida
      let finalCompanyId = companyId;
      if (!finalCompanyId) {
        try {
          finalCompanyId = await companyService.getCompanyFromEmail(normalizedEmail);
        } catch (error) {
          console.error('[customerKnowledgeService] Erro ao identificar empresa:', error);
          finalCompanyId = 'general';
        }
      }
      
      // Buscar conhecimento existente
      const q = query(
        customerKnowledgeCollection,
        where('customerEmail', '==', normalizedEmail)
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return customerKnowledgeFromFirestore(snapshot.docs[0]);
      }
      
      // Criar novo conhecimento
      const newKnowledge: Omit<CustomerKnowledge, 'id'> = {
        customerEmail: normalizedEmail,
        companyId: finalCompanyId || 'general',
        knowledgeEntries: [],
        faqEntries: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const docRef = await addDoc(customerKnowledgeCollection, {
        ...newKnowledge,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      return {
        ...newKnowledge,
        id: docRef.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[customerKnowledgeService] Error getting/creating customer knowledge:', {
        customerEmail,
        companyId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Adiciona uma entrada de conhecimento para um cliente
   */
  addKnowledgeEntry: async (
    customerEmail: string,
    entry: Omit<CustomerKnowledgeEntry, 'createdAt' | 'updatedAt'>,
    companyId?: string
  ): Promise<void> => {
    try {
      const normalizedEmail = customerEmail.toLowerCase().trim();
      const knowledge = await customerKnowledgeService.getOrCreateCustomerKnowledge(
        normalizedEmail,
        companyId
      );
      
      const newEntry: CustomerKnowledgeEntry = {
        ...entry,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      const knowledgeRef = doc(customerKnowledgeCollection, knowledge.id);
      await updateDoc(knowledgeRef, {
        knowledgeEntries: arrayUnion(newEntry),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[customerKnowledgeService] Error adding knowledge entry:', {
        customerEmail,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Busca conhecimento de um cliente
   */
  getCustomerKnowledge: async (customerEmail: string): Promise<CustomerKnowledge | null> => {
    try {
      const normalizedEmail = customerEmail.toLowerCase().trim();
      const q = query(
        customerKnowledgeCollection,
        where('customerEmail', '==', normalizedEmail)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        return null;
      }
      
      return customerKnowledgeFromFirestore(snapshot.docs[0]);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[customerKnowledgeService] Error getting customer knowledge:', {
        customerEmail,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  },

  /**
   * Aprende com uma conversa resolvida
   */
  learnFromResolvedConversation: async (conversationId: string): Promise<void> => {
    try {
      const conversation = await conversationService.getConversationById(conversationId);
      if (!conversation || !conversation.resolved) {
        return;
      }
      
      const customerEmail = conversation.userId;
      if (!customerEmail) {
        return;
      }
      
      // Extrair pergunta e resposta da conversa
      const userMessages = conversation.messages.filter(m => m.sender === 'user');
      const botMessages = conversation.messages.filter(m => m.sender === 'bot');
      
      if (userMessages.length === 0 || botMessages.length === 0) {
        return;
      }
      
      // Pegar última pergunta do usuário e última resposta do bot
      const lastUserMessage = userMessages[userMessages.length - 1];
      const lastBotMessage = botMessages[botMessages.length - 1];
      
      if (!lastUserMessage.text || !lastBotMessage.text) {
        return;
      }
      
      // Adicionar entrada de conhecimento
      await customerKnowledgeService.addKnowledgeEntry(
        customerEmail,
        {
          question: lastUserMessage.text,
          answer: lastBotMessage.text,
          source: 'conversation',
          sourceId: conversationId,
        },
        conversation.companyId
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[customerKnowledgeService] Error learning from conversation:', {
        conversationId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Não lançar erro - aprendizado não deve bloquear o fluxo
    }
  },

  /**
   * Aprende com um ticket resolvido
   */
  learnFromTicketResolution: async (ticketId: string): Promise<void> => {
    try {
      const tickets = await supportService.getTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      
      if (!ticket || ticket.status !== 'resolvido') {
        return;
      }
      
      const customerEmail = ticket.email;
      if (!customerEmail) {
        return;
      }
      
      // Extrair problema e solução
      const problem = ticket.description;
      const solutionMessages = ticket.history
        .filter(h => h.author === 'admin' && h.type === 'comment')
        .map(h => h.content);
      
      if (!problem || solutionMessages.length === 0) {
        return;
      }
      
      const solution = solutionMessages.join('\n\n');
      
      // Adicionar entrada de conhecimento
      await customerKnowledgeService.addKnowledgeEntry(
        customerEmail,
        {
          question: `Problema: ${problem}`,
          answer: `Solução: ${solution}`,
          source: 'ticket',
          sourceId: ticketId,
        },
        ticket.companyId
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[customerKnowledgeService] Error learning from ticket:', {
        ticketId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Não lançar erro - aprendizado não deve bloquear o fluxo
    }
  },

  /**
   * Busca contexto de conhecimento para um cliente (para usar no Gemini)
   */
  getCustomerContext: async (
    customerEmail?: string,
    companyId?: string
  ): Promise<string> => {
    if (!customerEmail) {
      return '';
    }
    
    try {
      const knowledge = await customerKnowledgeService.getCustomerKnowledge(customerEmail);
      if (!knowledge || knowledge.knowledgeEntries.length === 0) {
        return '';
      }
      
      // Filtrar entradas relevantes (últimas 10)
      const recentEntries = knowledge.knowledgeEntries
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10);
      
      const contextText = recentEntries
        .map(entry => `Q: ${entry.question}\nR: ${entry.answer}`)
        .join('\n\n');
      
      return `\n\nCONHECIMENTO ESPECÍFICO DO CLIENTE (${customerEmail}):
${contextText}

Use este conhecimento específico do cliente quando relevante para responder perguntas similares.`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[customerKnowledgeService] Error getting customer context:', {
        customerEmail,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return '';
    }
  },
};





