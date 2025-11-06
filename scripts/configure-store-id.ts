// Script para configurar o Store ID da Cubbo no Firestore
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB7GpJqjqhf-igQEsgK2m6_Rd9L_HKrSTI",
  authDomain: "suporte-7e68b.firebaseapp.com",
  projectId: "suporte-7e68b",
  storageBucket: "suporte-7e68b.firebasestorage.app",
  messagingSenderId: "409489811769",
  appId: "1:409489811769:web:7c53dba622e5a4a2df60e8",
  measurementId: "G-G529W9ESSD"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STORE_ID = "12376";
const CONFIG_ID = "cubbo";

async function configureStoreId() {
    try {
        console.log("🔧 Configurando Store ID da Cubbo...");
        
        // Verificar se a configuração já existe
        const configRef = doc(db, 'apiConfigs', CONFIG_ID);
        const configSnap = await getDoc(configRef);
        
        if (configSnap.exists()) {
            // Atualizar configuração existente
            const currentData = configSnap.data();
            await setDoc(configRef, {
                ...currentData,
                storeId: STORE_ID
            }, { merge: true });
            console.log("✅ Store ID atualizado com sucesso!");
            console.log(`   Store ID: ${STORE_ID}`);
        } else {
            // Criar nova configuração
            await setDoc(configRef, {
                id: CONFIG_ID,
                name: 'Cubbo',
                url: 'https://api.cubbo.com/v1',
                description: 'API para gerenciamento de pedidos.',
                storeId: STORE_ID,
                status: 'unknown'
            });
            console.log("✅ Configuração criada com sucesso!");
            console.log(`   Store ID: ${STORE_ID}`);
        }
        
        // Verificar novamente para confirmar
        const verifySnap = await getDoc(configRef);
        if (verifySnap.exists()) {
            const data = verifySnap.data();
            console.log("\n📋 Configuração atual:");
            console.log(`   ID: ${data.id}`);
            console.log(`   Store ID: ${data.storeId}`);
            console.log(`   Status: ${data.status || 'unknown'}`);
        }
        
        console.log("\n✅ Configuração concluída! O Store ID está pronto para uso.");
        process.exit(0);
    } catch (error: any) {
        console.error("❌ Erro ao configurar Store ID:", error);
        process.exit(1);
    }
}

configureStoreId();

