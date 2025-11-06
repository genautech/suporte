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
      const domainQuery = query(
        companiesCollection,
        where('domains', 'array-contains', domain)
      );
      const domainSnapshot = await getDocs(domainQuery);
      
      if (!domainSnapshot.empty) {
        return domainSnapshot.docs[0].id;
      }
      
      // Buscar empresa por palavras-chave no email
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
      
      // Não encontrou empresa específica, retornar "general"
      return 'general';
    } catch (error) {
      console.error('Error identifying company from email:', error);
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
      console.error('Error fetching company:', error);
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
      console.error('Error fetching all companies:', error);
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
      console.error('Error creating company:', error);
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
      console.error('Error updating company:', error);
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
      console.error('Error deleting company:', error);
      throw error;
    }
  },

  /**
   * Retorna a saudação personalizada da empresa
   */
  getCompanyGreeting: async (companyId: string): Promise<string> => {
    try {
      const company = await companyService.getCompany(companyId);
      if (company && company.greeting) {
        return company.greeting;
      }
      return 'Olá! Como posso ajudar?'; // Saudação padrão
    } catch (error) {
      console.error('Error fetching company greeting:', error);
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
      console.error('Error fetching company name:', error);
      return 'Suporte Yoobe'; // Fallback
    }
  },
};

