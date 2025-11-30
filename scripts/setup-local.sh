#!/bin/bash

# Script principal de setup local (macOS)
# - Garante Homebrew, Node e Firebase CLI
# - Instala dependências npm
# - Sincroniza .env.local
# - Aplica regras do Firebase via script auxiliar
#
# Variáveis de ambiente opcionais:
#   SKIP_BREW_CHECK=1       -> não verifica/instala Homebrew e fórmulas
#   SKIP_FIREBASE_APPLY=1   -> não roda setup-firebase-local.sh --apply-rules
#   NODE_FORMULA=node@20    -> fórmula Homebrew para instalar Node (padrão node@20)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_FORMULA="${NODE_FORMULA:-node@20}"
FIREBASE_FORMULA="${FIREBASE_FORMULA:-firebase-cli}"

log_step() {
  echo ""
  echo "👉 $1"
}

log_success() {
  echo "✅ $1"
}

abort() {
  echo "❌ $1" >&2
  exit 1
}

ensure_command() {
  local cmd="$1"
  local install_hint="$2"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    abort "Comando '$cmd' não encontrado. Instale manualmente (${install_hint}) e execute novamente."
  fi
}

if [[ "$OSTYPE" != "darwin"* ]]; then
  echo "⚠️  Este script foi otimizado para macOS. Continue por sua conta e risco."
fi

if [[ -z "${SKIP_BREW_CHECK:-}" ]]; then
  if ! command -v brew >/dev/null 2>&1; then
    log_step "Homebrew não encontrado. Instalando..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    log_success "Homebrew instalado."
  else
    log_step "Atualizando Homebrew..."
    brew update
  fi

  if ! brew list --versions "$NODE_FORMULA" >/dev/null 2>&1; then
    log_step "Instalando ${NODE_FORMULA} via Homebrew..."
    brew install "$NODE_FORMULA"
    brew link --overwrite "$NODE_FORMULA" >/dev/null 2>&1 || true
  else
    log_step "Node já instalado (${NODE_FORMULA})."
  fi

  if ! brew list --versions "$FIREBASE_FORMULA" >/dev/null 2>&1; then
    log_step "Instalando Firebase CLI via Homebrew..."
    brew install "$FIREBASE_FORMULA"
  else
    log_step "Firebase CLI já instalado."
  fi
else
  echo "⚠️  SKIP_BREW_CHECK=1 definido. Pulando instalação via Homebrew."
  ensure_command "node" "Instale Node.js 18+"
  ensure_command "npm" "Instale Node.js/NPM"
  ensure_command "firebase" "npm install -g firebase-tools"
fi

log_step "Versões instaladas:"
node --version || true
npm --version || true
firebase --version || true

log_step "Instalando dependências npm..."
cd "$PROJECT_ROOT"
npm install
log_success "Dependências instaladas."

log_step "Sincronizando variáveis de ambiente..."
bash "$SCRIPT_DIR/sync-env.sh"

if [[ -z "${SKIP_FIREBASE_APPLY:-}" ]]; then
  log_step "Aplicando regras do Firebase no emulador..."
  bash "$SCRIPT_DIR/setup-firebase-local.sh" --apply-rules
else
  echo "⚠️  SKIP_FIREBASE_APPLY=1 definido. Pulando aplicação de regras."
fi

cat <<'EOF'

🎉 Setup concluído!

Próximos passos recomendados:
  1. Iniciar emuladores: npm run firebase:emulators
  2. Em outro terminal, iniciar app: npm run dev

Variáveis úteis:
  SKIP_BREW_CHECK=1 npm run setup:local    # se já tiver todas as ferramentas
  SKIP_FIREBASE_APPLY=1 npm run setup:local # se não quiser rodar emuladores agora

EOF


