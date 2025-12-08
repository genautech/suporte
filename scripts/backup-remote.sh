#!/bin/bash

# Script de Backup Remoto (Git)
# Faz commit e push das mudanças para o repositório remoto

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🔄 Iniciando backup remoto (Git)..."

# Verificar se há mudanças
if [ -z "$(git status --porcelain)" ]; then
    echo "✅ Nenhuma mudança para fazer backup"
    exit 0
fi

# Mostrar status
echo "📋 Mudanças detectadas:"
git status --short

# Adicionar todas as mudanças (exceto .env.local e node_modules)
git add -A
git reset HEAD .env.local 2>/dev/null || true
git reset HEAD node_modules 2>/dev/null || true

# Verificar se há algo para commitar
if [ -z "$(git diff --cached --name-only)" ]; then
    echo "✅ Nenhuma mudança para commitar"
    exit 0
fi

# Criar commit
TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)
COMMIT_MSG="Backup automático - $TIMESTAMP"

echo "💾 Criando commit..."
git commit -m "$COMMIT_MSG" || {
    echo "⚠️  Nenhuma mudança para commitar"
    exit 0
}

# Fazer push
echo "🚀 Enviando para repositório remoto..."
git push origin $(git branch --show-current) || {
    echo "❌ Erro ao fazer push. Verifique a conexão e permissões."
    exit 1
}

echo "✅ Backup remoto concluído com sucesso!"
echo "📊 Último commit: $(git log -1 --oneline)"








