#!/bin/bash

# Automação do Firebase local (emuladores e regras)
# Uso:
#   scripts/setup-firebase-local.sh --apply-rules
#   scripts/setup-firebase-local.sh --start
#   scripts/setup-firebase-local.sh --start --only firestore,auth
#
# Variáveis:
#   FIREBASE_PROJECT_ID   -> projeto Firebase (default: suporte-7e68b)
#   FIREBASE_DATA_DIR     -> pasta de import/export (default: ./.firebase-data)
#   FIREBASE_EMULATORS    -> lista padrão de emuladores (default: firestore,auth)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-suporte-7e68b}"
FIREBASE_DATA_DIR="${FIREBASE_DATA_DIR:-$PROJECT_ROOT/.firebase-data}"
FIREBASE_CONFIG="${PROJECT_ROOT}/firebase.json"
FIREBASE_EMULATORS="${FIREBASE_EMULATORS:-firestore,auth}"

ACTION=""
ONLY_FLAG=""

usage() {
  cat <<EOF
Uso:
  $(basename "$0") --apply-rules          Aplica regras atuais no emulador via firebase emulators:exec
  $(basename "$0") --start [--only ...]   Inicia emuladores com import/export automático

Flags opcionais:
  --only firestore,auth      Define lista de emuladores (per default ${FIREBASE_EMULATORS})
  --data-dir ./caminho       Define diretório de import/export (default ${FIREBASE_DATA_DIR})
  --project suporte-7e68b    Define ID do projeto Firebase
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply-rules)
      ACTION="apply"
      shift
      ;;
    --start)
      ACTION="start"
      shift
      ;;
    --only)
      ONLY_FLAG="$2"
      shift 2
      ;;
    --data-dir)
      FIREBASE_DATA_DIR="$2"
      shift 2
      ;;
    --project)
      FIREBASE_PROJECT_ID="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $1"
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$ACTION" ]]; then
  usage
  exit 1
fi

ensure_cli() {
  if ! command -v firebase >/dev/null 2>&1; then
    echo "❌ Firebase CLI não encontrado. Execute 'npm run setup:local' ou instale manualmente."
    exit 1
  fi
}

ensure_cli

mkdir -p "$FIREBASE_DATA_DIR"

EMULATORS="${ONLY_FLAG:-$FIREBASE_EMULATORS}"

if [[ "$ACTION" == "apply" ]]; then
  echo "🚀 Aplicando regras e índices usando firebase emulators:exec..."
  firebase emulators:exec \
    --project "$FIREBASE_PROJECT_ID" \
    --config "$FIREBASE_CONFIG" \
    --import "$FIREBASE_DATA_DIR" \
    --export-on-exit "$FIREBASE_DATA_DIR" \
    --only "$EMULATORS" \
    "echo 'Regras aplicadas com sucesso!'"
  exit 0
fi

if [[ "$ACTION" == "start" ]]; then
  echo "🟢 Iniciando emuladores ($EMULATORS) com import/export em $FIREBASE_DATA_DIR"
  echo "Pressione CTRL+C para encerrar."
  firebase emulators:start \
    --project "$FIREBASE_PROJECT_ID" \
    --config "$FIREBASE_CONFIG" \
    --import "$FIREBASE_DATA_DIR" \
    --export-on-exit "$FIREBASE_DATA_DIR" \
    --only "$EMULATORS"
  exit 0
fi








