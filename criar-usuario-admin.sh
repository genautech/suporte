#!/bin/bash

# Script para criar usuário admin no Firebase Auth via Admin SDK
# Requer Firebase Admin SDK configurado

echo "🔧 Criando usuário admin@yoobe.co no Firebase Auth..."

# Verificar se firebase-tools está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instale com: npm install -g firebase-tools"
    exit 1
fi

# Verificar se está autenticado
if ! firebase projects:list &> /dev/null; then
    echo "❌ Não autenticado no Firebase. Execute: firebase login"
    exit 1
fi

echo ""
echo "⚠️  NOTA: Para criar usuário admin via Firebase Console:"
echo ""
echo "1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/users"
echo "2. Clique em 'Add user'"
echo "3. Email: admin@yoobe.co"
echo "4. Password: 123456"
echo "5. Clique em 'Add user'"
echo ""
echo "Ou use o código abaixo para criar via Node.js com Admin SDK:"
echo ""
cat << 'EOF'
const admin = require('firebase-admin');

// Inicializar Admin SDK (precisa de service account)
admin.initializeApp({
  credential: admin.credential.cert('./service-account-key.json')
});

admin.auth().createUser({
  email: 'admin@yoobe.co',
  password: '123456',
  emailVerified: false
}).then((userRecord) => {
  console.log('✅ Usuário criado:', userRecord.uid);
}).catch((error) => {
  console.error('❌ Erro:', error);
});
EOF

echo ""
echo "📋 Alternativa: O código já cria automaticamente na primeira tentativa de login"
echo "   Se não funcionar, verifique:"
echo "   1. Firebase Auth está habilitado"
echo "   2. Email/Password está habilitado como método de login"
echo "   3. Domínio localhost está autorizado"

