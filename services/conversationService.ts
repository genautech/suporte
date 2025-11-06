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
import { Conversation, ConversationMessage } from '../types';
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
      
      const conversationData = {
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
};

