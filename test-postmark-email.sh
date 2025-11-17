#!/bin/bash

# Script de teste para envio de email via Postmark
# Uso: ./test-postmark-email.sh <email-para-testar> [email-remetente]

set -e

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verificar se email foi fornecido
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: Forneça um email para teste${NC}"
    echo ""
    echo "Uso: ./test-postmark-email.sh seu-email@exemplo.com [remetente@exemplo.com]"
    exit 1
fi

TEST_EMAIL=$1
FROM_EMAIL=${2:-"atendimento@yoobe.co"}
POSTMARK_TOKEN="ee246569-f54b-4986-937a-9288b25377f4"

echo -e "${GREEN}📧 Testando envio de email via Postmark...${NC}\n"
echo "Token: ${POSTMARK_TOKEN:0:8}..."
echo "De: ${FROM_EMAIL}"
echo "Para: ${TEST_EMAIL}"
echo "Stream: outbound"
echo ""

# Verificar se node está instalado
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Erro: Node.js não está instalado${NC}"
    exit 1
fi

# Verificar se arquivo de teste existe
if [ ! -f "postmark-email-proxy/test-email.js" ]; then
    echo -e "${RED}❌ Erro: Arquivo test-email.js não encontrado${NC}"
    exit 1
fi

# Executar teste
cd postmark-email-proxy
FROM_EMAIL=$FROM_EMAIL node test-email.js "$TEST_EMAIL"

echo ""
echo -e "${GREEN}✅ Teste concluído!${NC}"
echo -e "${YELLOW}💡 Verifique a caixa de entrada de ${TEST_EMAIL} (e spam)${NC}"






