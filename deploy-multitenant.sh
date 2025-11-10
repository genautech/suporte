#!/bin/bash
# Deploy da branch multi-tenant para serviço separado

set -e

PROJECT_ID="suporte-7e68b"
REGION="southamerica-east1"
SERVICE_NAME="suporte-lojinha-multitenant"
IMAGE_NAME="gcr.io/${PROJECT_ID}/suporte-lojinha:multitenant"

echo "🚀 Iniciando deploy da branch multi-tenant..."

# 1. Build da imagem usando Cloud Build
echo "📦 Fazendo build da imagem..."
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_GEMINI_API_KEY=AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw \
  --tag ${IMAGE_NAME} \
  --project ${PROJECT_ID}

# 2. Deploy no Cloud Run
echo "🚀 Fazendo deploy no Cloud Run..."
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

# 3. Obter URL do serviço
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --format="value(status.url)" \
  --project ${PROJECT_ID})

echo "✅ Deploy concluído!"
echo "🌐 URL do serviço: ${SERVICE_URL}"

