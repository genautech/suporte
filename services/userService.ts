// Serviço para gerenciar usuários de suporte
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
  setDoc,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { SupportUser } from '../types';
import { companyService } from './companyService';

const supportUsersCollection = collection(db, 'supportUsers');

// Converter usuário do Firestore para objeto
const supportUserFromFirestore = (docSnapshot: any): SupportUser => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    ...data,
    firstAccessAt: (data.firstAccessAt as Timestamp)?.toDate().getTime() || Date.now(),
    lastAccessAt: (data.lastAccessAt as Timestamp)?.toDate().getTime() || Date.now(),
    lastInteractionAt: data.lastInteractionAt ? (data.lastInteractionAt as Timestamp)?.toDate().getTime() : undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
  } as SupportUser;
};

export const userService = {
  /**
   * Registra ou atualiza um login de usuário
   */
  recordLogin: async (email: string, additionalData?: { firstName?: string; lastName?: string; phone?: string }): Promise<SupportUser> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Verificar se usuário já existe
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      const userDoc = await getDoc(userRef);
      
      const now = Date.now();
      
      if (userDoc.exists()) {
        // Atualizar usuário existente
        const existingData = userDoc.data();
        await updateDoc(userRef, {
          lastAccessAt: serverTimestamp(),
          totalLogins: (existingData.totalLogins || 0) + 1,
          ...(additionalData?.firstName && { firstName: additionalData.firstName }),
          ...(additionalData?.lastName && { lastName: additionalData.lastName }),
          ...(additionalData?.phone && { phone: additionalData.phone }),
          updatedAt: serverTimestamp(),
        });
        
        // Atualizar companyId se ainda não foi atribuído manualmente
        if (!existingData.assignedCompanyId) {
          try {
            const autoDetectedCompanyId = await companyService.getCompanyFromEmail(normalizedEmail);
            if (autoDetectedCompanyId && autoDetectedCompanyId !== 'general') {
              await updateDoc(userRef, {
                autoDetectedCompanyId,
                updatedAt: serverTimestamp(),
              });
            }
          } catch (error) {
            console.error('[userService] Erro ao detectar empresa:', error);
          }
        }
        
        const updatedDoc = await getDoc(userRef);
        return supportUserFromFirestore(updatedDoc);
      } else {
        // Criar novo usuário
        let autoDetectedCompanyId: string | undefined;
        try {
          autoDetectedCompanyId = await companyService.getCompanyFromEmail(normalizedEmail);
        } catch (error) {
          console.error('[userService] Erro ao detectar empresa:', error);
        }
        
        const newUserData = {
          email: normalizedEmail,
          firstName: additionalData?.firstName || '',
          lastName: additionalData?.lastName || '',
          phone: additionalData?.phone || '',
          firstAccessAt: serverTimestamp(),
          lastAccessAt: serverTimestamp(),
          totalLogins: 1,
          totalConversations: 0,
          totalTickets: 0,
          autoDetectedCompanyId: autoDetectedCompanyId || undefined,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        
        await setDoc(userRef, newUserData);
        const createdDoc = await getDoc(userRef);
        return supportUserFromFirestore(createdDoc);
      }
    } catch (error) {
      console.error('[userService] Erro ao registrar login:', error);
      throw error;
    }
  },

  /**
   * Registra uma interação de chat (incrementa contador de conversas)
   */
  recordChatInteraction: async (email: string): Promise<void> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const existingData = userDoc.data();
        await updateDoc(userRef, {
          lastInteractionAt: serverTimestamp(),
          totalConversations: (existingData.totalConversations || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Se usuário não existe, criar com dados básicos
        await userService.recordLogin(email);
        await userService.recordChatInteraction(email);
      }
    } catch (error) {
      console.error('[userService] Erro ao registrar interação de chat:', error);
      // Não lançar erro para não quebrar o fluxo do chat
    }
  },

  /**
   * Registra criação de ticket (incrementa contador de tickets)
   */
  recordTicketCreation: async (email: string): Promise<void> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const existingData = userDoc.data();
        await updateDoc(userRef, {
          totalTickets: (existingData.totalTickets || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Se usuário não existe, criar com dados básicos
        await userService.recordLogin(email);
        await userService.recordTicketCreation(email);
      }
    } catch (error) {
      console.error('[userService] Erro ao registrar criação de ticket:', error);
      // Não lançar erro para não quebrar o fluxo
    }
  },

  /**
   * Busca um usuário por email
   */
  getUserByEmail: async (email: string): Promise<SupportUser | null> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return supportUserFromFirestore(userDoc);
      }
      return null;
    } catch (error) {
      console.error('[userService] Erro ao buscar usuário:', error);
      return null;
    }
  },

  /**
   * Lista todos os usuários (para admin)
   */
  getAllUsers: async (limitCount?: number): Promise<SupportUser[]> => {
    try {
      let q = query(
        supportUsersCollection,
        orderBy('lastAccessAt', 'desc')
      );
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(supportUserFromFirestore);
    } catch (error) {
      console.error('[userService] Erro ao listar usuários:', error);
      return [];
    }
  },

  /**
   * Lista usuários por empresa
   */
  getUsersByCompany: async (companyId: string): Promise<SupportUser[]> => {
    try {
      // Buscar por assignedCompanyId ou autoDetectedCompanyId
      const q1 = query(
        supportUsersCollection,
        where('assignedCompanyId', '==', companyId)
      );
      
      const q2 = query(
        supportUsersCollection,
        where('autoDetectedCompanyId', '==', companyId)
      );
      
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      // Combinar resultados e remover duplicatas
      const allDocs = [...snapshot1.docs, ...snapshot2.docs];
      const uniqueDocs = Array.from(
        new Map(allDocs.map(doc => [doc.id, doc])).values()
      );
      
      return uniqueDocs.map(supportUserFromFirestore);
    } catch (error) {
      console.error('[userService] Erro ao buscar usuários por empresa:', error);
      return [];
    }
  },

  /**
   * Lista usuários sem empresa atribuída (indefinidos)
   */
  getUndefinedUsers: async (): Promise<SupportUser[]> => {
    try {
      const allUsers = await userService.getAllUsers();
      return allUsers.filter(user => 
        !user.assignedCompanyId && 
        (!user.autoDetectedCompanyId || user.autoDetectedCompanyId === 'general')
      );
    } catch (error) {
      console.error('[userService] Erro ao buscar usuários indefinidos:', error);
      return [];
    }
  },

  /**
   * Atualiza o companyId atribuído manualmente
   */
  assignCompany: async (email: string, companyId: string): Promise<void> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          assignedCompanyId: companyId,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Se usuário não existe, criar primeiro
        await userService.recordLogin(email);
        await userService.assignCompany(email, companyId);
      }
    } catch (error) {
      console.error('[userService] Erro ao atribuir empresa:', error);
      throw error;
    }
  },

  /**
   * Remove atribuição manual de empresa
   */
  unassignCompany: async (email: string): Promise<void> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      await updateDoc(userRef, {
        assignedCompanyId: null,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('[userService] Erro ao remover atribuição de empresa:', error);
      throw error;
    }
  },

  /**
   * Obtém estatísticas agregadas de usuários
   */
  getStatistics: async (): Promise<{
    totalUsers: number;
    newUsersLast7Days: number;
    newUsersLast30Days: number;
    usersWithConversations: number;
    usersWithTickets: number;
  }> => {
    try {
      const allUsers = await userService.getAllUsers();
      const now = Date.now();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
      
      return {
        totalUsers: allUsers.length,
        newUsersLast7Days: allUsers.filter(u => u.firstAccessAt >= sevenDaysAgo).length,
        newUsersLast30Days: allUsers.filter(u => u.firstAccessAt >= thirtyDaysAgo).length,
        usersWithConversations: allUsers.filter(u => (u.totalConversations || 0) > 0).length,
        usersWithTickets: allUsers.filter(u => (u.totalTickets || 0) > 0).length,
      };
    } catch (error) {
      console.error('[userService] Erro ao obter estatísticas:', error);
      return {
        totalUsers: 0,
        newUsersLast7Days: 0,
        newUsersLast30Days: 0,
        usersWithConversations: 0,
        usersWithTickets: 0,
      };
    }
  },
};


