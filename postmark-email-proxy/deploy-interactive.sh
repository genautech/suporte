#!/bin/bash

# Script interativo de deploy do Postmark Email Proxy

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Deploy do Postmark Email Proxy para Cloud Run${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════${NC}"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Erro: gcloud CLI não está instalado${NC}"
    echo "Instale em: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Verificar autenticação
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Você precisa fazer login no gcloud${NC}"
    echo "Execute: gcloud auth login"
    exit 1
fi

echo -e "${GREEN}✓ gcloud CLI encontrado e autenticado${NC}"
echo ""

# Solicitar credenciais
echo -e "${YELLOW}Para fazer o deploy, você precisa das credenciais do Postmark:${NC}"
echo ""
echo "1. POSTMARK_SERVER_TOKEN - Obtenha em: https://account.postmarkapp.com/"
echo "   - Faça login > Servers > Selecione seu servidor > Server API Tokens"
echo ""
echo "2. FROM_EMAIL - Email verificado no Postmark que será usado como remetente"
echo ""

read -p "Digite o POSTMARK_SERVER_TOKEN: " POSTMARK_TOKEN
read -p "Digite o FROM_EMAIL: " FROM_EMAIL

if [ -z "$POSTMARK_TOKEN" ] || [ -z "$FROM_EMAIL" ]; then
    echo -e "${RED}❌ Erro: Credenciais não podem estar vazias${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Iniciando deploy...${NC}"
echo ""

# Navegar para o diretório
cd "$(dirname "$0")"

# Fazer deploy
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=${POSTMARK_TOKEN},FROM_EMAIL=${FROM_EMAIL}" \
  --project suporte-7e68b

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Deploy concluído!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "A URL do serviço foi exibida acima."
echo "Copie a URL e execute na raiz do projeto:"
echo ""
echo "  ./update-postmark-url.sh https://postmark-email-proxy-xxxxx.southamerica-east1.run.app"
echo ""

