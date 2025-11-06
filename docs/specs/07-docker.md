# 🐳 Especificação Docker

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve todas as configurações Docker do projeto.

## 🏗️ Dockerfiles

### 1. Aplicação Principal

**Arquivo:** `Dockerfile`  
**Tipo:** Multi-stage build

#### Stage 1: Builder

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar dependências
COPY package*.json ./
RUN npm ci

# Copiar código fonte
COPY . .

# Variável de build
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

# Build
RUN npm run build
```

**Base Image:** `node:18-alpine`  
**Output:** `dist/` (arquivos buildados)

#### Stage 2: Nginx

```dockerfile
FROM nginx:alpine

# Instalar gettext para envsubst
RUN apk add --no-cache gettext

# Remover config padrão
RUN rm /etc/nginx/conf.d/default.conf

# Copiar template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar build do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta
EXPOSE 8080

# Comando de inicialização
CMD envsubst '$$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'
```

**Base Image:** `nginx:alpine`  
**Porta:** 8080 (variável `PORT` do Cloud Run)

### 2. Cubbo Auth Proxy

**Arquivo:** `cubbo-auth-proxy/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "index.js"]
```

**Base Image:** `node:18-alpine`  
**Porta:** 8080

### 3. Postmark Email Proxy

**Arquivo:** `postmark-email-proxy/Dockerfile`

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 8080

CMD ["node", "index.js"]
```

**Base Image:** `node:18-alpine`  
**Porta:** 8080

## 🔧 NGINX Configuration

**Arquivo:** `nginx.conf.template`

```nginx
server {
    listen ${PORT};
    root /usr/share/nginx/html;
    index index.html index.htm;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de arquivos estáticos
    location ~* \.(?:ico|css|js|gif|jpe?g|png)$ {
        expires 1y;
        add_header Cache-Control "public";
    }
}
```

**Variáveis:** `${PORT}` substituída via `envsubst`

## 📦 Build Arguments

### Aplicação Principal

- `VITE_GEMINI_API_KEY` - Chave da API Gemini (build time)

**Uso:**
```bash
docker build --build-arg VITE_GEMINI_API_KEY=chave .
```

## 🚀 Comandos Docker

### Build Local

```bash
# Aplicação principal
docker build --build-arg VITE_GEMINI_API_KEY=chave -t suporte-lojinha .

# Cubbo Auth Proxy
cd cubbo-auth-proxy
docker build -t cubbo-auth-proxy .

# Postmark Email Proxy
cd postmark-email-proxy
docker build -t postmark-email-proxy .
```

### Run Local

```bash
# Aplicação principal
docker run -p 8080:8080 -e PORT=8080 suporte-lojinha

# Cubbo Auth Proxy
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e CUBBO_CLIENT_ID=id \
  -e CUBBO_CLIENT_SECRET=secret \
  cubbo-auth-proxy
```

### Test Local

```bash
# Testar aplicação
curl http://localhost:8080

# Testar proxy
curl -X POST http://localhost:8080/ \
  -H "Origin: http://localhost:3000"
```

## 📋 .dockerignore

**Arquivo:** `.dockerignore` (criar se não existir)

```
node_modules
dist
.git
.env.local
.env
*.md
.vscode
.idea
*.log
```

## 🔄 Processo de Build

### Cloud Run (Automático)

**⚠️ IMPORTANTE:** O arquivo `cloudbuild.yaml` é **OBRIGATÓRIO** para passar variáveis de build como ARG para o Dockerfile.

1. `gcloud run deploy --source .` detecta `cloudbuild.yaml` (se existir)
2. Cloud Build executa build usando `cloudbuild.yaml`
3. Variáveis de build passadas via substitutions no `cloudbuild.yaml`
4. Imagem criada e armazenada no Container Registry
5. Cloud Run usa imagem para deploy

**Sem `cloudbuild.yaml`:**
- Variáveis de `--set-build-env-vars` **NÃO** são passadas como ARG
- Build pode completar mas sem variáveis necessárias
- Aplicação pode não funcionar corretamente em produção

### Local (Desenvolvimento)

1. Modificar código
2. Executar `docker build --build-arg VITE_GEMINI_API_KEY=chave .`
3. Executar `docker run`
4. Testar localmente

## ⚙️ Variáveis de Ambiente Runtime

### Aplicação Principal

- `PORT` - Porta do servidor (Cloud Run injeta)

### Cubbo Auth Proxy

- `PORT` - Porta do servidor
- `CUBBO_CLIENT_ID` - Client ID Cubbo
- `CUBBO_CLIENT_SECRET` - Client Secret Cubbo

### Postmark Email Proxy

- `PORT` - Porta do servidor
- `POSTMARK_SERVER_TOKEN` - Token Postmark
- `FROM_EMAIL` - Email remetente

## 🛡️ Boas Práticas

### ✅ Fazer:
- Usar multi-stage builds para reduzir tamanho
- Usar `.dockerignore` para excluir arquivos desnecessários
- Usar variáveis de ambiente para configuração
- Usar imagens base oficiais e específicas

### ❌ Evitar:
- Incluir `node_modules` no build (usar `npm ci`)
- Hardcodar secrets no Dockerfile
- Usar `latest` tag em produção
- Incluir arquivos de desenvolvimento

## 🔍 Troubleshooting

### Build Falha

```bash
# Ver logs detalhados
docker build --progress=plain -t image-name .

# Build sem cache
docker build --no-cache -t image-name .
```

### Container Não Inicia

```bash
# Ver logs do container
docker logs container-id

# Executar shell no container
docker exec -it container-id sh
```

## ⚠️ Regras de Mudança

### ❌ NUNCA modificar sem:
1. Consultar esta spec
2. Testar build localmente
3. Verificar tamanho da imagem
4. Atualizar documentação

### ✅ SEMPRE fazer quando:
1. Adicionar nova dependência
2. Mudar base image
3. Modificar processo de build
4. Atualizar configuração NGINX

## 🔄 Changelog

### v1.1.0 (2025-11-07)
- ✅ Adicionado aviso sobre obrigatoriedade do `cloudbuild.yaml`
- ✅ Documentado processo de build com Cloud Build e substitutions
- ✅ Atualizado processo de build para Cloud Run

### v1.0.0 (2025-11-05)
- Dockerfile multi-stage documentado
- Configuração NGINX especificada
- Processo de build documentado
- Variáveis de ambiente mapeadas



