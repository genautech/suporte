// Serviço para gerenciar conversas do chatbot
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
  limit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { Conversation, ConversationMessage, MessageSender } from '../types';
import { companyService } from './companyService';

const conversationsCollection = collection(db, 'conversations');

// Converter conversa do Firestore para objeto
const conversationFromFirestore = (docSnapshot: any): Conversation => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
  } as Conversation;
};

// Gerar UUID simples
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const conversationService = {
  // Salvar conversa no Firestore
  saveConversation: async (
    userId: string,
    sessionId: string,
    messages: ConversationMessage[],
    orderNumbers: string[] = []
  ): Promise<string> => {
    try {
      // Identificar empresa do usuário pelo email
      let companyId: string | undefined;
      if (userId) {
        try {
          companyId = await companyService.getCompanyFromEmail(userId);
        } catch (error) {
          console.error('[conversationService] Erro ao identificar empresa:', error);
          companyId = 'general'; // Fallback seguro
        }
      }
      
      // Preparar dados da conversa, removendo campos undefined (Firestore não aceita undefined)
      const conversationData: any = {
        userId,
        sessionId,
        messages,
        orderNumbers,
        resolved: false,
        attempts: 0,
        companyId: companyId || 'general', // Adicionar companyId
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // Adicionar campos opcionais apenas se tiverem valor (não undefined)
      // assignedCompanyId, supportUserId e aiInsights serão adicionados depois se necessário

      const docRef = await addDoc(conversationsCollection, conversationData);
      return docRef.id;
    } catch (error) {
      console.error('[conversationService] Erro ao salvar conversa:', error);
      throw error;
    }
  },

  // Atualizar conversa existente
  updateConversation: async (
    conversationId: string,
    updates: Partial<Conversation>
  ): Promise<void> => {
    try {
      const conversationRef = doc(conversationsCollection, conversationId);
      await updateDoc(conversationRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[conversationService] Erro ao atualizar conversa:', error);
      throw error;
    }
  },

  // Adicionar mensagem do admin à conversa
  addAdminMessage: async (
    conversationId: string,
    messageText: string
  ): Promise<void> => {
    try {
      const conversationRef = doc(conversationsCollection, conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (!conversationDoc.exists()) {
        throw new Error('Conversa não encontrada');
      }
      
      const conversationData = conversationDoc.data();
      const currentMessages = conversationData.messages || [];
      
      // Criar nova mensagem do admin
      const adminMessage: ConversationMessage = {
        text: messageText,
        sender: MessageSender.ADMIN,
        timestamp: Date.now(),
      };
      
      // Adicionar mensagem ao array
      const updatedMessages = [...currentMessages, adminMessage];
      
      // Atualizar conversa
      await updateDoc(conversationRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[conversationService] Erro ao adicionar mensagem do admin:', error);
      throw error;
    }
  },

  // Buscar histórico recente de conversas
  getConversationHistory: async (
    userId: string,
    limitCount: number = 3
  ): Promise<Conversation[]> => {
    try {
      const q = query(
        conversationsCollection,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(conversationFromFirestore);
    } catch (error) {
      console.error('[conversationService] Erro ao buscar histórico:', error);
      return [];
    }
  },

  // Buscar última conversa do usuário
  getLastConversation: async (userId: string): Promise<Conversation | null> => {
    try {
      const history = await conversationService.getConversationHistory(userId, 1);
      return history.length > 0 ? history[0] : null;
    } catch (error) {
      console.error('[conversationService] Erro ao buscar última conversa:', error);
      return null;
    }
  },

  // Adicionar feedback à conversa
  addFeedback: async (
    conversationId: string,
    rating: number,
    comment?: string
  ): Promise<void> => {
    try {
      await conversationService.updateConversation(conversationId, {
        feedback: {
          rating,
          comment,
          timestamp: Date.now(),
        },
        resolved: true,
      });
    } catch (error) {
      console.error('[conversationService] Erro ao adicionar feedback:', error);
      throw error;
    }
  },

  // Incrementar tentativas sem resolução
  incrementAttempts: async (conversationId: string): Promise<void> => {
    try {
      const conversationRef = doc(conversationsCollection, conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        const currentAttempts = conversationDoc.data().attempts || 0;
        await updateDoc(conversationRef, {
          attempts: currentAttempts + 1,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('[conversationService] Erro ao incrementar tentativas:', error);
      throw error;
    }
  },

  // Buscar conversa por ID
  getConversationById: async (conversationId: string): Promise<Conversation | null> => {
    try {
      const conversationRef = doc(conversationsCollection, conversationId);
      const conversationDoc = await getDoc(conversationRef);
      
      if (conversationDoc.exists()) {
        return conversationFromFirestore(conversationDoc);
      }
      return null;
    } catch (error) {
      console.error('[conversationService] Erro ao buscar conversa:', error);
      return null;
    }
  },

  // Gerar ou recuperar sessionId
  getOrCreateSessionId: (): string => {
    const storageKey = 'chatbot_session_id';
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      return stored;
    }
    
    const newSessionId = generateSessionId();
    localStorage.setItem(storageKey, newSessionId);
    
    // Expirar após 30 dias
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);
    localStorage.setItem(`${storageKey}_expires`, expirationDate.toISOString());
    
    return newSessionId;
  },

  // Verificar se sessionId ainda é válido
  isSessionValid: (): boolean => {
    const storageKey = 'chatbot_session_id';
    const expiresKey = `${storageKey}_expires`;
    
    const expires = localStorage.getItem(expiresKey);
    if (!expires) {
      return false;
    }
    
    const expirationDate = new Date(expires);
    if (expirationDate < new Date()) {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(expiresKey);
      return false;
    }
    
    return true;
  },

  // Listar todas as conversas (para admin)
  getAllConversations: async (limitCount?: number, includeArchived: boolean = false): Promise<Conversation[]> => {
    try {
      let q = query(
        conversationsCollection,
        orderBy('createdAt', 'desc')
      );
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      let conversations = querySnapshot.docs.map(conversationFromFirestore);
      
      // Filtrar arquivadas se não incluir
      if (!includeArchived) {
        conversations = conversations.filter(conv => !conv.archived);
      }
      
      return conversations;
    } catch (error) {
      console.error('[conversationService] Erro ao listar conversas:', error);
      return [];
    }
  },

  // Listar conversas por empresa
  getConversationsByCompany: async (companyId: string, limitCount?: number): Promise<Conversation[]> => {
    try {
      // Buscar por companyId ou assignedCompanyId
      const q1 = query(
        conversationsCollection,
        where('companyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      
      const q2 = query(
        conversationsCollection,
        where('assignedCompanyId', '==', companyId),
        orderBy('createdAt', 'desc')
      );
      
      let queries = [getDocs(q1), getDocs(q2)];
      
      if (limitCount) {
        const limitedQ1 = query(q1, limit(limitCount));
        const limitedQ2 = query(q2, limit(limitCount));
        queries = [getDocs(limitedQ1), getDocs(limitedQ2)];
      }
      
      const [snapshot1, snapshot2] = await Promise.all(queries);
      
      // Combinar resultados e remover duplicatas
      const allDocs = [...snapshot1.docs, ...snapshot2.docs];
      const uniqueDocs = Array.from(
        new Map(allDocs.map(doc => [doc.id, doc])).values()
      );
      
      return uniqueDocs.map(conversationFromFirestore);
    } catch (error) {
      console.error('[conversationService] Erro ao buscar conversas por empresa:', error);
      return [];
    }
  },

  // Listar conversas sem empresa atribuída (indefinidas)
  getUndefinedConversations: async (limitCount?: number): Promise<Conversation[]> => {
    try {
      const allConversations = await conversationService.getAllConversations(undefined, false);
      const undefinedConversations = allConversations.filter(conv => 
        (!conv.companyId || conv.companyId === 'general') && 
        !conv.assignedCompanyId &&
        !conv.archived
      );
      
      if (limitCount) {
        return undefinedConversations.slice(0, limitCount);
      }
      
      return undefinedConversations;
    } catch (error) {
      console.error('[conversationService] Erro ao buscar conversas indefinidas:', error);
      return [];
    }
  },

  // Atribuir empresa a uma conversa manualmente
  assignCompanyToConversation: async (conversationId: string, companyId: string): Promise<void> => {
    try {
      await conversationService.updateConversation(conversationId, {
        assignedCompanyId: companyId,
      });
    } catch (error) {
      console.error('[conversationService] Erro ao atribuir empresa à conversa:', error);
      throw error;
    }
  },

  // Arquivar uma conversa
  archiveConversation: async (conversationId: string): Promise<void> => {
    try {
      await conversationService.updateConversation(conversationId, {
        archived: true,
      });
    } catch (error) {
      console.error('[conversationService] Erro ao arquivar conversa:', error);
      throw error;
    }
  },

  // Desarquivar uma conversa
  unarchiveConversation: async (conversationId: string): Promise<void> => {
    try {
      await conversationService.updateConversation(conversationId, {
        archived: false,
      });
    } catch (error) {
      console.error('[conversationService] Erro ao desarquivar conversa:', error);
      throw error;
    }
  },

  // Vincular ticket a uma conversa
  linkTicketToConversation: async (conversationId: string, ticketId: string): Promise<void> => {
    try {
      await conversationService.updateConversation(conversationId, {
        ticketId: ticketId,
      });
    } catch (error) {
      console.error('[conversationService] Erro ao vincular ticket:', error);
      throw error;
    }
  },

  // Obter estatísticas de conversas
  getStatistics: async (): Promise<{
    totalConversations: number;
    resolvedConversations: number;
    unresolvedConversations: number;
    conversationsLast7Days: number;
    conversationsLast30Days: number;
    undefinedConversations: number;
  }> => {
    try {
      const allConversations = await conversationService.getAllConversations(undefined, false);
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      return {
        totalConversations: allConversations.length,
        resolvedConversations: allConversations.filter(c => c.resolved).length,
        unresolvedConversations: allConversations.filter(c => !c.resolved).length,
        conversationsLast7Days: allConversations.filter(c => c.createdAt >= sevenDaysAgo).length,
        conversationsLast30Days: allConversations.filter(c => c.createdAt >= thirtyDaysAgo).length,
        undefinedConversations: allConversations.filter(c => 
          (!c.companyId || c.companyId === 'general') && !c.assignedCompanyId
        ).length,
      };
    } catch (error) {
      console.error('[conversationService] Erro ao obter estatísticas:', error);
      return {
        totalConversations: 0,
        resolvedConversations: 0,
        unresolvedConversations: 0,
        conversationsLast7Days: 0,
        conversationsLast30Days: 0,
        undefinedConversations: 0,
      };
    }
  },
};

