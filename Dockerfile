# Multi-stage build: primeiro faz o build da aplicação, depois serve com nginx
FROM node:18-alpine AS builder

# Define working directory
WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./

# Instala dependências
RUN npm ci

# Copia todo o código fonte
COPY . .

# Cloud Build passa variáveis via --set-build-env-vars como variáveis de ambiente
# Essas variáveis são automaticamente disponíveis no ambiente do Cloud Build
# Usamos ARG com valor padrão vazio e depois ENV para garantir disponibilidade
ARG VITE_GEMINI_API_KEY=""
ENV VITE_GEMINI_API_KEY=${VITE_GEMINI_API_KEY}

# Faz o build da aplicação
RUN npm run build

# Stage 2: Serve com nginx
FROM nginx:alpine

# Instala gettext que contém envsubst para substituir variáveis de ambiente
RUN apk add --no-cache gettext

# Remove a configuração padrão do NGINX
RUN rm /etc/nginx/conf.d/default.conf

# Copia o template do nginx
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copia os arquivos buildados do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Expõe a porta 8080 (padrão do Cloud Run)
EXPOSE 8080

# Script para processar o template e iniciar o nginx
CMD envsubst '$$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
