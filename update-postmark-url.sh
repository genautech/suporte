#!/bin/bash

# Script para atualizar a URL do Postmark Email Proxy no código
# Uso: ./update-postmark-url.sh https://postmark-email-proxy-xxxxx.southamerica-east1.run.app

set -e

if [ -z "$1" ]; then
    echo "Erro: URL não fornecida"
    echo ""
    echo "Uso: ./update-postmark-url.sh https://postmark-email-proxy-xxxxx.southamerica-east1.run.app"
    exit 1
fi

POSTMARK_URL=$1

echo "Atualizando URL do Postmark Email Proxy..."
echo "URL: $POSTMARK_URL"
echo ""

# Atualizar supportService.ts
SUPPORT_SERVICE_FILE="services/supportService.ts"
if [ -f "$SUPPORT_SERVICE_FILE" ]; then
    # Usar sed para atualizar a URL (linha 221)
    # Atualizar a linha que contém EMAIL_PROXY_URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|'https://substitua-pela-url-do-seu-servico-postmark.a.run.app'|'${POSTMARK_URL}'|g" "$SUPPORT_SERVICE_FILE"
        sed -i '' "s|\${import.meta.env.VITE_POSTMARK_PROXY_URL} || 'https://substitua-pela-url-do-seu-servico-postmark.a.run.app'|\${import.meta.env.VITE_POSTMARK_PROXY_URL} || '${POSTMARK_URL}'|g" "$SUPPORT_SERVICE_FILE"
    else
        # Linux
        sed -i "s|'https://substitua-pela-url-do-seu-servico-postmark.a.run.app'|'${POSTMARK_URL}'|g" "$SUPPORT_SERVICE_FILE"
        sed -i "s|\${import.meta.env.VITE_POSTMARK_PROXY_URL} || 'https://substitua-pela-url-do-seu-servico-postmark.a.run.app'|\${import.meta.env.VITE_POSTMARK_PROXY_URL} || '${POSTMARK_URL}'|g" "$SUPPORT_SERVICE_FILE"
    fi
    echo "✅ Atualizado: $SUPPORT_SERVICE_FILE"
else
    echo "⚠️  Arquivo não encontrado: $SUPPORT_SERVICE_FILE"
fi

# Atualizar .env.local
ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
    # Adicionar ou atualizar VITE_POSTMARK_PROXY_URL
    if grep -q "VITE_POSTMARK_PROXY_URL" "$ENV_FILE"; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|VITE_POSTMARK_PROXY_URL=.*|VITE_POSTMARK_PROXY_URL=${POSTMARK_URL}|g" "$ENV_FILE"
        else
            sed -i "s|VITE_POSTMARK_PROXY_URL=.*|VITE_POSTMARK_PROXY_URL=${POSTMARK_URL}|g" "$ENV_FILE"
        fi
        echo "✅ Atualizado: $ENV_FILE"
    else
        echo "" >> "$ENV_FILE"
        echo "VITE_POSTMARK_PROXY_URL=${POSTMARK_URL}" >> "$ENV_FILE"
        echo "✅ Adicionado: $ENV_FILE"
    fi
else
    echo "VITE_POSTMARK_PROXY_URL=${POSTMARK_URL}" > "$ENV_FILE"
    echo "✅ Criado: $ENV_FILE"
fi

echo ""
echo "✅ Atualização concluída!"
echo ""
echo "Próximos passos:"
echo "1. Reinicie o servidor de desenvolvimento (npm run dev)"
echo "2. Faça um novo build se necessário (npm run build)"

