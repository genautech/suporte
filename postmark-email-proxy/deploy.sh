#!/bin/bash

# Script de deploy do Postmark Email Proxy para Google Cloud Run
# Uso: ./deploy.sh POSTMARK_SERVER_TOKEN FROM_EMAIL

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se as credenciais foram fornecidas
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${RED}Erro: Credenciais não fornecidas${NC}"
    echo ""
    echo "Uso: ./deploy.sh POSTMARK_SERVER_TOKEN FROM_EMAIL"
    echo ""
    echo "Exemplo:"
    echo "  ./deploy.sh abc123xyz seu-email@exemplo.com"
    echo ""
    echo "Para obter o POSTMARK_SERVER_TOKEN:"
    echo "  1. Acesse https://account.postmarkapp.com/"
    echo "  2. Faça login"
    echo "  3. Acesse 'Server API Tokens'"
    echo "  4. Copie o token do servidor"
    exit 1
fi

POSTMARK_TOKEN=$1
FROM_EMAIL=$2

echo -e "${GREEN}Iniciando deploy do Postmark Email Proxy...${NC}"
echo ""

# Navegar para o diretório do proxy
cd "$(dirname "$0")"

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}Erro: gcloud CLI não está instalado${NC}"
    exit 1
fi

# Verificar se está autenticado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}Aviso: Você precisa fazer login no gcloud${NC}"
    echo "Execute: gcloud auth login"
    exit 1
fi

# Fazer o deploy
echo -e "${GREEN}Fazendo deploy no Cloud Run...${NC}"
echo ""

gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=${POSTMARK_TOKEN},FROM_EMAIL=${FROM_EMAIL}" \
  --project suporte-7e68b

echo ""
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo ""
echo "A URL do serviço será exibida acima."
echo "Copie a URL e atualize o arquivo services/supportService.ts"

