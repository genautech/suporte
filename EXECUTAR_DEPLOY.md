# 🚀 Executar Deploy do Cubbo Auth Proxy

## ⚠️ Autenticação Necessária

Antes de executar, você precisa autenticar no Google Cloud:

```bash
gcloud auth login
```

## 📋 Deploy Rápido

### 1. Autenticar (se necessário)
```bash
gcloud auth login
```

### 2. Configurar Projeto
```bash
gcloud config set project suporte-7e68b
```

### 3. Executar Deploy

**Opção A: Com credenciais Cubbo (recomendado)**

```bash
cd cubbo-auth-proxy

# Definir credenciais
export CUBBO_CLIENT_ID="seu_client_id_aqui"
export CUBBO_CLIENT_SECRET="seu_client_secret_aqui"

# Executar deploy
./deploy.sh
```

**Opção B: Deploy sem credenciais (adicionar depois)**

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
  --project suporte-7e68b
```

Depois, quando tiver as credenciais:

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=seu_client_id,CUBBO_CLIENT_SECRET=seu_client_secret \
  --project suporte-7e68b
```

## ✅ Verificar Deploy

```bash
# Ver URL do serviço
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(status.url)" \
  --project suporte-7e68b

# Ver logs
gcloud run services logs read cubbo-auth-proxy \
  --region southamerica-east1 \
  --limit 20 \
  --project suporte-7e68b
```

## 🧪 Testar Após Deploy

```bash
cd cubbo-auth-proxy

# Testar o proxy
node test-proxy.js

# Ou testar manualmente
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000" \
  -v
```



