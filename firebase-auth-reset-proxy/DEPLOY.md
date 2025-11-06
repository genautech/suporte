# Firebase Auth Reset Proxy - Guia de Deploy

Este serviço permite resetar senhas de usuários Firebase usando Admin SDK quando um código de autenticação válido é fornecido.

## 📋 Pré-requisitos

1. Google Cloud SDK instalado e configurado
2. Projeto Firebase configurado
3. Service Account do Firebase com permissões de Admin

## 🚀 Deploy no Cloud Run

### Passo 1: Criar Service Account (se ainda não existir)

```bash
# Criar service account
gcloud iam service-accounts create firebase-admin \
    --display-name="Firebase Admin Service Account" \
    --project=suporte-7e68b

# Dar permissões de Firebase Admin
gcloud projects add-iam-policy-binding suporte-7e68b \
    --member="serviceAccount:firebase-admin@suporte-7e68b.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"
```

### Passo 2: Obter Chave do Service Account

```bash
# Criar chave JSON
gcloud iam service-accounts keys create firebase-admin-key.json \
    --iam-account=firebase-admin@suporte-7e68b.iam.gserviceaccount.com \
    --project=suporte-7e68b

# Converter para base64 para usar como variável de ambiente
cat firebase-admin-key.json | base64
```

### Passo 3: Fazer Deploy

```bash
cd firebase-auth-reset-proxy

# Build e deploy
gcloud run deploy firebase-auth-reset-proxy \
    --source . \
    --region southamerica-east1 \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="FIREBASE_SERVICE_ACCOUNT=$(cat ../firebase-admin-key.json | base64)" \
    --project suporte-7e68b
```

### Passo 4: Configurar Variável de Ambiente no Frontend

O código já está configurado para usar a URL de produção automaticamente. Se quiser sobrescrever, adicione ao `.env`:

```bash
VITE_AUTH_RESET_PROXY_URL=https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app
```

**Nota:** A URL de produção já está hardcoded no código como fallback, então não é necessário configurar a variável de ambiente.

## 🔧 Configuração Alternativa (Usando Default Credentials)

Se preferir usar default credentials do Cloud Run (mais seguro):

1. Remova a variável `FIREBASE_SERVICE_ACCOUNT` do deploy
2. O código tentará usar default credentials automaticamente
3. Certifique-se de que o Cloud Run tem permissões de Firebase Admin

## ✅ Teste

```bash
curl -X POST https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "code": "1234"
  }'
```

## 📝 Notas

- O serviço valida o código no Firestore antes de resetar a senha
- Se o usuário não existir, cria automaticamente
- A senha é resetada para a senha determinística padrão
- O código é marcado como usado após reset bem-sucedido

