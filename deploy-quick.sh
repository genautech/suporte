# 🔄 Script de Deploy Rápido (Sem Build)

#!/bin/bash

# Deploy rápido usando imagem existente e atualizando Git

set -e

PROJECT_ID="suporte-7e68b"
SERVICE_NAME="suporte-lojinha"
REGION="southamerica-east1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploy rápido de ${SERVICE_NAME}...${NC}"

# Deploy usando imagem existente
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

# Atualizar Git
if [ -d ".git" ]; then
  echo -e "${GREEN}📝 Atualizando Git...${NC}"
  
  if [ ! -z "$(git status --porcelain)" ]; then
    # Verificar cloudbuild.yaml
    if git diff --cached --name-only | grep -q "cloudbuild.yaml"; then
      git reset HEAD cloudbuild.yaml
    fi
    
    git add .
    
    if [ ! -z "$(git diff --cached --name-only)" ]; then
      git commit -m "deploy: $(date '+%Y-%m-%d %H:%M:%S') - Deploy rápido" || true
      CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
      git push origin ${CURRENT_BRANCH} || {
        echo -e "${YELLOW}⚠️  Erro ao fazer push. Faça manualmente depois.${NC}"
      }
    fi
  fi
fi

echo -e "${GREEN}✅ Deploy rápido concluído!${NC}"

