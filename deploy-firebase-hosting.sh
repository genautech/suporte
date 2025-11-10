#!/bin/bash

# Script para fazer deploy no Firebase Hosting
# Uso: ./deploy-firebase-hosting.sh

echo "🚀 Iniciando deploy no Firebase Hosting..."

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
fi

# Build do projeto
echo "📦 Fazendo build do projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build. Abortando deploy."
    exit 1
fi

# Deploy no Firebase Hosting
echo "🚀 Fazendo deploy no Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "✅ Deploy concluído com sucesso!"
    echo "🌐 Acesse: https://suporte.yoobe.app (após configurar o DNS)"
else
    echo "❌ Erro no deploy."
    exit 1
fi

