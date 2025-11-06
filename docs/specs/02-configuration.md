# ⚙️ Especificação de Configuração

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve todas as configurações do projeto, incluindo variáveis de ambiente, build, e configurações de runtime.

## 🌍 Variáveis de Ambiente

### Frontend (Vite)

**Prefixo Obrigatório:** `VITE_` (para exposição no build)

#### Variáveis Necessárias

| Variável | Tipo | Obrigatória | Descrição | Onde Usar |
|----------|------|-------------|-----------|-----------|
| `VITE_GEMINI_API_KEY` | string | Sim (produção) | Chave da API Gemini | `geminiService.ts` |
| `VITE_POSTMARK_PROXY_URL` | string | Não | URL do proxy Postmark | `authService.ts`, `supportService.ts` |
| `VITE_AUTH_RESET_PROXY_URL` | string | Não | URL do Firebase Auth Reset Proxy | `authService.ts` |

#### Configuração no Vite

**Arquivo:** `vite.config.ts`

```typescript
envPrefix: ['VITE_'],
define: {
  'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
    env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''
  ),
  'import.meta.env.VITE_POSTMARK_PROXY_URL': JSON.stringify(
    env.VITE_POSTMARK_PROXY_URL || ''
  ),
  'import.meta.env.VITE_AUTH_RESET_PROXY_URL': JSON.stringify(
    env.VITE_AUTH_RESET_PROXY_URL || ''
  ),
  'import.meta.env.DEV': JSON.stringify(mode === 'development'),
  'import.meta.env.PROD': JSON.stringify(mode === 'production'),
  'import.meta.env.MODE': JSON.stringify(mode),
}
```

### Backend (Cloud Run)

#### Cubbo Auth Proxy

**Serviço:** `cubbo-auth-proxy`  
**Variáveis:**

| Variável | Tipo | Obrigatória | Descrição |
|----------|------|-------------|-----------|
| `CUBBO_CLIENT_ID` | string | Sim | Client ID da API Cubbo |
| `CUBBO_CLIENT_SECRET` | string | Sim | Client Secret da API Cubbo |
| `PORT` | number | Não | Porta do servidor (padrão: 8080) |

#### Postmark Email Proxy

**Serviço:** `postmark-email-proxy`  
**Variáveis:**

| Variável | Tipo | Obrigatória | Descrição |
|----------|------|-------------|-----------|
| `POSTMARK_SERVER_TOKEN` | string | Sim | Token do servidor Postmark |
| `FROM_EMAIL` | string | Sim | Email remetente verificado |
| `PORT` | number | Não | Porta do servidor (padrão: 8080) |

**Valores Atuais:**
- `POSTMARK_SERVER_TOKEN`: `ee246569-f54b-4986-937a-9288b25377f4`
- `FROM_EMAIL`: `atendimento@yoobe.co`

#### Firebase Auth Reset Proxy

**Serviço:** `firebase-auth-reset-proxy`  
**Variáveis:**

| Variável | Tipo | Obrigatória | Descrição |
|----------|------|-------------|-----------|
| `FIREBASE_SERVICE_ACCOUNT` | string | Sim | Service Account JSON (pode ser base64 encoded) |
| `PORT` | number | Não | Porta do servidor (padrão: 8080 no Cloud Run, 8081 local) |

**Nota:** O `FIREBASE_SERVICE_ACCOUNT` pode ser fornecido como:
- JSON string direto
- Base64 encoded string
- Caminho para arquivo (desenvolvimento local)

## 🔧 Configuração de Build

### Vite Config

**Arquivo:** `vite.config.ts`

```typescript
{
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react()],
  envPrefix: ['VITE_'],
  define: {
    'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(
      env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || ''
    ),
    'import.meta.env.VITE_POSTMARK_PROXY_URL': JSON.stringify(
      env.VITE_POSTMARK_PROXY_URL || ''
    ),
    'import.meta.env.VITE_AUTH_RESET_PROXY_URL': JSON.stringify(
      env.VITE_AUTH_RESET_PROXY_URL || ''
    ),
    'import.meta.env.DEV': JSON.stringify(mode === 'development'),
    'import.meta.env.PROD': JSON.stringify(mode === 'production'),
    'import.meta.env.MODE': JSON.stringify(mode),
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
}
```

### Build Process

1. **Desenvolvimento:**
   ```bash
   npm run dev
   ```
   - Porta: `3000`
   - Host: `0.0.0.0` (acessível externamente)

2. **Produção:**
   ```bash
   npm run build
   ```
   - Output: `dist/`
   - Variáveis com prefixo `VITE_` são incorporadas no build

## 🐳 Docker Configuration

### Multi-Stage Build

**Arquivo:** `Dockerfile`

#### Stage 1: Builder
- Base: `node:18-alpine`
- Instala dependências: `npm ci`
- Build: `npm run build`
- Variável de build: `VITE_GEMINI_API_KEY` (ARG) - **Obrigatória via cloudbuild.yaml**

#### Stage 2: Nginx
- Base: `nginx:alpine`
- Instala: `gettext` (para `envsubst`)
- Copia: `dist/` do builder
- Template: `nginx.conf.template`
- Porta: `8080` (variável `PORT` do Cloud Run)

### Cloud Build Configuration

**Arquivo:** `cloudbuild.yaml` ⚠️ **OBRIGATÓRIO PARA DEPLOY**

Este arquivo é necessário para passar variáveis de build como ARG para o Dockerfile. O Cloud Build não passa automaticamente variáveis de `--set-build-env-vars` como ARG.

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '--build-arg'
      - 'VITE_GEMINI_API_KEY=${_VITE_GEMINI_API_KEY}'
      - '-t'
      - 'gcr.io/$PROJECT_ID/suporte-lojinha:latest'
      - '.'
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/suporte-lojinha:latest']

substitutions:
  _VITE_GEMINI_API_KEY: 'SUA_CHAVE_AQUI'

images:
  - 'gcr.io/$PROJECT_ID/suporte-lojinha:latest'
```

**⚠️ IMPORTANTE:** 
- O arquivo `cloudbuild.yaml` **DEVE** existir na raiz do projeto
- A substituição `_VITE_GEMINI_API_KEY` **DEVE** conter a chave real da API Gemini
- Sem este arquivo, a variável não será incluída no build e o chatbot não funcionará

### NGINX Configuration

**Arquivo:** `nginx.conf.template`

```nginx
server {
    listen ${PORT};
    root /usr/share/nginx/html;
    index index.html;
    
    # Headers de segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # Assets estáticos
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Outros arquivos estáticos
    location ~* \.(?:ico|css|js|gif|jpe?g|png|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

## 📦 Package Configuration

**Arquivo:** `package.json`

### Scripts

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

### Dependencies Principais

- `react`: `^19.2.0`
- `react-dom`: `^19.2.0`
- `@google/genai`: `^1.28.0`
- `firebase`: `^12.5.0`

### DevDependencies

- `@vitejs/plugin-react`: `^5.0.0`
- `typescript`: `~5.8.2`
- `vite`: `^6.2.0`

## 🗂️ Estrutura de Diretórios

```
suporte/
├── components/          # Componentes React
├── services/           # Serviços (API calls, business logic)
├── data/               # Dados estáticos (seed data, configs)
├── scripts/            # Scripts utilitários
├── docs/               # Documentação
│   └── specs/          # Especificações técnicas (esta pasta)
├── cubbo-auth-proxy/   # Serviço proxy de autenticação Cubbo
├── postmark-email-proxy/ # Serviço proxy de email
├── firebase-auth-reset-proxy/ # Serviço proxy de reset de senha
├── dist/               # Build de produção (gerado)
├── .specs-lock/        # Arquivos protegidos/configurações críticas
├── firebase.ts         # Configuração Firebase
├── vite.config.ts      # Configuração Vite
├── nginx.conf.template # Template NGINX
├── Dockerfile          # Configuração Docker
└── package.json        # Dependências e scripts
```

## 🔒 Arquivos Protegidos

Estes arquivos **NUNCA** devem ser modificados sem atualizar as specs:

- `firebase.ts` - Configuração Firebase
- `vite.config.ts` - Configuração de build
- `Dockerfile` - Configuração Docker
- `.specs-lock/configs/*` - Backups de configuração

## ⚠️ Regras de Mudança

### ❌ NUNCA modificar sem:
1. Consultar esta spec
2. Criar backup em `.specs-lock/configs/`
3. Atualizar esta spec
4. Testar em ambiente de desenvolvimento

### ✅ SEMPRE fazer quando mudar configuração:
1. Atualizar esta spec
2. Atualizar data de "Última Atualização"
3. Documentar breaking changes
4. Notificar equipe (se aplicável)

## 🔄 Changelog

### v1.2.0 (2025-11-07)
- ✅ Adicionada configuração obrigatória do `cloudbuild.yaml`
- ✅ Documentado processo de build com Cloud Build
- ✅ Adicionado aviso sobre necessidade do cloudbuild.yaml para deploy
- ✅ Atualizada documentação de variáveis de build

### v1.1.0 (2025-11-06)
- ✅ Adicionada variável `VITE_AUTH_RESET_PROXY_URL`
- ✅ Atualizada configuração do Vite com novas variáveis
- ✅ Adicionada configuração do Firebase Auth Reset Proxy
- ✅ Atualizada configuração do NGINX com headers de segurança e gzip
- ✅ Atualizada estrutura de diretórios

### v1.0.0 (2025-11-05)
- Configuração inicial do Vite
- Configuração Docker multi-stage
- Variáveis de ambiente documentadas
- Estrutura de diretórios definida



