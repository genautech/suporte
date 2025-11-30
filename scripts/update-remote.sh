#!/bin/bash

# Script de Atualização do Repositório Remoto
# Puxa as últimas mudanças do repositório remoto

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔄 Atualizando do repositório remoto..."

# Verificar se há mudanças locais não commitadas
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  Há mudanças locais não commitadas:"
    git status --short
    echo ""
    read -p "Deseja fazer stash das mudanças? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        echo "💾 Fazendo stash das mudanças locais..."
        git stash push -m "Stash automático antes de atualizar - $(date +%Y-%m-%d_%H:%M:%S)"
        STASHED=true
    else
        echo "❌ Atualização cancelada. Faça commit ou stash das mudanças primeiro."
        exit 1
    fi
fi

# Buscar mudanças do remoto
echo "📥 Buscando mudanças do remoto..."
git fetch origin

# Verificar se há atualizações
CURRENT_BRANCH=$(git branch --show-current)
LOCAL_COMMIT=$(git rev-parse HEAD)
REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")

if [ -z "$REMOTE_COMMIT" ]; then
    echo "⚠️  Branch remoto não encontrado. Criando branch local..."
    git branch --set-upstream-to=origin/$CURRENT_BRANCH $CURRENT_BRANCH 2>/dev/null || true
    REMOTE_COMMIT=$(git rev-parse origin/$CURRENT_BRANCH 2>/dev/null || echo "")
fi

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
    echo "✅ Já está atualizado com o remoto"
    if [ "$STASHED" = true ]; then
        echo "🔄 Restaurando mudanças locais..."
        git stash pop || true
    fi
    exit 0
fi

# Mostrar diferenças
echo "📊 Diferenças encontradas:"
git log HEAD..origin/$CURRENT_BRANCH --oneline | head -10

# Fazer merge ou rebase
read -p "Deseja fazer merge das mudanças? (S/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "🔀 Fazendo merge..."
    git merge origin/$CURRENT_BRANCH || {
        echo "❌ Conflitos detectados. Resolva manualmente."
        exit 1
    }
else
    echo "⏭️  Merge cancelado"
    exit 0
fi

# Restaurar stash se houver
if [ "$STASHED" = true ]; then
    echo "🔄 Restaurando mudanças locais..."
    git stash pop || {
        echo "⚠️  Conflitos ao restaurar stash. Resolva manualmente."
    }
fi

# Instalar dependências se package.json mudou
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json\|package-lock.json"; then
    echo "📦 package.json foi atualizado. Instalando dependências..."
    npm install
fi

echo "✅ Atualização concluída com sucesso!"
echo "📊 Último commit: $(git log -1 --oneline)"

