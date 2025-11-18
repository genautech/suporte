#!/bin/bash

# Script para executar a imagem Docker localmente e investigar problemas

IMAGE_SHA="gcr.io/suporte-7e68b/suporte-lojinha@sha256:d706461be48a98db6f2ea61effb32fed1ea311559c1be78aefd48e77a560b117"

echo "🚀 Executando imagem Docker localmente..."
echo "📦 Imagem: $IMAGE_SHA"
echo "🌐 Porta: 8080"
echo ""
echo "⚠️  NOTA: Variáveis VITE_ são embedadas no build time."
echo "   Se a imagem foi buildada sem VITE_GEMINI_API_KEY, ela não funcionará mesmo passando como env."
echo ""

# Executar container com variável PORT definida
docker run -d \
  --name suporte-lojinha-local \
  -p 8080:8080 \
  -e PORT=8080 \
  "$IMAGE_SHA"

if [ $? -eq 0 ]; then
  echo "✅ Container iniciado com sucesso!"
  echo ""
  echo "📋 Comandos úteis:"
  echo "   Ver logs: docker logs -f suporte-lojinha-local"
  echo "   Parar: docker stop suporte-lojinha-local"
  echo "   Remover: docker rm suporte-lojinha-local"
  echo ""
  echo "🌐 Acesse: http://localhost:8080"
else
  echo "❌ Erro ao iniciar container"
  exit 1
fi

