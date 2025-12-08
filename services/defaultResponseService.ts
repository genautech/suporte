// Serviço para gerenciar respostas padrão por empresa
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
  increment,
} from 'firebase/firestore';
import { DefaultResponse } from '../types';
import { normalizeQuestion } from './questionTracker';

const defaultResponsesCollection = collection(db, 'defaultResponses');

const defaultResponseFromFirestore = (docSnapshot: any): DefaultResponse => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    keywords: data.keywords || [],
    active: data.active !== undefined ? data.active : true,
    usageCount: data.usageCount || 0,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
    deletedAt: data.deletedAt ? (data.deletedAt as Timestamp)?.toDate().getTime() : data.deletedAt,
  } as DefaultResponse;
};

/**
 * Calcula score de similaridade entre duas perguntas (0-1)
 */
const calculateSimilarity = (question1: string, question2: string): number => {
  const normalized1 = normalizeQuestion(question1);
  const normalized2 = normalizeQuestion(question2);
  
  // Exata match
  if (normalized1 === normalized2) {
    return 1.0;
  }
  
  // Uma contém a outra
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.9;
  }
  
  // Comparação por palavras
  const words1 = normalized1.split(' ').filter(w => w.length > 2);
  const words2 = normalized2.split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) {
    return 0;
  }
  
  const commonWords = words1.filter(w => words2.includes(w));
  const similarity = commonWords.length / Math.max(words1.length, words2.length);
  
  return similarity;
};

/**
 * Verifica se pergunta corresponde às palavras-chave
 */
const matchesKeywords = (question: string, keywords: string[]): boolean => {
  if (keywords.length === 0) return false;
  
  const normalizedQuestion = normalizeQuestion(question);
  return keywords.some(keyword => {
    const normalizedKeyword = normalizeQuestion(keyword);
    return normalizedQuestion.includes(normalizedKeyword);
  });
};

export const defaultResponseService = {
  /**
   * Busca todas as respostas padrão de uma empresa
   */
  getDefaultResponses: async (companyId: string, activeOnly: boolean = false): Promise<DefaultResponse[]> => {
    try {
      let q: any = query(
        defaultResponsesCollection,
        where('companyId', '==', companyId),
        orderBy('usageCount', 'desc')
      );
      
      if (activeOnly) {
        q = query(
          defaultResponsesCollection,
          where('companyId', '==', companyId),
          where('active', '==', true),
          orderBy('usageCount', 'desc')
        );
      }
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(defaultResponseFromFirestore);
    } catch (error) {
      console.error('[defaultResponseService] Erro ao buscar respostas padrão:', error);
      return [];
    }
  },

  /**
   * Busca uma resposta padrão por ID
   */
  getDefaultResponse: async (id: string): Promise<DefaultResponse | null> => {
    try {
      const docRef = doc(db, 'defaultResponses', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return defaultResponseFromFirestore(docSnap);
      }
      return null;
    } catch (error) {
      console.error('[defaultResponseService] Erro ao buscar resposta padrão:', error);
      return null;
    }
  },

  /**
   * Cria uma nova resposta padrão
   */
  createDefaultResponse: async (
    data: Omit<DefaultResponse, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>
  ): Promise<string> => {
    try {
      const newResponse = {
        ...data,
        usageCount: 0,
        active: data.active !== undefined ? data.active : true,
        keywords: data.keywords || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(defaultResponsesCollection, newResponse);
      return docRef.id;
    } catch (error) {
      console.error('[defaultResponseService] Erro ao criar resposta padrão:', error);
      throw error;
    }
  },

  /**
   * Atualiza uma resposta padrão
   */
  updateDefaultResponse: async (
    id: string,
    data: Partial<Omit<DefaultResponse, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>>
  ): Promise<void> => {
    try {
      const docRef = doc(db, 'defaultResponses', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[defaultResponseService] Erro ao atualizar resposta padrão:', error);
      throw error;
    }
  },

  /**
   * Incrementa contador de uso
   */
  incrementUsage: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'defaultResponses', id);
      await updateDoc(docRef, {
        usageCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[defaultResponseService] Erro ao incrementar uso:', error);
    }
  },

  /**
   * Deleta uma resposta padrão
   */
  deleteDefaultResponse: async (id: string): Promise<void> => {
    try {
      const docRef = doc(db, 'defaultResponses', id);
      await updateDoc(docRef, {
        active: false,
        deletedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[defaultResponseService] Erro ao deletar resposta padrão:', error);
      throw error;
    }
  },

  /**
   * Busca resposta padrão que corresponde à pergunta
   * Retorna resposta com maior score de matching
   */
  findMatchingResponse: async (
    question: string,
    companyId: string,
    threshold: number = 0.7
  ): Promise<DefaultResponse | null> => {
    try {
      const responses = await defaultResponseService.getDefaultResponses(companyId, true);
      
      if (responses.length === 0) {
        return null;
      }
      
      let bestMatch: DefaultResponse | null = null;
      let bestScore = 0;
      
      for (const response of responses) {
        let score = 0;
        
        // Score por similaridade de pergunta
        const similarityScore = calculateSimilarity(question, response.question);
        score = Math.max(score, similarityScore);
        
        // Score por palavras-chave
        if (matchesKeywords(question, response.keywords)) {
          score = Math.max(score, 0.8);
        }
        
        // Bonus por uso (respostas mais usadas têm prioridade)
        const usageBonus = Math.min(0.1, response.usageCount / 100);
        score += usageBonus;
        
        if (score > bestScore && score >= threshold) {
          bestScore = score;
          bestMatch = response;
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error('[defaultResponseService] Erro ao buscar resposta correspondente:', error);
      return null;
    }
  },
};


