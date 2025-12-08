#!/bin/bash

# Script para rebuildar imagem Docker com VITE_GEMINI_API_KEY
# Uso: ./rebuild-image-with-gemini.sh [GEMINI_API_KEY]

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se chave foi fornecida
if [ -z "$1" ]; then
    echo -e "${YELLOW}⚠️  Chave do Gemini não fornecida${NC}"
    echo ""
    echo "Uso: ./rebuild-image-with-gemini.sh GEMINI_API_KEY"
    echo ""
    echo "Exemplo:"
    echo "  ./rebuild-image-with-gemini.sh AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw"
    echo ""
    echo -e "${YELLOW}Ou defina a variável de ambiente:${NC}"
    echo "  export GEMINI_API_KEY=sua_chave_aqui"
    echo "  ./rebuild-image-with-gemini.sh"
    echo ""
    
    # Tentar usar variável de ambiente
    if [ -z "$GEMINI_API_KEY" ]; then
        echo -e "${RED}❌ Erro: Chave do Gemini não fornecida${NC}"
        exit 1
    else
        GEMINI_KEY="$GEMINI_API_KEY"
        echo -e "${GREEN}✅ Usando chave da variável de ambiente GEMINI_API_KEY${NC}"
    fi
else
    GEMINI_KEY="$1"
fi

# Validar formato básico da chave (deve começar com AIzaSy)
if [[ ! "$GEMINI_KEY" =~ ^AIzaSy ]]; then
    echo -e "${YELLOW}⚠️  Aviso: A chave não parece estar no formato correto (deve começar com AIzaSy)${NC}"
    read -p "Continuar mesmo assim? (s/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}🔨 Rebuildando imagem Docker com VITE_GEMINI_API_KEY...${NC}"
echo ""

# Nome da imagem
IMAGE_NAME="suporte-lojinha:local-$(date +%Y%m%d-%H%M%S)"
LATEST_TAG="suporte-lojinha:local-latest"

echo -e "${GREEN}📦 Build args:${NC}"
echo "  VITE_GEMINI_API_KEY=${GEMINI_KEY:0:20}..." # Mostrar apenas primeiros 20 caracteres
echo ""

# Rebuildar imagem
echo -e "${GREEN}🚀 Executando docker build...${NC}"
docker build \
  --build-arg VITE_GEMINI_API_KEY="$GEMINI_KEY" \
  -t "$IMAGE_NAME" \
  -t "$LATEST_TAG" \
  .

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
    echo ""
    echo -e "${GREEN}📋 Imagens criadas:${NC}"
    echo "  - $IMAGE_NAME"
    echo "  - $LATEST_TAG"
    echo ""
    echo -e "${GREEN}🚀 Para executar a nova imagem:${NC}"
    echo "  docker run -d --name suporte-lojinha-gemini -p 8080:8080 -e PORT=8080 $LATEST_TAG"
    echo ""
    echo -e "${GREEN}📋 Ou use o script atualizado:${NC}"
    echo "  ./run-image-local.sh"
    echo ""
else
    echo -e "${RED}❌ Erro no build!${NC}"
    exit 1
fi

