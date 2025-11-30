# 🚀 Guia de Deploy - Sistema de Suporte

**URL de Produção:** https://suporte-lojinha-409489811769.southamerica-east1.run.app

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração Inicial](#configuração-inicial)
3. [Deploy Automático](#deploy-automático)
4. [Deploy Manual](#deploy-manual)
5. [Troubleshooting](#troubleshooting)
6. [Validação Pós-Deploy](#validação-pós-deploy)

---

## Pré-requisitos

### Ferramentas Necessárias

- **Node.js** 18+ instalado
- **Google Cloud SDK** (`gcloud`) instalado e configurado
- **Git** configurado
- Conta Google Cloud com projeto ativo
- Permissões para Cloud Build e Cloud Run

### Configuração do Google Cloud

```bash
# Autenticar no Google Cloud
gcloud auth login

# Configurar projeto
gcloud config set project suporte-7e68b

# Habilitar APIs necessárias
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

---

## Configuração Inicial

### 1. Clone o Repositório

```bash
git clone https://github.com/genautech/suporte.git
cd suporte
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Configure Variáveis de Ambiente Locais

Crie um arquivo `.env.local` na raiz do projeto:

```env
VITE_GEMINI_API_KEY=sua_chave_api_gemini_aqui
VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app
VITE_AUTH_RESET_PROXY_URL=https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app
```

### 4. Configure o Cloud Build

O arquivo `cloudbuild.yaml` deve estar configurado com a chave da API Gemini:

```yaml
substitutions:
  _VITE_GEMINI_API_KEY: 'sua_chave_aqui'
```

**⚠️ IMPORTANTE:** O arquivo `cloudbuild.yaml` não deve ser commitado no Git (deve estar no `.gitignore`). Use `cloudbuild.yaml.example` como template.

---

## Deploy Automático

### 1. Script recomendado (`deploy-auto.sh`)

Fluxo end-to-end com validações, logs e pós-check automático.

```bash
./deploy-auto.sh
```

Recursos principais:
- ✅ Checa gcloud instalado, autenticação ativa e projeto correto.
- ✅ Garante presença de `cloudbuild.yaml`/`Dockerfile` antes de começar.
- ✅ Executa `gcloud builds submit` + `gcloud run deploy` usando a imagem `gcr.io/suporte-7e68b/suporte-lojinha:latest`.
- ✅ Compara a URL retornada com `https://suporte-lojinha-409489811769.southamerica-east1.run.app`.
- ✅ Executa `curl` simples para confirmar HTTP 200 e imprime a revisão ativa (`suporte-lojinha-00033-tlx` no marco v2.3.0).

### 2. Script tradicional (`deploy.sh`)

Mantém o fluxo completo (build + deploy + git) porém sem os checks extra.

```bash
# Deploy completo (build + deploy + git)
./deploy.sh

# Variantes
./deploy.sh --skip-git
./deploy.sh --skip-build
./deploy.sh --skip-build --skip-git
```

Usar quando precisar de controle fino sobre build/push mas ainda quer commit automático.

### 3. Script rápido (`deploy-quick.sh`)

Usa a última imagem já publicada no Container Registry e apenas atualiza o Cloud Run.

```bash
./deploy-quick.sh
```

Ideal para pequenos ajustes de configuração quando o build anterior já está pronto.

---

## Deploy Manual

### Método 1: Cloud Build + Cloud Run

```bash
# 1. Build da imagem
gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b

# 2. Deploy da imagem
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
```

### Método 2: Deploy Direto (Source-based)

```bash
gcloud run deploy suporte-lojinha \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b \
  --set-env-vars VITE_GEMINI_API_KEY=sua_chave_aqui
```

**⚠️ NOTA:** O método 2 não passa variáveis de build corretamente. Use o Método 1 para garantir que `VITE_GEMINI_API_KEY` seja embedada no build.

---

## Troubleshooting

### Erro: "cloudbuild.yaml não encontrado"

**Solução:** 
1. Copie o template: `cp cloudbuild.yaml.example cloudbuild.yaml`
2. Edite `cloudbuild.yaml` e adicione sua chave da API Gemini

### Erro: "Repositório Git não encontrado"

**Solução:** 
```bash
git init
git remote add origin https://github.com/genautech/suporte.git
```

### Erro: "Erro ao fazer push"

**Solução:** 
1. Verifique suas credenciais Git:
   ```bash
   git config --global user.name "Seu Nome"
   git config --global user.email "seu@email.com"
   ```
2. Ou configure SSH keys no GitHub

### Erro: "Missing or insufficient permissions"

**Solução:**
1. Verifique permissões do projeto:
   ```bash
   gcloud projects get-iam-policy suporte-7e68b
   ```
2. Solicite permissões de Cloud Build e Cloud Run ao administrador

### Erro: Build falha com "VITE_GEMINI_API_KEY not found"

**Solução:**
1. Verifique se `cloudbuild.yaml` tem a substituição `_VITE_GEMINI_API_KEY`
2. Verifique se a chave está correta
3. Use Secret Manager (recomendado para produção)

### Deploy funciona mas aplicação não carrega

**Solução:**
1. Verifique logs do Cloud Run:
   ```bash
   gcloud run services logs read suporte-lojinha --region southamerica-east1
   ```
2. Verifique se a URL está correta: https://suporte-lojinha-409489811769.southamerica-east1.run.app
3. Verifique se o serviço está rodando:
   ```bash
   gcloud run services describe suporte-lojinha --region southamerica-east1
   ```

---

## Validação Pós-Deploy

### 1. Verificar Status do Serviço

```bash
gcloud run services describe suporte-lojinha \
  --region southamerica-east1 \
  --project suporte-7e68b \
  --format 'value(status.url)'
```

### 2. Testar URL de Produção

```bash
curl https://suporte-lojinha-409489811769.southamerica-east1.run.app/
```

Deve retornar HTML da aplicação.

### 3. Verificar Logs

```bash
gcloud run services logs read suporte-lojinha \
  --region southamerica-east1 \
  --limit 50
```

### 4. Testar Funcionalidades

- ✅ Login de usuário
- ✅ Chatbot funcionando
- ✅ Criação de tickets
- ✅ Busca de pedidos

### 5. Smoke tests das novidades v2.3.0

- 🔔 Verificar `NotificationBell` (badge ↑ ao enviar novo ticket/conversa, botão de mute e "Marcar tudo").  
- 📣 Criar banner em `AdminSupportNotices` e confirmar exibição imediata no `SupportNoticeBanner`.  
- 🧠 Cadastrar resposta em `AdminDefaultResponses` (com *Incluir no aprendizado*) e validar entrada correspondente na base de conhecimento.  
- 🚨 Abrir escalonamento via `ManagerDashboard` e conferir alertas em tempo real para o gestor/admin.

---

## Configuração de Secrets (Recomendado)

Para produção, use Secret Manager ao invés de hardcoded secrets:

### 1. Criar Secret

```bash
echo -n "sua_chave_api_gemini" | gcloud secrets create gemini-api-key \
  --data-file=- \
  --replication-policy="automatic" \
  --project suporte-7e68b
```

### 2. Atualizar cloudbuild.yaml

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    secretEnv: ['VITE_GEMINI_API_KEY']
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_GEMINI_API_KEY=$$VITE_GEMINI_API_KEY'
      - '-t'
      - 'gcr.io/$PROJECT_ID/suporte-lojinha:latest'
      - '.'
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/suporte-lojinha:latest']

availableSecrets:
  secretManager:
    - versionName: projects/suporte-7e68b/secrets/gemini-api-key/versions/latest
      env: 'VITE_GEMINI_API_KEY'

images:
  - 'gcr.io/$PROJECT_ID/suporte-lojinha:latest'
```

---

## Fluxo de Trabalho Recomendado

### Desenvolvimento Local

1. Fazer mudanças no código
2. Testar localmente: `npm run dev`
3. Commit manual: `git commit -m "feat: nova funcionalidade"`

### Deploy em Produção

1. Executar: `./deploy.sh`
2. O script faz:
   - Build da imagem
   - Deploy no Cloud Run
   - Commit automático do deploy
   - Push para GitHub

### Deploy Rápido (Código já buildado)

1. Executar: `./deploy-quick.sh`
2. O script faz:
   - Deploy usando imagem existente
   - Commit automático do deploy
   - Push para GitHub

---

## Informações do Serviço

- **Nome do Serviço:** `suporte-lojinha`
- **Região:** `southamerica-east1`
- **Projeto:** `suporte-7e68b`
- **URL:** https://suporte-lojinha-409489811769.southamerica-east1.run.app
- **Porta:** 8080
- **Memória:** 512Mi
- **CPU:** 1
- **Timeout:** 300s
- **Máx. Instâncias:** 10

---

## Segurança

- ✅ Secrets não são commitados no Git
- ✅ `.env.local` está no `.gitignore`
- ✅ `cloudbuild.yaml` deve usar Secret Manager (recomendado) ou placeholder
- ✅ Firebase Security Rules configuradas
- ✅ Cloud Run permite acesso não autenticado (público)

---

## Referências

- [Documentação Cloud Run](https://cloud.google.com/run/docs)
- [Documentação Cloud Build](https://cloud.google.com/build/docs)
- [Documentação Secret Manager](https://cloud.google.com/secret-manager/docs)
- [README.md](./README.md) - Documentação geral do projeto
- [SCRIPTS_DEPLOY.md](./SCRIPTS_DEPLOY.md) - Detalhes dos scripts de deploy

