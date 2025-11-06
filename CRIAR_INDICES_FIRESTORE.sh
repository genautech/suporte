#!/bin/bash

# Script para criar índices Firestore
# Execute este script após fazer login no Firebase CLI

echo "🚀 Criando índices Firestore..."
echo ""

# Verificar se está logado
if ! firebase projects:list &>/dev/null; then
    echo "❌ Erro: Você precisa fazer login no Firebase primeiro."
    echo ""
    echo "Execute:"
    echo "  firebase login"
    echo ""
    echo "Depois execute este script novamente."
    exit 1
fi

# Configurar projeto
echo "📋 Configurando projeto: suporte-7e68b"
firebase use suporte-7e68b

# Deploy dos índices
echo ""
echo "📤 Fazendo deploy dos índices..."
firebase deploy --only firestore:indexes

echo ""
echo "✅ Índices criados com sucesso!"
echo ""
echo "Os seguintes índices foram criados:"
echo "  - faq: category + order"
echo "  - knowledgeBase: category + verified + createdAt"
echo "  - conversations: userId + createdAt"
echo "  - authCodes: email + createdAt"
echo ""
echo "⏳ Nota: A criação dos índices pode levar alguns minutos."
echo "   Você pode acompanhar o progresso no Firebase Console:"
echo "   https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes"

