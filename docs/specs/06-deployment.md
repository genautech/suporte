# 🚀 Especificação de Deployment

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve o processo completo de deployment no Google Cloud Run.

## ☁️ Google Cloud Platform

### Projeto

- **Project ID:** `suporte-7e68b`
- **Project Number:** `409489811769`
- **Região Padrão:** `southamerica-east1`

### Comandos de Configuração Inicial

```bash
# Autenticar
gcloud auth login

# Configurar projeto
gcloud config set project suporte-7e68b

# Verificar configuração
gcloud config list
```

## 🐳 Serviços Cloud Run

### 1. Cubbo Auth Proxy

**Nome:** `cubbo-auth-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`

#### Deployment

```bash
cd cubbo-auth-proxy
gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --set-env-vars CUBBO_CLIENT_ID={CLIENT_ID},CUBBO_CLIENT_SECRET={CLIENT_SECRET}
```

#### Atualizar Variáveis de Ambiente

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID={NOVO_ID},CUBBO_CLIENT_SECRET={NOVO_SECRET}
```

#### Verificar Status

```bash
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1
```

#### Ver Logs

```bash
gcloud run services logs read cubbo-auth-proxy \
  --region southamerica-east1 \
  --limit 50
```

### 2. Postmark Email Proxy

**Nome:** `postmark-email-proxy`  
**Região:** `southamerica-east1`

#### Deployment

```bash
cd postmark-email-proxy
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co"
```

### 3. Aplicação Principal

**Nome:** `suporte-lojinha`  
**Região:** `southamerica-east1`  
**URL:** `https://suporte-lojinha-409489811769.southamerica-east1.run.app`

#### Deployment

```bash
# Na raiz do projeto
# Método 1: Build e deploy separados (recomendado quando cloudbuild.yaml existe)
gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b

gcloud run deploy suporte-lojinha \
  --image gcr.io/suporte-7e68b/suporte-lojinha:latest \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b

# Método 2: Deploy direto (Cloud Build detecta cloudbuild.yaml automaticamente)
gcloud run deploy suporte-lojinha \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b
```

**⚠️ IMPORTANTE:** O arquivo `cloudbuild.yaml` é necessário para passar a variável `VITE_GEMINI_API_KEY` como build arg para o Dockerfile. Sem ele, a variável não será incluída no build.

#### Re-deployment Rápido

```bash
# Se apenas código mudou (sem mudanças de build vars)
gcloud run deploy suporte-lojinha \
  --source . \
  --region southamerica-east1 \
  --project suporte-7e68b
```

## 📦 Build Process

### Build Local (Desenvolvimento)

```bash
npm install
npm run build
```

### Build no Cloud Run

- Automático via `gcloud run deploy --source .` (detecta `cloudbuild.yaml` se existir)
- Ou manual via `gcloud builds submit --config cloudbuild.yaml`
- Dockerfile multi-stage executa build
- Variáveis de build passadas via `cloudbuild.yaml` (substitutions)

## 🔧 Scripts de Deploy

### Script Principal (deploy.sh)

**Arquivo:** `deploy.sh`  
**Uso:** `./deploy.sh [--skip-git] [--skip-build]`

Este script automatiza todo o processo de deploy e atualização do Git:

1. Faz build da imagem usando `cloudbuild.yaml`
2. Faz deploy no Cloud Run
3. Atualiza Git automaticamente (commit + push)

**Opções:**
- `--skip-git`: Pula a atualização do Git
- `--skip-build`: Usa imagem existente (não faz build)

**Exemplo:**
```bash
# Deploy completo com atualização Git
./deploy.sh

# Deploy sem atualizar Git
./deploy.sh --skip-git

# Deploy usando imagem existente
./deploy.sh --skip-build
```

### Script de Deploy Rápido (deploy-quick.sh)

**Arquivo:** `deploy-quick.sh`  
**Uso:** `./deploy-quick.sh`

Deploy rápido usando imagem existente e atualizando Git:

```bash
./deploy-quick.sh
```

### Cubbo Auth Proxy

**Arquivo:** `cubbo-auth-proxy/deploy-now.sh`

```bash
#!/bin/bash
# Uso: ./deploy-now.sh CLIENT_ID CLIENT_SECRET

gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars CUBBO_CLIENT_ID=$1,CUBBO_CLIENT_SECRET=$2
```

## 🌐 URLs de Produção

| Serviço | URL |
|---------|-----|
| Aplicação Principal | `https://suporte-lojinha-409489811769.southamerica-east1.run.app` |
| Cubbo Auth Proxy | `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app` |
| Postmark Email Proxy | https://postmark-email-proxy-409489811769.southamerica-east1.run.app |

## 🔄 Processo de Deploy

### 1. Preparação

```bash
# Verificar projeto atual
gcloud config get-value project

# Verificar autenticação
gcloud auth list

# Navegar para diretório do serviço
cd cubbo-auth-proxy  # ou postmark-email-proxy ou raiz
```

### 2. Deploy

```bash
# Executar comando de deploy apropriado
# (ver seções acima)
```

### 3. Verificação

```bash
# Testar URL do serviço
curl https://servico-url.a.run.app

# Verificar logs
gcloud run services logs read SERVICO_NAME --region southamerica-east1 --limit 20
```

### 4. Atualização de URLs

Após deploy, atualizar URLs no código se necessário:
- `services/supportService.ts` - URL do proxy Cubbo
- `components/UserLogin.tsx` - continueUrl do Firebase

## ⚙️ Configurações por Ambiente

### Desenvolvimento

- **URL:** `http://localhost:3000`
- **Firebase:** Configurado para desenvolvimento
- **Proxy URLs:** Apontam para Cloud Run

### Produção

- **URL:** `https://suporte-lojinha-409489811769.southamerica-east1.run.app`
- **Firebase:** Mesmo projeto, ambiente produção
- **Proxy URLs:** Mesmos serviços Cloud Run

## 🔒 Segurança

### IAM e Permissões

- Serviços configurados com `--allow-unauthenticated`
- Para produção, considerar autenticação IAM

### Secrets Management

- Secrets armazenados como variáveis de ambiente no Cloud Run
- **Recomendação:** Usar Secret Manager do GCP (futuro)

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
gcloud run services logs tail SERVICO_NAME --region southamerica-east1
```

### Métricas

- Acessar Cloud Console > Cloud Run > [Serviço]
- Ver métricas de requisições, latência, erros

## ⚠️ Regras de Deploy

### ❌ NUNCA fazer:
- Deploy direto em produção sem testar
- Modificar variáveis de ambiente sem documentar
- Deletar serviços sem backup

### ✅ SEMPRE fazer:
- Testar em desenvolvimento primeiro
- Verificar logs após deploy
- Documentar mudanças de configuração
- Atualizar esta spec após mudanças

## 🔄 Changelog

### v1.2.0 (2025-11-07)
- ✅ Adicionados scripts de deploy automático (`deploy.sh`, `deploy-quick.sh`)
- ✅ Integração automática com Git após deploy bem-sucedido
- ✅ Proteção contra commit de secrets (cloudbuild.yaml)

### v1.1.0 (2025-11-07)
- ✅ Adicionado suporte para `cloudbuild.yaml` obrigatório
- ✅ Documentados dois métodos de deploy (build separado e deploy direto)
- ✅ Adicionado aviso sobre necessidade do cloudbuild.yaml
- ✅ Atualizado processo de build para usar Cloud Build com substitutions

### v1.0.0 (2025-11-05)
- Documentação inicial de deployment
- Comandos de deploy documentados
- Processo de verificação definido
- URLs de produção documentadas



