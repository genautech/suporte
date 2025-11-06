#!/bin/bash

# Script de deploy do Cubbo Auth Proxy para Google Cloud Run
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando deploy do Cubbo Auth Proxy..."

# Verificar se as variáveis de ambiente estão definidas
if [ -z "$CUBBO_CLIENT_ID" ] || [ -z "$CUBBO_CLIENT_SECRET" ]; then
    echo "❌ Erro: CUBBO_CLIENT_ID e CUBBO_CLIENT_SECRET devem estar definidas"
    echo ""
    echo "Opções:"
    echo "1. Exportar as variáveis antes de executar:"
    echo "   export CUBBO_CLIENT_ID=seu_client_id"
    echo "   export CUBBO_CLIENT_SECRET=seu_client_secret"
    echo "   ./deploy.sh"
    echo ""
    echo "2. Ou passar como argumentos:"
    echo "   ./deploy.sh seu_client_id seu_client_secret"
    exit 1
fi

# Se passou como argumentos, usar eles
if [ ! -z "$1" ] && [ ! -z "$2" ]; then
    export CUBBO_CLIENT_ID=$1
    export CUBBO_CLIENT_SECRET=$2
fi

echo "✅ Variáveis de ambiente configuradas"
echo "   CUBBO_CLIENT_ID: ${CUBBO_CLIENT_ID:0:10}..."
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ Erro: gcloud não está instalado"
    echo "   Instale em: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "📦 Fazendo deploy no Cloud Run..."
echo ""

gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars CUBBO_CLIENT_ID="$CUBBO_CLIENT_ID",CUBBO_CLIENT_SECRET="$CUBBO_CLIENT_SECRET" \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10

echo ""
echo "✅ Deploy concluído!"
echo ""
echo "🔗 URL do serviço:"
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(status.url)"

echo ""
echo "🧪 Para testar, execute:"
echo "   node test-proxy.js"
echo ""
echo "📋 Para ver logs:"
echo "   gcloud run services logs read cubbo-auth-proxy --region southamerica-east1 --limit 50"



