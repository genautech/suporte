#!/bin/bash

# Script para executar ambiente local como produção
# Faz build e serve os arquivos estáticos como na produção

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

echo "🏗️  Construindo aplicação para produção..."
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Erro: Pasta dist não foi criada"
    exit 1
fi

echo "✅ Build concluído!"
echo ""
echo "🌐 Servindo aplicação como produção..."
echo "📁 Pasta: dist/"
echo "🔗 URL: http://localhost:8080"
echo ""
echo "💡 Para parar, pressione Ctrl+C"
echo ""

# Usar preview do Vite que serve os arquivos buildados
npm run preview








