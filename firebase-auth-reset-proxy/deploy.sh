#!/bin/bash

# Script de deploy do Firebase Auth Reset Proxy para Cloud Run
# Projeto: suporte-7e68b
# Região: southamerica-east1

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deploy do Firebase Auth Reset Proxy...${NC}"

# Variáveis
PROJECT_ID="suporte-7e68b"
SERVICE_NAME="firebase-auth-reset-proxy"
REGION="southamerica-east1"

# Verificar se está autenticado no gcloud
echo -e "${YELLOW}📋 Verificando autenticação...${NC}"
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Você precisa estar autenticado no gcloud${NC}"
    echo "Execute: gcloud auth login"
    exit 1
fi

# Configurar projeto
echo -e "${GREEN}🔧 Configurando projeto: ${PROJECT_ID}${NC}"
gcloud config set project ${PROJECT_ID}

# Verificar se service account existe
echo -e "${YELLOW}🔍 Verificando service account...${NC}"
SERVICE_ACCOUNT_EMAIL="firebase-admin@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe ${SERVICE_ACCOUNT_EMAIL} --project=${PROJECT_ID} &>/dev/null; then
    echo -e "${YELLOW}⚠️  Service account não encontrado. Criando...${NC}"
    gcloud iam service-accounts create firebase-admin \
        --display-name="Firebase Admin Service Account" \
        --project=${PROJECT_ID}
    
    echo -e "${GREEN}🔐 Concedendo permissões...${NC}"
    gcloud projects add-iam-policy-binding ${PROJECT_ID} \
        --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
        --role="roles/firebase.admin"
    
    echo -e "${GREEN}✅ Service account criado com sucesso${NC}"
else
    echo -e "${GREEN}✅ Service account já existe${NC}"
fi

# Obter chave do service account
echo -e "${YELLOW}🔑 Obtendo chave do service account...${NC}"
KEY_FILE="../firebase-admin-key.json"
if [ ! -f "${KEY_FILE}" ]; then
    echo -e "${YELLOW}📥 Baixando chave do service account...${NC}"
    gcloud iam service-accounts keys create ${KEY_FILE} \
        --iam-account=${SERVICE_ACCOUNT_EMAIL} \
        --project=${PROJECT_ID}
else
    echo -e "${GREEN}✅ Chave já existe localmente${NC}"
fi

# Converter chave para base64 (para variável de ambiente)
echo -e "${YELLOW}🔐 Preparando credenciais...${NC}"
SERVICE_ACCOUNT_B64=$(cat ${KEY_FILE} | base64 | tr -d '\n')

# Deploy no Cloud Run usando source-based deploy
echo -e "${GREEN}🚀 Fazendo deploy no Cloud Run...${NC}"
gcloud run deploy ${SERVICE_NAME} \
    --source . \
    --platform managed \
    --region ${REGION} \
    --allow-unauthenticated \
    --set-env-vars="FIREBASE_SERVICE_ACCOUNT=${SERVICE_ACCOUNT_B64}" \
    --memory 512Mi \
    --cpu 1 \
    --timeout 60 \
    --max-instances 10 \
    --project=${PROJECT_ID}

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format="value(status.url)" \
    --project=${PROJECT_ID})

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo -e "${GREEN}🌐 URL do serviço: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Próximos passos:${NC}"
echo "1. Configure a variável de ambiente no frontend:"
echo "   VITE_AUTH_RESET_PROXY_URL=${SERVICE_URL}"
echo ""
echo "2. Teste o endpoint:"
echo "   curl -X POST ${SERVICE_URL}/reset-password \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"email\":\"teste@exemplo.com\",\"code\":\"1234\"}'"
echo ""

