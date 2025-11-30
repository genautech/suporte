#!/bin/bash

# Script de Sincronização de Variáveis de Ambiente
# Atualiza .env.local com valores do template de secrets (se necessário)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_TEMPLATE="$PROJECT_ROOT/.specs-lock/secrets/secrets-template.md"
ENV_LOCAL="$PROJECT_ROOT/.env.local"

cd "$PROJECT_ROOT"

echo "🔄 Sincronizando variáveis de ambiente..."

# Verificar se .env.local existe
if [ ! -f "$ENV_LOCAL" ]; then
    echo "📝 Criando .env.local..."
    cat > "$ENV_LOCAL" << 'EOF'
# Variáveis de Ambiente para Desenvolvimento Local
# Este arquivo está no .gitignore e não será commitado

# Gemini API Key (OBRIGATÓRIA)
VITE_GEMINI_API_KEY=

# Postmark Email Proxy URL
VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app

# Firebase Auth Reset Proxy URL
VITE_AUTH_RESET_PROXY_URL=https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app
EOF
fi

# Extrair chave Gemini do template se .env.local estiver vazia
if grep -q "VITE_GEMINI_API_KEY=$" "$ENV_LOCAL" || ! grep -q "VITE_GEMINI_API_KEY=" "$ENV_LOCAL"; then
    if [ -f "$SECRETS_TEMPLATE" ]; then
        GEMINI_KEY=$(grep -A 1 "VITE_GEMINI_API_KEY=" "$SECRETS_TEMPLATE" | grep -v "^#" | head -1 | sed 's/.*VITE_GEMINI_API_KEY=//' | tr -d '`' | xargs)
        
        if [ -n "$GEMINI_KEY" ] && [ "$GEMINI_KEY" != "sua_chave_aqui" ]; then
            echo "🔑 Atualizando VITE_GEMINI_API_KEY do template..."
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s|VITE_GEMINI_API_KEY=.*|VITE_GEMINI_API_KEY=$GEMINI_KEY|" "$ENV_LOCAL"
            else
                # Linux
                sed -i "s|VITE_GEMINI_API_KEY=.*|VITE_GEMINI_API_KEY=$GEMINI_KEY|" "$ENV_LOCAL"
            fi
        fi
    fi
fi

echo "✅ Sincronização concluída!"
echo "📋 Variáveis configuradas:"
grep -E "^VITE_" "$ENV_LOCAL" | sed 's/=.*/=***/' || echo "  Nenhuma variável VITE_ encontrada"

