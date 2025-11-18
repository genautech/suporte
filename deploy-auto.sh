#!/bin/bash

# 🚀 Script de Deploy Totalmente Automatizado
# Validações completas, logs detalhados e verificação pós-deploy

set -e  # Parar em caso de erro

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ID="suporte-7e68b"
SERVICE_NAME="suporte-lojinha"
REGION="southamerica-east1"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"
EXPECTED_URL="https://suporte-lojinha-409489811769.southamerica-east1.run.app"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🚀 Deploy Automatizado - Sistema de Suporte          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================
# 1. VALIDAÇÕES DE PRÉ-REQUISITOS
# ============================================
echo -e "${BLUE}📋 Validando pré-requisitos...${NC}"

# Verificar gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Erro: gcloud não está instalado!${NC}"
    echo -e "${YELLOW}   Instale: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi
echo -e "${GREEN}✅ gcloud encontrado${NC}"

# Verificar autenticação
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Erro: Não autenticado no gcloud!${NC}"
    echo -e "${YELLOW}   Execute: gcloud auth login${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Autenticação gcloud OK${NC}"

# Verificar projeto
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  Projeto atual: ${CURRENT_PROJECT}${NC}"
    echo -e "${YELLOW}   Configurando projeto para: ${PROJECT_ID}${NC}"
    gcloud config set project ${PROJECT_ID}
fi
echo -e "${GREEN}✅ Projeto configurado: ${PROJECT_ID}${NC}"

# Verificar cloudbuild.yaml
if [ ! -f "cloudbuild.yaml" ]; then
    echo -e "${RED}❌ Erro: cloudbuild.yaml não encontrado!${NC}"
    echo -e "${YELLOW}   Crie o arquivo cloudbuild.yaml antes de fazer deploy.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ cloudbuild.yaml encontrado${NC}"

# Verificar Dockerfile
if [ ! -f "Dockerfile" ]; then
    echo -e "${RED}❌ Erro: Dockerfile não encontrado!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile encontrado${NC}"

echo ""

# ============================================
# 2. BUILD DA IMAGEM
# ============================================
echo -e "${BLUE}📦 Fazendo build da imagem Docker...${NC}"
echo -e "${YELLOW}   Isso pode levar alguns minutos...${NC}"

BUILD_START=$(date +%s)
if gcloud builds submit --config cloudbuild.yaml --project ${PROJECT_ID} 2>&1 | tee /tmp/build.log; then
    BUILD_END=$(date +%s)
    BUILD_DURATION=$((BUILD_END - BUILD_START))
    echo -e "${GREEN}✅ Build concluído com sucesso! (${BUILD_DURATION}s)${NC}"
else
    echo -e "${RED}❌ Erro no build!${NC}"
    echo -e "${YELLOW}   Verifique os logs acima para mais detalhes.${NC}"
    exit 1
fi

echo ""

# ============================================
# 3. DEPLOY NO CLOUD RUN
# ============================================
echo -e "${BLUE}🚀 Fazendo deploy no Cloud Run...${NC}"

DEPLOY_START=$(date +%s)
if gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --region ${REGION} \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project ${PROJECT_ID} 2>&1 | tee /tmp/deploy.log; then
    
    DEPLOY_END=$(date +%s)
    DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
    echo -e "${GREEN}✅ Deploy concluído com sucesso! (${DEPLOY_DURATION}s)${NC}"
else
    echo -e "${RED}❌ Erro no deploy!${NC}"
    echo -e "${YELLOW}   Verifique os logs acima para mais detalhes.${NC}"
    exit 1
fi

echo ""

# ============================================
# 4. VERIFICAÇÃO PÓS-DEPLOY
# ============================================
echo -e "${BLUE}🔍 Verificando deploy...${NC}"

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)' 2>/dev/null || echo "")

if [ -z "$SERVICE_URL" ]; then
    echo -e "${YELLOW}⚠️  Não foi possível obter URL do serviço${NC}"
else
    echo -e "${GREEN}✅ URL do serviço: ${SERVICE_URL}${NC}"
    
    # Verificar se URL corresponde à esperada
    if [ "$SERVICE_URL" != "$EXPECTED_URL" ]; then
        echo -e "${YELLOW}⚠️  URL diferente da esperada:${NC}"
        echo -e "${YELLOW}   Esperado: ${EXPECTED_URL}${NC}"
        echo -e "${YELLOW}   Obtido: ${SERVICE_URL}${NC}"
    fi
    
    # Testar se o serviço está respondendo
    echo -e "${BLUE}🌐 Testando resposta do serviço...${NC}"
    if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${SERVICE_URL}" | grep -q "200"; then
        echo -e "${GREEN}✅ Serviço respondendo corretamente (HTTP 200)${NC}"
    else
        echo -e "${YELLOW}⚠️  Serviço pode não estar respondendo corretamente${NC}"
        echo -e "${YELLOW}   Teste manualmente: curl ${SERVICE_URL}${NC}"
    fi
fi

# Verificar status do serviço
echo -e "${BLUE}📊 Status do serviço:${NC}"
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'table(
    status.conditions[0].type,
    status.conditions[0].status,
    status.url,
    spec.template.spec.containers[0].image
  )' 2>/dev/null || echo -e "${YELLOW}⚠️  Não foi possível obter status${NC}"

echo ""

# ============================================
# 5. ATUALIZAR GIT (OPCIONAL)
# ============================================
if [ -d ".git" ]; then
    echo -e "${BLUE}📝 Atualizando Git...${NC}"
    
    if [ -z "$(git status --porcelain)" ]; then
        echo -e "${YELLOW}⚠️  Nenhuma mudança para commitar.${NC}"
    else
        # Verificar se cloudbuild.yaml está sendo commitado
        if git diff --cached --name-only | grep -q "cloudbuild.yaml"; then
            echo -e "${RED}❌ ERRO: cloudbuild.yaml está sendo commitado!${NC}"
            echo -e "${YELLOW}   Removendo do stage...${NC}"
            git reset HEAD cloudbuild.yaml
        fi
        
        # Adicionar arquivos
        git add .
        
        if [ ! -z "$(git diff --cached --name-only)" ]; then
            COMMIT_MSG="deploy: $(date '+%Y-%m-%d %H:%M:%S') - Deploy automático de ${SERVICE_NAME}"
            git commit -m "$COMMIT_MSG" || {
                echo -e "${YELLOW}⚠️  Nenhuma mudança para commitar.${NC}"
            }
            
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
    echo -e "${YELLOW}⏭️  Pulando atualização do Git (não é um repositório Git)${NC}"
fi

echo ""

# ============================================
# 6. RESUMO FINAL
# ============================================
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    ✅ DEPLOY CONCLUÍDO                    ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📊 Resumo:${NC}"
echo -e "   • Serviço: ${SERVICE_NAME}"
echo -e "   • Região: ${REGION}"
echo -e "   • Projeto: ${PROJECT_ID}"
if [ ! -z "$SERVICE_URL" ]; then
    echo -e "   • URL: ${SERVICE_URL}"
fi
echo ""
echo -e "${BLUE}📝 Próximos passos:${NC}"
echo -e "   1. Acesse: ${EXPECTED_URL}"
echo -e "   2. Teste as funcionalidades principais"
echo -e "   3. Verifique logs: gcloud run services logs read ${SERVICE_NAME} --region ${REGION}"
echo ""
echo -e "${GREEN}🎉 Deploy completo!${NC}"

