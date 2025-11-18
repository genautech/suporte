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
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      
      // Tentar ler documento existente (pode falhar se não existir ou se não tiver permissão, mas não é crítico)
      let userDoc;
      let existingData: any = null;
      try {
        userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          existingData = userDoc.data();
        }
      } catch (readError: any) {
        // Se falhar ao ler (pode ser permissão ou documento não existe), continuar como se não existisse
        const errorCode = readError?.code || readError?.message || String(readError);
        if (errorCode.includes('permission') || errorCode.includes('Permission')) {
          console.log('[userService] Sem permissão para ler documento (normal para novo usuário), criando novo');
        } else {
          console.log('[userService] Não foi possível ler documento existente, criando novo:', readError);
        }
      }
      
      const isNewUser = !existingData;
      
      // Detectar empresa do usuário (se ainda não foi atribuída manualmente)
      let autoDetectedCompanyId: string | undefined;
      let storeUrl: string | undefined;
      if (isNewUser || !existingData?.assignedCompanyId) {
        try {
          autoDetectedCompanyId = await companyService.getCompanyFromEmail(normalizedEmail);
          // Buscar storeUrl da empresa identificada
          if (autoDetectedCompanyId) {
            try {
              storeUrl = await companyService.getCompanyStoreUrl(autoDetectedCompanyId) || undefined;
            } catch (error) {
              console.error('[userService] Erro ao buscar storeUrl da empresa:', error);
            }
          }
        } catch (error) {
          console.error('[userService] Erro ao detectar empresa:', error);
        }
      } else {
        // Se empresa já foi atribuída, buscar storeUrl dela também
        const companyId = existingData.assignedCompanyId || existingData.autoDetectedCompanyId;
        if (companyId) {
          try {
            storeUrl = await companyService.getCompanyStoreUrl(companyId) || undefined;
          } catch (error) {
            console.error('[userService] Erro ao buscar storeUrl da empresa atribuída:', error);
          }
        }
      }
      
      // Preparar dados para atualização/criação
      const updateData: any = {
        email: normalizedEmail,
        lastAccessAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      if (isNewUser) {
        // Criar novo usuário
        updateData.firstAccessAt = serverTimestamp();
        updateData.totalLogins = 1;
        updateData.totalConversations = 0;
        updateData.totalTickets = 0;
        updateData.createdAt = serverTimestamp();
        
        if (additionalData?.firstName) updateData.firstName = additionalData.firstName;
        if (additionalData?.lastName) updateData.lastName = additionalData.lastName;
        if (additionalData?.phone) updateData.phone = additionalData.phone;
        if (autoDetectedCompanyId) updateData.autoDetectedCompanyId = autoDetectedCompanyId;
        if (storeUrl) updateData.storeUrl = storeUrl;
      } else {
        // Atualizar usuário existente
        updateData.totalLogins = (existingData.totalLogins || 0) + 1;
        
        // Atualizar campos apenas se fornecidos e diferentes
        if (additionalData?.firstName !== undefined) updateData.firstName = additionalData.firstName;
        if (additionalData?.lastName !== undefined) updateData.lastName = additionalData.lastName;
        if (additionalData?.phone !== undefined) updateData.phone = additionalData.phone;
        
        // Atualizar companyId apenas se ainda não foi atribuído manualmente
        if (!existingData.assignedCompanyId && autoDetectedCompanyId) {
          updateData.autoDetectedCompanyId = autoDetectedCompanyId;
        }
        // Atualizar storeUrl se disponível (sempre atualizar para refletir mudanças na empresa)
        if (storeUrl !== undefined) {
          updateData.storeUrl = storeUrl;
        }
      }
      
      // Usar setDoc com merge para criar ou atualizar sem precisar ler primeiro
      try {
        await setDoc(userRef, updateData, { merge: true });
      } catch (setDocError: any) {
        // Se falhar com merge, tentar criar sem merge (pode ser que o documento não exista)
        const errorCode = setDocError?.code || setDocError?.message || String(setDocError);
        if (errorCode.includes('permission') || errorCode.includes('Permission')) {
          console.warn('[userService] Erro de permissão ao fazer setDoc com merge, tentando criar sem merge:', setDocError);
          // Tentar criar sem merge (apenas para novos usuários)
          if (isNewUser) {
            await setDoc(userRef, updateData);
          } else {
            throw setDocError; // Se não for novo usuário, lançar erro
          }
        } else {
          throw setDocError; // Outros erros, lançar
        }
      }
      
      // Tentar ler documento atualizado para retornar (pode falhar se não tiver permissão)
      try {
        const finalDoc = await getDoc(userRef);
        if (finalDoc.exists()) {
          return supportUserFromFirestore(finalDoc);
        }
      } catch (readError: any) {
        // Se não conseguir ler, retornar dados baseados no que tentamos salvar
        console.log('[userService] Não foi possível ler documento após salvar (pode ser problema de permissão temporário), retornando dados estimados');
        return {
          id: normalizedEmail,
          email: normalizedEmail,
          firstName: additionalData?.firstName || '',
          lastName: additionalData?.lastName || '',
          phone: additionalData?.phone || '',
          firstAccessAt: isNewUser ? Date.now() : (existingData?.firstAccessAt || Date.now()),
          lastAccessAt: Date.now(),
          totalLogins: isNewUser ? 1 : ((existingData?.totalLogins || 0) + 1),
          totalConversations: existingData?.totalConversations || 0,
          totalTickets: existingData?.totalTickets || 0,
          autoDetectedCompanyId: autoDetectedCompanyId,
          assignedCompanyId: existingData?.assignedCompanyId,
          createdAt: isNewUser ? Date.now() : (existingData?.createdAt || Date.now()),
          updatedAt: Date.now(),
        } as SupportUser;
      }
      
      // Se chegou aqui, documento não existe após setDoc (muito raro)
      console.warn('[userService] Documento não existe após setDoc, retornando dados estimados');
      return {
        id: normalizedEmail,
        email: normalizedEmail,
        firstName: additionalData?.firstName || '',
        lastName: additionalData?.lastName || '',
        phone: additionalData?.phone || '',
        firstAccessAt: Date.now(),
        lastAccessAt: Date.now(),
        totalLogins: 1,
        totalConversations: 0,
          totalTickets: 0,
          autoDetectedCompanyId: autoDetectedCompanyId,
          storeUrl: storeUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as SupportUser;
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

  /**
   * Busca a URL da loja (storeUrl) de um usuário
   * Primeiro tenta buscar do campo storeUrl do usuário, depois da empresa associada
   */
  getUserStoreUrl: async (email: string): Promise<string | null> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      const userRef = doc(db, 'supportUsers', normalizedEmail);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Se o usuário tem storeUrl diretamente, retornar
        if (userData.storeUrl) {
          return userData.storeUrl;
        }
        
        // Se não tem storeUrl direto, buscar da empresa associada
        const companyId = userData.assignedCompanyId || userData.autoDetectedCompanyId;
        if (companyId) {
          try {
            const storeUrl = await companyService.getCompanyStoreUrl(companyId);
            return storeUrl;
          } catch (error) {
            console.error('[userService] Erro ao buscar storeUrl da empresa:', error);
            return null;
          }
        }
      }
      
      // Se usuário não existe ou não tem empresa associada, tentar identificar empresa pelo email
      try {
        const companyId = await companyService.getCompanyFromEmail(normalizedEmail);
        if (companyId && companyId !== 'general') {
          const storeUrl = await companyService.getCompanyStoreUrl(companyId);
          return storeUrl;
        }
      } catch (error) {
        console.error('[userService] Erro ao identificar empresa pelo email:', error);
      }
      
      return null;
    } catch (error) {
      console.error('[userService] Erro ao buscar storeUrl do usuário:', error);
      return null;
    }
  },
};


