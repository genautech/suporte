#!/bin/bash

# Script de Verificação do Ambiente Local
# Verifica todas as configurações necessárias

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔍 Verificando ambiente local..."
echo ""

# 1. Verificar Node.js
echo "📦 Node.js:"
if command -v node &> /dev/null; then
    echo "  ✅ Versão: $(node --version)"
else
    echo "  ❌ Node.js não encontrado"
    exit 1
fi

# 2. Verificar npm
echo "📦 npm:"
if command -v npm &> /dev/null; then
    echo "  ✅ Versão: $(npm --version)"
else
    echo "  ❌ npm não encontrado"
    exit 1
fi

# 3. Verificar dependências
echo "📦 Dependências:"
if [ -d "node_modules" ]; then
    echo "  ✅ node_modules existe"
    MISSING=$(npm list --depth=0 2>&1 | grep -E "UNMET|missing" | wc -l || echo "0")
    if [ "$MISSING" = "0" ]; then
        echo "  ✅ Todas as dependências instaladas"
    else
        echo "  ⚠️  Algumas dependências podem estar faltando"
        echo "  💡 Execute: npm install"
    fi
else
    echo "  ❌ node_modules não encontrado"
    echo "  💡 Execute: npm install"
    exit 1
fi

# 4. Verificar .env.local
echo ""
echo "🔐 Variáveis de Ambiente:"
if [ -f ".env.local" ]; then
    echo "  ✅ .env.local existe"
    
    # Verificar cada variável
    if grep -q "^VITE_GEMINI_API_KEY=" .env.local && ! grep -q "^VITE_GEMINI_API_KEY=$" .env.local; then
        echo "  ✅ VITE_GEMINI_API_KEY configurada"
    else
        echo "  ⚠️  VITE_GEMINI_API_KEY não configurada ou vazia"
    fi
    
    if grep -q "^VITE_POSTMARK_PROXY_URL=" .env.local; then
        echo "  ✅ VITE_POSTMARK_PROXY_URL configurada"
    else
        echo "  ⚠️  VITE_POSTMARK_PROXY_URL não configurada"
    fi
    
    if grep -q "^VITE_AUTH_RESET_PROXY_URL=" .env.local; then
        echo "  ✅ VITE_AUTH_RESET_PROXY_URL configurada"
    else
        echo "  ⚠️  VITE_AUTH_RESET_PROXY_URL não configurada"
    fi
else
    echo "  ❌ .env.local não encontrado"
    echo "  💡 Execute: npm run sync:env"
    exit 1
fi

# 5. Verificar arquivos críticos
echo ""
echo "📁 Arquivos Críticos:"
CRITICAL_FILES=(
    "firebase.ts"
    "vite.config.ts"
    "package.json"
    "index.html"
    "index.tsx"
    "App.tsx"
    "index.css"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file não encontrado"
    fi
done

# 6. Verificar CSS
echo ""
echo "🎨 Arquivos CSS:"
if [ -f "index.css" ]; then
    echo "  ✅ index.css"
    if [ -f "styles/design-system.css" ]; then
        echo "  ✅ styles/design-system.css"
    else
        echo "  ⚠️  styles/design-system.css não encontrado"
    fi
else
    echo "  ❌ index.css não encontrado"
fi

# 7. Verificar TypeScript
echo ""
echo "📝 TypeScript:"
if [ -f "tsconfig.json" ]; then
    echo "  ✅ tsconfig.json existe"
    if command -v tsc &> /dev/null; then
        echo "  ✅ TypeScript instalado: $(tsc --version)"
    else
        echo "  ⚠️  TypeScript não encontrado globalmente (pode estar em node_modules)"
    fi
else
    echo "  ❌ tsconfig.json não encontrado"
fi

# 8. Verificar porta 8080
echo ""
echo "🌐 Porta 8080:"
if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "  ⚠️  Porta 8080 está em uso"
    echo "  💡 Pare o servidor ou o Vite usará outra porta"
else
    echo "  ✅ Porta 8080 disponível"
fi

# 9. Verificar Git
echo ""
echo "📦 Git:"
if command -v git &> /dev/null; then
    echo "  ✅ Git instalado"
    if [ -d ".git" ]; then
        echo "  ✅ Repositório Git inicializado"
        REMOTE=$(git remote -v 2>/dev/null | head -1 || echo "")
        if [ -n "$REMOTE" ]; then
            echo "  ✅ Repositório remoto configurado"
        else
            echo "  ⚠️  Repositório remoto não configurado"
        fi
    else
        echo "  ⚠️  Não é um repositório Git"
    fi
else
    echo "  ⚠️  Git não encontrado"
fi

echo ""
echo "✅ Verificação concluída!"
echo ""
echo "💡 Para iniciar o servidor:"
echo "   npm run dev"
echo ""
echo "💡 Para sincronizar variáveis de ambiente:"
echo "   npm run sync:env"

