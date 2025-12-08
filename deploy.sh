#!/bin/bash

# 🚀 Script de Deploy Automático com Atualização Git
# Uso: ./deploy.sh [--skip-git] [--skip-build]

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ID="suporte-7e68b"
SERVICE_NAME="suporte-lojinha"
REGION="southamerica-east1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# Flags
SKIP_GIT=false
SKIP_BUILD=false

# Parse argumentos
for arg in "$@"; do
  case $arg in
    --skip-git)
      SKIP_GIT=true
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    *)
      echo -e "${YELLOW}Argumento desconhecido: $arg${NC}"
      shift
      ;;
  esac
done

echo -e "${GREEN}🚀 Iniciando deploy de ${SERVICE_NAME}...${NC}"

# 1. Verificar se git está inicializado
if [ "$SKIP_GIT" = false ]; then
  if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Repositório Git não encontrado. Inicializando...${NC}"
    git init
    if ! git remote get-url origin &>/dev/null; then
      echo -e "${YELLOW}⚠️  Remote 'origin' não configurado.${NC}"
      echo -e "${YELLOW}   Execute: git remote add origin https://github.com/genautech/suporte.git${NC}"
      SKIP_GIT=true
    fi
  fi
fi

# 2. Verificar se cloudbuild.yaml existe
if [ ! -f "cloudbuild.yaml" ]; then
  echo -e "${RED}❌ Erro: cloudbuild.yaml não encontrado!${NC}"
  echo -e "${YELLOW}   Crie o arquivo cloudbuild.yaml antes de fazer deploy.${NC}"
  exit 1
fi

# 3. Build (se não pular)
if [ "$SKIP_BUILD" = false ]; then
  echo -e "${GREEN}📦 Fazendo build da imagem...${NC}"
  gcloud builds submit --config cloudbuild.yaml --project ${PROJECT_ID}
  
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no build!${NC}"
    exit 1
  fi
  
  echo -e "${GREEN}✅ Build concluído com sucesso!${NC}"
else
  echo -e "${YELLOW}⏭️  Pulando build (usando imagem existente)${NC}"
fi

# 4. Deploy
echo -e "${GREEN}🚀 Fazendo deploy...${NC}"
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project ${PROJECT_ID}

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Erro no deploy!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"

# 5. Atualizar Git (se não pular)
if [ "$SKIP_GIT" = false ]; then
  echo -e "${GREEN}📝 Atualizando Git...${NC}"
  
  # Verificar se há mudanças
  if [ -z "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Nenhuma mudança para commitar.${NC}"
  else
    # Verificar se cloudbuild.yaml está sendo commitado (não deveria)
    if git diff --cached --name-only | grep -q "cloudbuild.yaml"; then
      echo -e "${RED}❌ ERRO: cloudbuild.yaml está sendo commitado!${NC}"
      echo -e "${YELLOW}   Removendo do stage...${NC}"
      git reset HEAD cloudbuild.yaml
    fi
    
    # Adicionar arquivos (respeitando .gitignore)
    git add .
    
    # Criar mensagem de commit
    COMMIT_MSG="deploy: $(date '+%Y-%m-%d %H:%M:%S') - Deploy automático de ${SERVICE_NAME}"
    
    # Verificar se há mudanças após git add
    if [ -z "$(git diff --cached --name-only)" ]; then
      echo -e "${YELLOW}⚠️  Nenhuma mudança para commitar após git add.${NC}"
    else
      # Commit
      git commit -m "$COMMIT_MSG" || {
        echo -e "${YELLOW}⚠️  Nenhuma mudança para commitar.${NC}"
      }
      
      # Push
      CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
      echo -e "${GREEN}📤 Fazendo push para origin/${CURRENT_BRANCH}...${NC}"
      git push origin ${CURRENT_BRANCH} || {
        echo -e "${YELLOW}⚠️  Erro ao fazer push. Verifique suas credenciais Git.${NC}"
        echo -e "${YELLOW}   Você pode fazer push manualmente depois.${NC}"
      }
      
      echo -e "${GREEN}✅ Git atualizado com sucesso!${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⏭️  Pulando atualização do Git${NC}"
fi

# 6. Verificar URL do serviço
EXPECTED_URL="https://suporte-lojinha-409489811769.southamerica-east1.run.app"
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)' 2>/dev/null || echo "")

if [ ! -z "$SERVICE_URL" ]; then
  echo -e "${GREEN}🌐 Serviço disponível em: ${SERVICE_URL}${NC}"
  
  # Verificar se URL corresponde à esperada
  if [ "$SERVICE_URL" != "$EXPECTED_URL" ]; then
    echo -e "${YELLOW}⚠️  URL diferente da esperada:${NC}"
    echo -e "${YELLOW}   Esperado: ${EXPECTED_URL}${NC}"
    echo -e "${YELLOW}   Obtido: ${SERVICE_URL}${NC}"
  fi
  
  # Testar resposta do serviço
  echo -e "${GREEN}🔍 Testando resposta do serviço...${NC}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${SERVICE_URL}" || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Serviço respondendo corretamente (HTTP 200)${NC}"
  else
    echo -e "${YELLOW}⚠️  Serviço retornou HTTP ${HTTP_CODE}${NC}"
    echo -e "${YELLOW}   Teste manualmente: curl ${SERVICE_URL}${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Não foi possível obter URL do serviço${NC}"
fi

echo -e "${GREEN}🎉 Deploy completo!${NC}"

