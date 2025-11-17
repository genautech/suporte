#!/bin/bash

# Script simplificado de deploy - execute após autenticar no gcloud
# Uso: ./deploy-now.sh [CUBBO_CLIENT_ID] [CUBBO_CLIENT_SECRET]

set -e

echo "🚀 Deploy do Cubbo Auth Proxy"
echo ""

# Verificar autenticação
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo "❌ Erro: Você precisa autenticar no Google Cloud primeiro"
    echo ""
    echo "Execute: gcloud auth login"
    exit 1
fi

# Configurar projeto se necessário
PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT" ] || [ "$PROJECT" = "(unset)" ]; then
    echo "📋 Configurando projeto..."
    gcloud config set project suporte-7e68b
fi

# Verificar se tem credenciais
if [ ! -z "$1" ] && [ ! -z "$2" ]; then
    CUBBO_CLIENT_ID="$1"
    CUBBO_CLIENT_SECRET="$2"
    USE_ENV_VARS="--set-env-vars CUBBO_CLIENT_ID=$CUBBO_CLIENT_ID,CUBBO_CLIENT_SECRET=$CUBBO_CLIENT_SECRET"
    echo "✅ Credenciais fornecidas"
else
    echo "⚠️  Aviso: Deployando sem credenciais"
    echo "   Você pode adicionar depois com:"
    echo "   gcloud run services update cubbo-auth-proxy --region southamerica-east1 --set-env-vars CUBBO_CLIENT_ID=...,CUBBO_CLIENT_SECRET=..."
    USE_ENV_VARS=""
fi

echo ""
echo "📦 Iniciando deploy..."
echo ""

# Executar deploy
gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10 \
  $USE_ENV_VARS \
  --project suporte-7e68b

echo ""
echo "✅ Deploy concluído!"
echo ""

# Mostrar URL
SERVICE_URL=$(gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(status.url)" \
  --project suporte-7e68b 2>/dev/null)

if [ ! -z "$SERVICE_URL" ]; then
    echo "🔗 URL do serviço: $SERVICE_URL"
    echo ""
    echo "🧪 Para testar:"
    echo "   curl -X POST $SERVICE_URL -H 'Origin: http://localhost:3000'"
    echo ""
    echo "   ou"
    echo ""
    echo "   node test-proxy.js"
fi

echo ""
echo "📋 Para ver logs:"
echo "   gcloud run services logs read cubbo-auth-proxy --region southamerica-east1 --limit 50"








