# Configuração do Firebase Authentication

## Sistema de Autenticação

O sistema utiliza autenticação por código de 4 dígitos enviado por email. O código é gerado automaticamente e enviado via Postmark, sendo válido por 5 minutos.

## Configuração Firebase

### 1. Habilitar Email/Password Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto `suporte-7e68b`
3. Vá em **Authentication** > **Sign-in method**
4. Clique em **Email/Password** na lista de provedores
5. Clique em **Enable** para habilitar
6. Clique em **Save**

**Nota:** O sistema usa Email/Password para criar contas automaticamente após validação do código. A senha é gerada internamente e o usuário não precisa conhecê-la.

### 2. Configurar Domínios Autorizados

1. No Firebase Console, vá em **Authentication** > **Settings**
2. Role até a seção **Authorized domains**
3. Certifique-se de que os seguintes domínios estão na lista:
   - `localhost` (para desenvolvimento)
   - Seu domínio de produção (ex: `seuapp.com`)
   - Qualquer outro domínio onde a aplicação será executada

**Para adicionar um domínio:**
- Clique em **Add domain**
- Digite apenas o **hostname** (sem http/https)
  - ✅ Correto: `suporte-lojinha-409489811769.southamerica-east1.run.app`
  - ❌ Errado: `https://suporte-lojinha-409489811769.southamerica-east1.run.app`
- Clique em **Add**

### 3. Configurar Firestore

O sistema utiliza a coleção `authCodes` no Firestore para armazenar códigos temporários.

**Regras de Segurança Recomendadas:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /authCodes/{codeId} {
      // Permitir criação de códigos para qualquer email
      allow create: if request.resource.data.email is string;
      
      // Permitir leitura apenas do próprio código
      allow read: if request.resource.data.email == request.auth.token.email;
      
      // Permitir atualização apenas para marcar como usado
      allow update: if request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['used']);
    }
  }
}
```

### 4. Configurar Postmark Email Proxy

O sistema envia emails através de um proxy Postmark no Cloud Run.

**Variáveis de Ambiente Necessárias:**
- `VITE_POSTMARK_PROXY_URL` - URL do proxy Postmark no Cloud Run

**Deploy do Proxy:**
```bash
cd postmark-email-proxy
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co"
```

### 5. Verificar Configuração do App

1. No Firebase Console, vá em **Project Settings** (ícone de engrenagem)
2. Role até **Your apps**
3. Verifique se o **App ID** e **API Key** estão corretos
4. Confirme que o arquivo `firebase.ts` está usando as credenciais corretas

## Fluxo de Autenticação

1. **Usuário solicita código:**
   - Digita email no formulário de login
   - Sistema gera código de 4 dígitos (1000-9999)
   - Código salvo no Firestore com expiração de 5 minutos
   - Email enviado via Postmark com código

2. **Usuário verifica código:**
   - Digita código de 4 dígitos recebido por email
   - Sistema valida código no Firestore
   - Verifica expiração e se não foi usado
   - Marca código como usado

3. **Autenticação Firebase:**
   - Sistema tenta fazer login com email e senha temporária
   - Se usuário não existe, cria automaticamente
   - Autenticação realizada via Firebase Auth
   - Usuário redirecionado para dashboard

## Troubleshooting

### Código não chega por email

1. Verifique se o Postmark proxy está configurado corretamente
2. Verifique se a variável `VITE_POSTMARK_PROXY_URL` está definida
3. Verifique os logs do Cloud Run para erros
4. Verifique se o email não foi para spam

### Código inválido ou expirado

- Códigos expiram em 5 minutos
- Cada código só pode ser usado uma vez
- Ao solicitar novo código, o anterior é invalidado

### Erro ao criar usuário

1. Verifique se Email/Password está habilitado no Firebase
2. Verifique se o domínio está autorizado
3. Verifique os logs do console do navegador

## Notas Importantes

- **Expiração:** Códigos expiram em 5 minutos
- **Segurança:** Códigos são descartados após uso
- **Email:** Emails são enviados via Postmark proxy
- **Firebase Auth:** Usuários são criados automaticamente se não existirem
- **Senha:** Senha é gerada internamente e usuário não precisa conhecê-la

## Verificação Rápida

Depois de seguir os passos acima:

1. Recarregue a aplicação
2. Tente fazer login com email
3. Verifique se recebe o código por email
4. Digite o código e verifique se faz login com sucesso
5. Se houver erros, verifique o console do navegador para mais detalhes
