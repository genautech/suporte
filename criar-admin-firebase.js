// Script para criar usuário admin no Firebase Auth usando Admin SDK
// Execute com: node criar-admin-firebase.js

const admin = require('firebase-admin');

// Inicializar Firebase Admin SDK
// Opção 1: Usar variável de ambiente com service account JSON (base64)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
} else {
  // Opção 2: Usar Application Default Credentials (gcloud auth application-default login)
  admin.initializeApp({
    projectId: 'suporte-7e68b'
  });
}

async function criarAdmin() {
  const email = 'admin@yoobe.co';
  const password = '123456';

  try {
    // Verificar se usuário já existe
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ Usuário ${email} já existe (UID: ${userRecord.uid})`);
      
      // Atualizar senha
      await admin.auth().updateUser(userRecord.uid, {
        password: password
      });
      console.log(`✅ Senha atualizada para ${email}`);
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Criar usuário
        const userRecord = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: false
        });
        console.log(`✅ Usuário ${email} criado com sucesso (UID: ${userRecord.uid})`);
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 Usuário admin configurado com sucesso!');
    console.log(`   Email: ${email}`);
    console.log(`   Senha: ${password}`);
    console.log('\n💡 Agora você pode fazer login na aplicação.');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

criarAdmin();

