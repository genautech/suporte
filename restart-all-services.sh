#!/bin/bash
# Script para reiniciar todos os serviços (local e Cloud Run)

set -e

PROJECT_ID="suporte-7e68b"
REGION="southamerica-east1"

echo "🔄 Reiniciando todos os serviços..."
echo ""

# 1. Parar servidor local
echo "⏹️  Parando servidor local..."
pkill -f "vite" || true
pkill -f "npm run dev" || true
sleep 2
echo "✅ Servidor local parado"
echo ""

# 2. Verificar se gcloud está configurado
if ! command -v gcloud &> /dev/null; then
    echo "⚠️  gcloud não está instalado. Pulando reinicialização dos serviços Cloud Run."
    echo ""
else
    # Verificar projeto atual
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    
    if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
        echo "🔧 Configurando projeto para $PROJECT_ID..."
        gcloud config set project $PROJECT_ID
    fi
    
    echo "☁️  Reiniciando serviços Cloud Run..."
    echo ""
    
    # Lista de serviços para reiniciar
    SERVICES=(
        "suporte-lojinha"
        "cubbo-auth-proxy"
        "postmark-email-proxy"
        "firebase-auth-reset-proxy"
    )
    
    for SERVICE in "${SERVICES[@]}"; do
        echo "🔄 Reiniciando $SERVICE..."
        
        # Atualizar o serviço força uma reinicialização
        if gcloud run services update $SERVICE \
            --region $REGION \
            --project $PROJECT_ID \
            --no-traffic \
            --quiet 2>/dev/null; then
            
            # Voltar o tráfego
            gcloud run services update-traffic $SERVICE \
                --region $REGION \
                --project $PROJECT_ID \
                --to-latest \
                --quiet 2>/dev/null || true
            
            echo "✅ $SERVICE reiniciado"
        else
            echo "⚠️  $SERVICE não encontrado ou erro ao reiniciar"
        fi
        echo ""
    done
fi

# 3. Reiniciar servidor local
echo "🚀 Iniciando servidor local..."
cd "$(dirname "$0")"
npm run dev > /dev/null 2>&1 &
DEV_PID=$!
sleep 3

if ps -p $DEV_PID > /dev/null; then
    echo "✅ Servidor local iniciado (PID: $DEV_PID)"
    echo "🌐 Acesse: http://localhost:8080"
else
    echo "⚠️  Erro ao iniciar servidor local. Verifique os logs."
fi

echo ""
echo "✅ Reinicialização concluída!"
echo ""
echo "📊 Status dos serviços:"
echo "  - Servidor local: $(ps -p $DEV_PID > /dev/null 2>&1 && echo '✅ Rodando' || echo '❌ Parado')"

if command -v gcloud &> /dev/null; then
    echo "  - Cloud Run: Verifique com 'gcloud run services list --region $REGION'"
fi







