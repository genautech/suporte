#!/bin/bash

# Script de Backup Local
# Cria backup dos arquivos críticos do projeto

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="$PROJECT_ROOT/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="$BACKUP_DIR/backup_$TIMESTAMP"

echo "🔄 Iniciando backup local..."
echo "📁 Diretório do projeto: $PROJECT_ROOT"
echo "💾 Diretório de backup: $BACKUP_PATH"

# Criar diretório de backup
mkdir -p "$BACKUP_PATH"

# Arquivos e diretórios críticos para backup
BACKUP_ITEMS=(
    ".specs-lock"
    "firebase.ts"
    "firebase.json"
    "firestore.rules"
    "firestore.indexes.json"
    "vite.config.ts"
    "package.json"
    "package-lock.json"
    "tsconfig.json"
    "tailwind.config.js"
    "components.json"
    "cloudbuild.yaml"
    "Dockerfile"
    "docs"
)

# Fazer backup de cada item
for item in "${BACKUP_ITEMS[@]}"; do
    if [ -e "$PROJECT_ROOT/$item" ]; then
        echo "  📦 Fazendo backup de: $item"
        cp -r "$PROJECT_ROOT/$item" "$BACKUP_PATH/" 2>/dev/null || true
    else
        echo "  ⚠️  Item não encontrado: $item"
    fi
done

# Criar arquivo de informações do backup
cat > "$BACKUP_PATH/backup_info.txt" << EOF
Backup criado em: $(date)
Projeto: suporte-lojinha-prio-by-yoobe
Versão Node: $(node --version)
Versão npm: $(npm --version)
Git Branch: $(git branch --show-current 2>/dev/null || echo "N/A")
Git Commit: $(git rev-parse HEAD 2>/dev/null || echo "N/A")
EOF

# Compactar backup
echo "📦 Compactando backup..."
cd "$BACKUP_DIR"
tar -czf "backup_$TIMESTAMP.tar.gz" "backup_$TIMESTAMP"
rm -rf "backup_$TIMESTAMP"

echo "✅ Backup concluído: backup_$TIMESTAMP.tar.gz"
echo "📊 Tamanho: $(du -h "backup_$TIMESTAMP.tar.gz" | cut -f1)"



