// Company service for multi-tenant support
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
  serverTimestamp,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { Company } from '../types';

const companiesCollection = collection(db, 'companies');

const companyFromFirestore = (docSnapshot: any): Company => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    name: data.name || '',
    domains: data.domains || [],
    keywords: data.keywords || [],
    greeting: data.greeting || 'Olá! Como posso ajudar?',
    managerEmail: data.managerEmail || '',
    managerName: data.managerName || '',
    managerAccessEnabled: data.managerAccessEnabled || false,
    storeUrl: data.storeUrl || undefined,
    createdAt: (data.createdAt as Timestamp)?.toDate().getTime() || Date.now(),
    updatedAt: (data.updatedAt as Timestamp)?.toDate().getTime() || Date.now(),
  } as Company;
};

export const companyService = {
  /**
   * Identifica a empresa de um usuário baseado no email
   * Retorna "general" se não encontrar empresa específica
   */
  getCompanyFromEmail: async (email: string): Promise<string> => {
    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Extrair domínio do email (ex: user@prio.com -> prio)
      const emailParts = normalizedEmail.split('@');
      if (emailParts.length !== 2) {
        return 'general';
      }
      
      const domain = emailParts[1].split('.')[0]; // pega apenas a parte antes do primeiro ponto
      
      // Buscar empresa por domínio
      try {
        const domainQuery = query(
          companiesCollection,
          where('domains', 'array-contains', domain)
        );
        const domainSnapshot = await getDocs(domainQuery);
        
        if (!domainSnapshot.empty) {
          return domainSnapshot.docs[0].id;
        }
      } catch (queryError: any) {
        // Se falhar ao buscar por domínio (pode ser permissão), apenas logar e continuar
        const errorCode = queryError?.code || queryError?.message || String(queryError);
        if (errorCode.includes('permission') || errorCode.includes('Permission')) {
          console.log('[companyService] Sem permissão para buscar empresa por domínio (pode ser temporário), continuando busca');
        } else {
          console.warn('[companyService] Erro ao buscar empresa por domínio:', queryError);
        }
        // Continuar para tentar buscar por palavras-chave
      }
      
      // Buscar empresa por palavras-chave no email
      // Tentar ler todas as empresas, mas tratar erros de permissão graciosamente
      try {
        const allCompanies = await getDocs(companiesCollection);
        for (const companyDoc of allCompanies.docs) {
          const company = companyFromFirestore(companyDoc);
          const emailLower = normalizedEmail.toLowerCase();
          
          // Verificar se alguma palavra-chave está no email
          for (const keyword of company.keywords) {
            if (emailLower.includes(keyword.toLowerCase())) {
              return companyDoc.id;
            }
          }
        }
      } catch (queryError: any) {
        // Se falhar ao ler empresas (pode ser permissão ou outro erro), apenas logar e continuar
        const errorCode = queryError?.code || queryError?.message || String(queryError);
        if (errorCode.includes('permission') || errorCode.includes('Permission')) {
          console.log('[companyService] Sem permissão para ler empresas (pode ser temporário), retornando "general"');
        } else {
          console.warn('[companyService] Erro ao buscar empresas por palavras-chave:', queryError);
        }
        // Continuar e retornar 'general' como fallback
      }
      
      // Não encontrou empresa específica, retornar "general"
      return 'general';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error identifying company from email:', {
        email,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return 'general'; // Fallback seguro
    }
  },

  /**
   * Busca uma empresa pelo ID
   */
  getCompany: async (companyId: string): Promise<Company | null> => {
    try {
      const docRef = doc(db, 'companies', companyId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return companyFromFirestore(docSnap);
      }
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error fetching company:', {
        companyId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return null;
    }
  },

  /**
   * Lista todas as empresas (apenas para admin)
   */
  getAllCompanies: async (): Promise<Company[]> => {
    try {
      const snapshot = await getDocs(companiesCollection);
      return snapshot.docs.map(companyFromFirestore);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error fetching all companies:', {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  },

  /**
   * Cria uma nova empresa
   */
  createCompany: async (data: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    try {
      const docRef = await addDoc(companiesCollection, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error creating company:', {
        error: errorMessage,
        data: { ...data, domains: data.domains?.length || 0, keywords: data.keywords?.length || 0 },
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Atualiza uma empresa existente
   */
  updateCompany: async (companyId: string, data: Partial<Company>): Promise<void> => {
    try {
      const docRef = doc(db, 'companies', companyId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error updating company:', {
        companyId,
        error: errorMessage,
        data,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Deleta uma empresa
   */
  deleteCompany: async (companyId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'companies', companyId);
      await deleteDoc(docRef);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error deleting company:', {
        companyId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },

  /**
   * Retorna a saudação personalizada da empresa
   */
  getCompanyStoreUrl: async (companyId: string): Promise<string | null> => {
    try {
      const company = await companyService.getCompany(companyId);
      return company?.storeUrl || null;
    } catch (error) {
      console.error('[companyService] Erro ao buscar URL da loja:', error);
      return null;
    }
  },

  getCompanyGreeting: async (companyId: string): Promise<string> => {
    try {
      const company = await companyService.getCompany(companyId);
      if (company && company.greeting) {
        return company.greeting;
      }
      return 'Olá! Como posso ajudar?'; // Saudação padrão
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error fetching company greeting:', {
        companyId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return 'Olá! Como posso ajudar?'; // Fallback
    }
  },

  /**
   * Retorna o nome da empresa
   */
  getCompanyName: async (companyId: string): Promise<string> => {
    try {
      const company = await companyService.getCompany(companyId);
      if (company && company.name) {
        return company.name;
      }
      return 'Suporte Yoobe'; // Nome padrão
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[companyService] Error fetching company name:', {
        companyId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return 'Suporte Yoobe'; // Fallback
    }
  },
};

