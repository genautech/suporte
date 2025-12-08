#!/bin/bash

# Script para criar usuário admin usando o proxy de reset
# Requer que o proxy esteja rodando e acessível

PROXY_URL="${VITE_AUTH_RESET_PROXY_URL:-https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app}"
EMAIL="admin@yoobe.co"
PASSWORD="123456"

echo "🔧 Criando usuário admin via proxy..."
echo "📧 Email: $EMAIL"
echo "🔗 Proxy: $PROXY_URL"
echo ""

# Primeiro, precisamos gerar um código de autenticação
# Mas isso requer acesso ao Firestore, então vamos usar uma abordagem diferente

echo "⚠️  Este script requer que você tenha um código de autenticação válido."
echo ""
echo "💡 SOLUÇÃO MAIS RÁPIDA:"
echo ""
echo "1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/users"
echo "2. Clique em 'Add user'"
echo "3. Email: admin@yoobe.co"
echo "4. Password: 123456"
echo "5. Clique em 'Add user'"
echo ""
echo "Ou use o script Node.js:"
echo "  node criar-admin-firebase.js"
echo ""
echo "Ou execute via gcloud (se tiver acesso):"
echo "  gcloud auth application-default login"
echo "  node criar-admin-firebase.js"

