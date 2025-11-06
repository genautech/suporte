# Guia de Configuração do Projeto Suporte Lojinha Prio

## Pré-requisitos

- Node.js 18+ instalado
- Conta Google Cloud Platform com Cloud Run habilitado
- Chave da API Gemini (obtenha em https://aistudio.google.com/apikey)
- Firebase configurado (já está no projeto)

## Configuração Local

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto com:

```env
GEMINI_API_KEY=sua_chave_api_aqui
```

**Nota:** Para desenvolvimento local, você pode usar `.env.local`. Este arquivo está no `.gitignore` e não será commitado.

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## Configuração Cloud Run

### Serviços Necessários

O projeto usa dois serviços no Cloud Run:

1. **cubbo-auth-proxy** - Proxy de autenticação para API Cubbo
2. **postmark-email-proxy** - Proxy para envio de emails via Postmark

### Deploy do Cubbo Auth Proxy

1. Navegue até a pasta do proxy:
```bash
cd cubbo-auth-proxy
```

2. Faça o deploy no Cloud Run:
```bash
gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars CUBBO_CLIENT_ID=seu_client_id,CUBBO_CLIENT_SECRET=seu_client_secret
```

3. Anote a URL gerada (ex: `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`)

### Deploy do Postmark Email Proxy

1. Navegue até a pasta do proxy:
```bash
cd postmark-email-proxy
```

2. Faça o deploy no Cloud Run:
```bash
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co"
```

3. Anote a URL gerada

### Atualizar URLs no Código

Após fazer o deploy dos proxies, atualize as URLs em `services/supportService.ts`:

- Linha 57: `CLOUD_FUNCTION_URL` - URL do cubbo-auth-proxy
- Linha 214: `EMAIL_PROXY_URL` - URL do postmark-email-proxy

## Build e Deploy da Aplicação Principal

### 1. Build da Aplicação

```bash
npm run build
```

Isso criará a pasta `dist/` com os arquivos estáticos.

### 2. Deploy no Cloud Run

O Dockerfile está configurado para usar o template do nginx. Para fazer o deploy:

```bash
gcloud run deploy suporte-lojinha \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080
```

**Nota:** O Cloud Run injetará automaticamente a variável `PORT` no container.

## Estrutura do Projeto

```
suporte/
├── components/          # Componentes React
├── services/           # Serviços (Firebase, Gemini, Support)
├── cubbo-auth-proxy/   # Proxy de autenticação Cubbo
├── postmark-email-proxy/ # Proxy de email Postmark
├── firebase.ts         # Configuração Firebase
├── vite.config.ts      # Configuração Vite
├── Dockerfile          # Docker para Cloud Run
└── nginx.conf.template # Template do nginx
```

## Verificações Importantes

### ✅ Firebase
- [x] Configuração Firebase já está em `firebase.ts`
- [x] Firestore Database deve estar criado no Firebase Console
- [x] Authentication deve estar habilitado no Firebase Console

### ✅ Variáveis de Ambiente
- [ ] GEMINI_API_KEY configurada em `.env.local`
- [ ] URLs dos proxies atualizadas em `supportService.ts`

### ✅ Cloud Run
- [ ] Cubbo Auth Proxy deployado e funcionando
- [ ] Postmark Email Proxy deployado e funcionando
- [ ] Variáveis de ambiente configuradas nos serviços Cloud Run

### ✅ Banco de Dados
- [ ] Firestore Collections criadas:
  - `tickets`
  - `apiConfigs`
  - `knowledgeBase`

## Troubleshooting

### Erro: "GEMINI_API_KEY environment variable not set"
- Verifique se o arquivo `.env.local` existe e contém `GEMINI_API_KEY=...`
- No Vite, variáveis devem começar com `VITE_` ou estar no `envPrefix` configurado

### Erro: "Falha na comunicação com o proxy"
- Verifique se a URL do proxy está correta em `supportService.ts`
- Verifique se o serviço Cloud Run está rodando e acessível
- Verifique as variáveis de ambiente no Cloud Run (CUBBO_CLIENT_ID, CUBBO_CLIENT_SECRET)

### Erro no build Docker
- Certifique-se de executar `npm run build` antes do deploy
- Verifique se a pasta `dist/` foi criada após o build



