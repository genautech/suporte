# 🚀 Instruções de Deploy - Cubbo Auth Proxy

## ⚠️ IMPORTANTE: Autenticação Necessária

Antes de fazer o deploy, você precisa:

1. **Autenticar no Google Cloud:**
   ```bash
   gcloud auth login
   ```

2. **Configurar o projeto:**
   ```bash
   gcloud config set project suporte-7e68b
   # ou
   gcloud config set project 409489811769
   ```

## 📋 Deploy Passo a Passo

### Opção 1: Deploy com Credenciais (Recomendado)

Se você já tem as credenciais da API Cubbo:

```bash
cd cubbo-auth-proxy

# Definir credenciais
export CUBBO_CLIENT_ID="seu_client_id_aqui"
export CUBBO_CLIENT_SECRET="seu_client_secret_aqui"

# Executar deploy
gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars CUBBO_CLIENT_ID="$CUBBO_CLIENT_ID",CUBBO_CLIENT_SECRET="$CUBBO_CLIENT_SECRET" \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10
```

### Opção 2: Deploy sem Credenciais (Depois você adiciona)

Se você ainda não tem as credenciais, pode fazer o deploy primeiro e adicionar depois:

```bash
cd cubbo-auth-proxy

gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60
```

Depois, quando tiver as credenciais, atualize:

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=seu_client_id,CUBBO_CLIENT_SECRET=seu_client_secret
```

### Opção 3: Usar o Script de Deploy

```bash
cd cubbo-auth-proxy

# Se você tem as credenciais
export CUBBO_CLIENT_ID="seu_client_id"
export CUBBO_CLIENT_SECRET="seu_client_secret"
./deploy.sh

# Ou passar como argumentos
./deploy.sh seu_client_id seu_client_secret
```

## ✅ Verificar Deploy

Após o deploy, verifique:

```bash
# Ver URL do serviço
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(status.url)"

# Ver logs
gcloud run services logs read cubbo-auth-proxy \
  --region southamerica-east1 \
  --limit 20

# Testar o serviço
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000"
```

## 🔧 Troubleshooting

### Erro: "You do not currently have an active account selected"
```bash
gcloud auth login
```

### Erro: "Permission denied"
Verifique se você tem permissões no projeto:
```bash
gcloud projects get-iam-policy suporte-7e68b
```

### Erro: "API not enabled"
Habilite a API do Cloud Run:
```bash
gcloud services enable run.googleapis.com
```

## 📝 Próximos Passos Após Deploy

1. ✅ Anotar a URL do serviço
2. ✅ Verificar se CORS está funcionando
3. ✅ Testar com o script: `node test-proxy.js`
4. ✅ Testar no frontend (http://localhost:3000)



