# 🔐 Especificação de Secrets e Credenciais

**Última Atualização:** 2025-11-05  
**Status:** ⚠️ ATENÇÃO - Este arquivo contém apenas TEMPLATES

## ⚠️ AVISO IMPORTANTE

**ESTE ARQUIVO NÃO CONTÉM VALORES REAIS DE SECRETS!**

Este documento serve apenas como **referência de estrutura** e **templates**. Valores reais estão protegidos e NÃO devem ser commitados no Git.

## 📋 Estrutura de Secrets

### Frontend (Build Time)

#### Template `.env.local` (Local Development)

```env
# Gemini API Key
VITE_GEMINI_API_KEY=sua_chave_api_aqui

# Postmark Proxy URL (opcional)
VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app
```

#### Cloud Run Build Variables

```bash
# Variável passada durante o build
VITE_GEMINI_API_KEY=chave_real_aqui
```

### Backend (Runtime)

#### Cubbo Auth Proxy - Cloud Run

**Serviço:** `cubbo-auth-proxy`  
**Região:** `southamerica-east1`

```bash
# Variáveis de ambiente no Cloud Run
CUBBO_CLIENT_ID=seu_client_id_aqui
CUBBO_CLIENT_SECRET=seu_client_secret_aqui
PORT=8080
```

#### Postmark Email Proxy - Cloud Run

**Serviço:** `postmark-email-proxy`  
**Região:** `southamerica-east1`  
**Server:** suporte-yoobe  
**Stream ID:** outbound  
**Tipo:** Transactional

```bash
# Variáveis de ambiente no Cloud Run (VALORES REAIS DE PRODUÇÃO)
POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4
FROM_EMAIL=atendimento@yoobe.co
PORT=8080
```

## 🔑 Onde Obter Credenciais

### Gemini API Key

1. Acesse: https://aistudio.google.com/apikey
2. Faça login com sua conta Google
3. Clique em "Create API Key"
4. Copie a chave gerada

### Cubbo API Credentials

1. Acesse: https://developers.cubbo.com/
2. Faça login na plataforma Cubbo
3. Acesse a seção de API Credentials
4. Copie `CLIENT_ID` e `CLIENT_SECRET`

### Postmark Token

**Token Atual:** `ee246569-f54b-4986-937a-9288b25377f4`

**Para obter/verificar:**
1. Acesse: https://account.postmarkapp.com/
2. Faça login
3. Vá em **Servers** > **suporte-yoobe**
4. Acesse **Server API** > **Server API tokens**
5. Token está listado: `ee246569-f54b-4986-937a-9288b25377f4`

**Email Remetente:**
- Email confirmado: `atendimento@yoobe.co`
- Este email está verificado no Postmark e deve ser usado como `FROM_EMAIL` no deploy

## 🛡️ Proteção de Secrets

### ❌ NUNCA fazer:
- Commitar valores reais no Git
- Compartilhar secrets em texto plano
- Armazenar secrets em código fonte
- Usar secrets em logs ou console.log

### ✅ SEMPRE fazer:
- Usar variáveis de ambiente
- Usar `.gitignore` para `.env.local`
- Usar Cloud Run Secrets (recomendado)
- Rotacionar secrets periodicamente

## 📂 Arquivos Relacionados

- `.env.example` - Template de variáveis (pode ser commitado)
- `.env.local` - Variáveis locais (NUNCA commitado)
- `.gitignore` - Deve incluir `.env.local` e `.env`

## 🔄 Processo de Atualização de Secrets

### Para Adicionar Novo Secret:

1. Adicione template neste arquivo
2. Adicione ao `.env.example` (sem valor real)
3. Configure no Cloud Run via `gcloud`
4. Documente onde obter o secret

### Para Rotacionar Secret:

1. Gere novo secret no serviço original
2. Atualize no Cloud Run:
   ```bash
   gcloud run services update SERVICE_NAME \
     --update-env-vars SECRET_NAME=new_value
   ```
3. Teste a aplicação
4. Remova o secret antigo após confirmação

## 📝 Checklist de Segurança

- [ ] `.env.local` está no `.gitignore`
- [ ] Secrets não estão hardcoded no código
- [ ] Secrets estão apenas em variáveis de ambiente
- [ ] Cloud Run usa variáveis de ambiente seguras
- [ ] Documentação não contém valores reais
- [ ] Backup de secrets em local seguro (opcional)

## 🔄 Changelog

### v1.0.0 (2025-11-05)
- Template inicial de secrets
- Documentação de onde obter credenciais
- Processo de atualização definido



