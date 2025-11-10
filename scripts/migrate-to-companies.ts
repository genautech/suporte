// Script de migração para estrutura multi-tenant
// Executar uma vez para criar empresa "general" e migrar dados existentes
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7GpJqjqhf-igQEsgK2m6_Rd9L_HKrSTI",
  authDomain: "suporte-7e68b.firebaseapp.com",
  projectId: "suporte-7e68b",
  storageBucket: "suporte-7e68b.firebasestorage.app",
  messagingSenderId: "409489811769",
  appId: "1:409489811769:web:7c53dba622e5a4a2df60e8",
  measurementId: "G-G529W9ESSD"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateToCompanies() {
  console.log('🚀 Iniciando migração para estrutura multi-tenant...');

  try {
    // 1. Criar empresa "general" para FAQ padrão
    console.log('📦 Criando empresa "general"...');
    const generalCompanyRef = doc(db, 'companies', 'general');
    await setDoc(generalCompanyRef, {
      name: 'Suporte Yoobe',
      domains: [],
      keywords: [],
      greeting: 'Olá! 👋 Sou o assistente virtual. Como posso te ajudar hoje?',
      managerEmail: '',
      managerName: '',
      managerAccessEnabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Empresa "general" criada');

    // 2. Criar empresa "prio" se necessário
    console.log('📦 Criando empresa "prio"...');
    const prioCompanyRef = doc(db, 'companies', 'prio');
    await setDoc(prioCompanyRef, {
      name: 'Lojinha Prio',
      domains: ['prio'],
      keywords: [],
      greeting: 'Olá! 👋 Sou o assistente virtual da Lojinha Prio. Como posso te ajudar hoje?',
      managerEmail: '',
      managerName: '',
      managerAccessEnabled: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log('✅ Empresa "prio" criada/atualizada');

    // 3. Criar role de admin para admin@yoobe.co
    console.log('👤 Criando role de admin...');
    const adminRoleRef = doc(db, 'userRoles', 'admin@yoobe.co');
    await setDoc(adminRoleRef, {
      email: 'admin@yoobe.co',
      role: 'admin',
      createdAt: serverTimestamp(),
    }, { merge: true });
    console.log('✅ Role de admin criada');

    // 4. Migrar FAQs existentes para companyId: "general"
    console.log('📝 Migrando FAQs...');
    const faqSnapshot = await getDocs(collection(db, 'faq'));
    let faqCount = 0;
    for (const faqDoc of faqSnapshot.docs) {
      const data = faqDoc.data();
      if (!data.companyId) {
        await updateDoc(doc(db, 'faq', faqDoc.id), {
          companyId: 'general',
        });
        faqCount++;
      }
    }
    console.log(`✅ ${faqCount} FAQs migrados para companyId: "general"`);

    // 5. Migrar Knowledge Base existente para companyId: "general"
    console.log('📚 Migrando Knowledge Base...');
    const kbSnapshot = await getDocs(collection(db, 'knowledgeBase'));
    let kbCount = 0;
    for (const kbDoc of kbSnapshot.docs) {
      const data = kbDoc.data();
      if (!data.companyId) {
        await updateDoc(doc(db, 'knowledgeBase', kbDoc.id), {
          companyId: 'general',
        });
        kbCount++;
      }
    }
    console.log(`✅ ${kbCount} entradas de Knowledge Base migradas para companyId: "general"`);

    // 6. Migrar tickets existentes (identificar empresa pelo email)
    console.log('🎫 Migrando tickets...');
    const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
    let ticketCount = 0;
    
    // Função auxiliar para identificar empresa pelo email
    const getCompanyFromEmail = (email: string): string => {
      if (!email) return 'general';
      const emailParts = email.toLowerCase().split('@');
      if (emailParts.length !== 2) return 'general';
      const domain = emailParts[1].split('.')[0];
      if (domain === 'prio') return 'prio';
      return 'general';
    };

    for (const ticketDoc of ticketsSnapshot.docs) {
      const data = ticketDoc.data();
      if (!data.companyId && data.email) {
        const companyId = getCompanyFromEmail(data.email);
        await updateDoc(doc(db, 'tickets', ticketDoc.id), {
          companyId,
        });
        ticketCount++;
      }
    }
    console.log(`✅ ${ticketCount} tickets migrados`);

    // 7. Migrar conversas existentes
    console.log('💬 Migrando conversas...');
    const conversationsSnapshot = await getDocs(collection(db, 'conversations'));
    let conversationCount = 0;
    for (const convDoc of conversationsSnapshot.docs) {
      const data = convDoc.data();
      if (!data.companyId && data.userId) {
        const companyId = getCompanyFromEmail(data.userId);
        await updateDoc(doc(db, 'conversations', convDoc.id), {
          companyId,
        });
        conversationCount++;
      }
    }
    console.log(`✅ ${conversationCount} conversas migradas`);

    console.log('\n✅ Migração concluída com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`   - Empresa "general" criada`);
    console.log(`   - Empresa "prio" criada/atualizada`);
    console.log(`   - Role de admin criada`);
    console.log(`   - ${faqCount} FAQs migrados`);
    console.log(`   - ${kbCount} entradas de KB migradas`);
    console.log(`   - ${ticketCount} tickets migrados`);
    console.log(`   - ${conversationCount} conversas migradas`);

  } catch (error) {
    console.error('❌ Erro durante migração:', error);
    throw error;
  }
}

// Executar migração
migrateToCompanies()
  .then(() => {
    console.log('\n🎉 Migração finalizada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Erro fatal:', error);
    process.exit(1);
  });

