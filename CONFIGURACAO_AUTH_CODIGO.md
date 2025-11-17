# 🔐 Guia de Configuração - Autenticação por Código de 4 Dígitos

Este guia ajuda você a configurar o sistema de autenticação por código de 4 dígitos enviado por email.

## ✅ Checklist de Configuração

- [ ] 1. Configurar Email/Password no Firebase Console
- [ ] 2. Fazer deploy do Postmark Email Proxy (se ainda não feito)
- [ ] 3. Configurar variável de ambiente `VITE_POSTMARK_PROXY_URL`
- [ ] 4. Testar o fluxo completo de autenticação

---

## 1️⃣ Configurar Email/Password no Firebase Console

### Passo 1: Acessar Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **suporte-7e68b**

### Passo 2: Habilitar Email/Password Authentication

1. No menu lateral, clique em **Authentication**
2. Clique na aba **Sign-in method**
3. Na lista de provedores, encontre **Email/Password**
4. Clique no ícone de edição (ou em **Enable** se estiver desabilitado)
5. Na modal que abrir:
   - ✅ Marque **Enable** no campo "Email/Password"
   - ❌ Deixe **Email link (passwordless sign-in)** desabilitado (não precisamos mais)
   - Clique em **Save**

✅ **Status:** Email/Password habilitado

### Passo 3: Verificar Domínios Autorizados

1. Ainda em **Authentication**, clique na aba **Settings**
2. Role até a seção **Authorized domains**
3. Verifique se estão presentes:
   - `localhost` (já vem por padrão)
   - Seu domínio de produção (se aplicável)

**Para adicionar um domínio:**
- Clique em **Add domain**
- Digite apenas o hostname (sem http/https)
- Exemplo: `suporte-lojinha-409489811769.southamerica-east1.run.app`
- Clique em **Add**

✅ **Status:** Domínios autorizados configurados

---

## 2️⃣ Fazer Deploy do Postmark Email Proxy

### Pré-requisitos

- Conta no Postmark (https://postmarkapp.com/)
- Token do servidor Postmark
- Email verificado no Postmark (para usar como remetente)
- Google Cloud SDK instalado e configurado

### Passo 1: Fazer Deploy no Cloud Run

**Credenciais Atuais:**
- **Server API Token:** `ee246569-f54b-4986-937a-9288b25377f4`
- **Stream ID:** `outbound`
- **FROM_EMAIL:** `atendimento@yoobe.co` (confirmado e verificado no Postmark)

```bash
# Navegar até a pasta do proxy
cd postmark-email-proxy

# Opção A: Usar script de deploy (Recomendado)
chmod +x deploy.sh
./deploy.sh ee246569-f54b-4986-937a-9288b25377f4 atendimento@yoobe.co

# Opção B: Deploy manual
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co" \
  --project suporte-7e68b
```

### Passo 3: Anotar a URL Gerada

Após o deploy, você verá uma saída como:

```
Service [postmark-email-proxy] revision [postmark-email-proxy-xxxxx] has been deployed and is serving 100 percent of traffic.
Service URL: https://postmark-email-proxy-xxxxx.southamerica-east1.run.app
```

**Copie essa URL** - você precisará dela no próximo passo.

✅ **Status:** Postmark Email Proxy deployado

---

## 3️⃣ Configurar Variável de Ambiente VITE_POSTMARK_PROXY_URL

### Opção A: Arquivo .env.local (Desenvolvimento Local)

1. Na raiz do projeto, crie ou edite o arquivo `.env.local`:

```bash
# Arquivo: .env.local
VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-xxxxx.southamerica-east1.run.app
```

2. **Substitua** `https://postmark-email-proxy-xxxxx.southamerica-east1.run.app` pela URL real do seu proxy Postmark (obtida no passo anterior)

3. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

**Importante:** O arquivo `.env.local` já está no `.gitignore` e não será commitado.

### Opção B: Variável de Ambiente no Cloud Run (Produção)

Se você fizer deploy da aplicação no Cloud Run, configure a variável de ambiente:

```bash
gcloud run services update sua-app-service \
  --region southamerica-east1 \
  --set-env-vars VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-xxxxx.southamerica-east1.run.app
```

**Nota:** No Cloud Run, variáveis com prefixo `VITE_` são incorporadas no build durante o deploy.

✅ **Status:** Variável de ambiente configurada

---

## 4️⃣ Testar o Fluxo Completo de Autenticação

### Teste 1: Solicitar Código

1. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

2. Acesse: http://localhost:3000
3. Clique em "Acessar Portal do Cliente"
4. Digite um email válido (ex: seu_email@gmail.com)
5. Clique em "Enviar Código de Acesso"

**Verificações:**
- ✅ Não deve aparecer erro
- ✅ Deve mostrar mensagem "Código Enviado!"
- ✅ Deve aparecer campo para digitar código

### Teste 2: Verificar Email

1. Verifique sua caixa de entrada (e spam)
2. Você deve receber um email com:
   - Assunto: "Seu código de acesso - Portal de Suporte Loja Corporativa"
   - Código de 4 dígitos destacado
   - Instruções de uso

**Se não receber o email:**
- Verifique os logs do Cloud Run do Postmark proxy
- Verifique se o token do Postmark está correto
- Verifique se o email está verificado no Postmark

### Teste 3: Validar Código

1. Digite o código de 4 dígitos recebido por email
2. Clique em "Verificar e Acessar"

**Verificações:**
- ✅ Deve fazer login automaticamente
- ✅ Deve redirecionar para o dashboard do usuário
- ✅ Não deve aparecer erros no console

### Teste 4: Verificar Firestore

1. Acesse o Firebase Console
2. Vá em **Firestore Database**
3. Verifique a coleção `authCodes`:
   - Deve existir um documento com o código enviado
   - Campo `used` deve estar como `true` após uso
   - Campo `expiresAt` deve mostrar expiração de 5 minutos

### Teste 5: Verificar Firebase Auth

1. No Firebase Console, vá em **Authentication** > **Users**
2. Deve existir um usuário com o email usado no teste
3. O usuário deve ter sido criado automaticamente após validação do código

---

## 🔍 Troubleshooting

### Erro: "Falha ao enviar o código"

**Possíveis causas:**
1. URL do Postmark proxy incorreta
2. Proxy não está rodando no Cloud Run
3. Token do Postmark inválido
4. Email não verificado no Postmark

**Solução:**
- Verifique a URL em `.env.local`
- Verifique os logs do Cloud Run: `gcloud run services logs read postmark-email-proxy --region southamerica-east1`
- Verifique as credenciais do Postmark

### Erro: "Código inválido ou expirado"

**Possíveis causas:**
1. Código já foi usado
2. Código expirou (5 minutos)
3. Email digitado diferente do email que recebeu o código

**Solução:**
- Solicite um novo código
- Use o mesmo email que recebeu o código
- Verifique se não está usando um código antigo

### Erro: "Erro ao fazer login"

**Possíveis causas:**
1. Email/Password não habilitado no Firebase
2. Domínio não autorizado
3. Problema com criação de usuário

**Solução:**
- Verifique se Email/Password está habilitado no Firebase Console
- Verifique se o domínio está autorizado
- Verifique os logs do console do navegador

### Email não chega

**Verificações:**
1. Verifique a pasta de spam
2. Verifique os logs do Postmark proxy
3. Verifique se o email está verificado no Postmark
4. Teste com outro provedor de email (Gmail, Outlook, etc.)

---

## 📋 Verificação Final

Após completar todos os passos, você deve conseguir:

- ✅ Solicitar código de acesso por email
- ✅ Receber email com código de 4 dígitos
- ✅ Validar código e fazer login
- ✅ Ver usuário criado no Firebase Auth
- ✅ Ver código no Firestore (marcado como usado)

---

## 🎉 Pronto!

Se todos os testes passaram, seu sistema de autenticação por código está funcionando corretamente!

**Próximos passos sugeridos:**
- Testar com múltiplos emails
- Verificar expiração de códigos (aguardar 5 minutos)
- Testar reenvio de código
- Configurar regras de segurança do Firestore (opcional)



