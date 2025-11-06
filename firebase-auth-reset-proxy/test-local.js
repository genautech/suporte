require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Ler service account do arquivo ou env var
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
  const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_FILE);
  serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Já está configurado
} else {
  // Tentar arquivo padrão
  const defaultPath = path.resolve(__dirname, '../firebase-admin-key.json');
  if (fs.existsSync(defaultPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
    process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(serviceAccount);
    console.log('✅ Service Account carregado de:', defaultPath);
  } else {
    console.log('⚠️  Service Account não encontrado em:', defaultPath);
    console.log('📝 Configure FIREBASE_SERVICE_ACCOUNT ou FIREBASE_SERVICE_ACCOUNT_FILE');
    console.log('💡 Ou use: gcloud auth application-default login');
  }
}

// Iniciar servidor
require('./index.js');

