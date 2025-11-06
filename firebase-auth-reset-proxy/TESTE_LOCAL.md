# 🧪 Teste Local - Firebase Auth Reset Proxy

Você pode testar o serviço de reset de senha localmente antes de fazer deploy!

## 📋 Pré-requisitos

1. Node.js 18+ instalado
2. Service Account do Firebase (chave JSON)
3. Projeto Firebase configurado

## 🚀 Passo a Passo

### 1. Obter Service Account Key

```bash
# Se ainda não tem, criar service account
gcloud iam service-accounts create firebase-admin \
    --display-name="Firebase Admin Service Account" \
    --project=suporte-7e68b

# Dar permissões
gcloud projects add-iam-policy-binding suporte-7e68b \
    --member="serviceAccount:firebase-admin@suporte-7e68b.iam.gserviceaccount.com" \
    --role="roles/firebase.admin"

# Baixar chave JSON
gcloud iam service-accounts keys create firebase-admin-key.json \
    --iam-account=firebase-admin@suporte-7e68b.iam.gserviceaccount.com \
    --project=suporte-7e68b
```

### 2. Instalar Dependências

```bash
cd firebase-auth-reset-proxy
npm install
```

### 3. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `firebase-auth-reset-proxy`:

```bash
# .env
FIREBASE_SERVICE_ACCOUNT=$(cat ../firebase-admin-key.json)
PORT=8081
```

Ou exporte manualmente:

```bash
export FIREBASE_SERVICE_ACCOUNT=$(cat firebase-admin-key.json)
export PORT=8081
```

### 4. Ajustar Código para Ler Service Account

O código atual espera `FIREBASE_SERVICE_ACCOUNT` como JSON string. Vamos criar um script de teste que lê do arquivo:

```bash
# Criar script de teste
cat > test-local.js << 'EOF'
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Ler service account do arquivo ou env var
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_FILE) {
  const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_FILE);
  serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (e) {
    // Se não for JSON, tentar ler como caminho de arquivo
    const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT);
    serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  }
} else {
  // Tentar arquivo padrão
  const defaultPath = path.resolve(__dirname, '../firebase-admin-key.json');
  if (fs.existsSync(defaultPath)) {
    serviceAccount = JSON.parse(fs.readFileSync(defaultPath, 'utf8'));
  } else {
    console.error('❌ Service Account não encontrado!');
    console.error('Configure FIREBASE_SERVICE_ACCOUNT ou FIREBASE_SERVICE_ACCOUNT_FILE');
    process.exit(1);
  }
}

// Inicializar Firebase Admin
const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Iniciar servidor
require('./index.js');
EOF
```

### 5. Rodar Servidor Local

```bash
# Opção 1: Usar script de teste
node test-local.js

# Opção 2: Configurar env e rodar direto
export FIREBASE_SERVICE_ACCOUNT=$(cat ../firebase-admin-key.json | jq -c .)
node index.js
```

O servidor deve iniciar em `http://localhost:8081`

### 6. Configurar Frontend para Usar Local

**Não precisa fazer nada!** O código já está configurado automaticamente:

- Em desenvolvimento (`npm run dev`), usa `http://localhost:8081`
- Em produção, usa a URL do Cloud Run

O frontend pode estar rodando em qualquer porta (3000, 5173, etc.) - o importante é que o backend esteja em `localhost:8081`.

Se quiser forçar uma URL específica, adicione no `.env` do projeto principal:

```bash
VITE_AUTH_RESET_PROXY_URL=http://localhost:8081
```

### 7. Testar

```bash
# Em outro terminal, testar o endpoint
curl -X POST http://localhost:8081/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teste@exemplo.com",
    "code": "1234"
  }'
```

## 🔧 Alternativa: Usar Default Credentials (GCloud)

Se você já está autenticado no gcloud:

```bash
# Autenticar
gcloud auth application-default login

# Rodar sem service account (usa default credentials)
unset FIREBASE_SERVICE_ACCOUNT
node index.js
```

## ✅ Checklist de Teste

- [ ] Service Account key baixado OU `gcloud auth application-default login` executado
- [ ] Dependências instaladas (`npm install` na pasta `firebase-auth-reset-proxy`)
- [ ] Servidor backend rodando em `localhost:8081` (`npm run dev`)
- [ ] Frontend rodando em qualquer porta (ex: `localhost:3000`)
- [ ] Teste de reset de senha funcionando

**Nota:** O frontend pode estar em qualquer porta (3000, 5173, etc.). O importante é que o backend esteja em `localhost:8081`.

## 🐛 Troubleshooting

### Erro: "Service Account não encontrado"
- Verifique se o arquivo `firebase-admin-key.json` existe
- Ou configure `FIREBASE_SERVICE_ACCOUNT` com o conteúdo JSON

### Erro: "Permission denied"
- Verifique se o service account tem permissões de Firebase Admin
- Verifique se a chave não expirou

### Erro: "Cannot find module"
- Execute `npm install` na pasta `firebase-auth-reset-proxy`

### CORS Error no Frontend
- O código já tem `cors()` habilitado
- Se ainda der erro, verifique se o servidor está rodando na porta correta

## 📝 Notas

- O servidor local roda na porta `8081` para não conflitar com outros serviços
- Em produção, use a porta padrão `8080` ou a definida pelo Cloud Run
- O código de reset funciona igual em local e produção

