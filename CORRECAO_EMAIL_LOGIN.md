# Correção - Erro ao Enviar E-mail de Login

## Problema

Ao tentar fazer login com e-mail, aparece o erro:
```
Falha ao enviar o e-mail. Verifique o endereço e tente novamente.
```

## Possíveis Causas

1. **Email Link Authentication não está habilitado no Firebase**
2. **Domínio não autorizado no Firebase**
3. **Quota de e-mails excedida**
4. **Configuração incorreta do actionCodeSettings**

## Verificações no Firebase Console

### 1. Habilitar Email Link Authentication

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione o projeto: **suporte-7e68b**
3. Vá em **Authentication** > **Sign-in method**
4. Procure por **Email/Password** ou **Email Link (passwordless sign-in)**
5. Clique em **Enable** se não estiver habilitado
6. Se estiver usando **Email Link (passwordless)**:
   - Certifique-se de que está habilitado
   - Verifique se o domínio de destino está correto

### 2. Verificar Domínios Autorizados ⚠️ **CRÍTICO**

**Este é o erro mais comum!** O Firebase precisa ter o domínio autorizado.

1. No Firebase Console, vá em **Authentication** > **Settings**
2. Role até a seção **Authorized domains**
3. **IMPORTANTE:** Verifique se o domínio atual está na lista:
   - Para desenvolvimento: `localhost` (já vem por padrão)
   - Para produção: o domínio onde a aplicação está rodando
     - Exemplo: `suporte-lojinha-409489811769.southamerica-east1.run.app`
     - Ou seu domínio customizado se tiver configurado

**Para adicionar um domínio:**
- Clique em **Add domain**
- Digite apenas o **hostname** (sem http/https)
  - ✅ Correto: `suporte-lojinha-409489811769.southamerica-east1.run.app`
  - ❌ Errado: `https://suporte-lojinha-409489811769.southamerica-east1.run.app`
- Clique em **Add**

**Domínios que devem estar autorizados:**
- `localhost` (desenvolvimento)
- `suporte-7e68b.firebaseapp.com` (Firebase Hosting)
- `suporte-7e68b.web.app` (Firebase Hosting alternativo)
- `suporte-lojinha-409489811769.southamerica-east1.run.app` (Cloud Run - **ADICIONAR SE NECESSÁRIO**)
- Qualquer outro domínio onde a aplicação será executada

### 3. Verificar Quotas

Se você estiver no plano **Spark (gratuito)**, verifique:
- Limite de e-mails por dia
- Limite de requisições por minuto

**Se exceder a quota:**
- Aguarde até o próximo período de cobrança
- Ou faça upgrade para o plano Blaze (pay-as-you-go)

### 4. Verificar Configuração do Código

O código atual está configurado assim:

```typescript
const actionCodeSettings = {
    url: window.location.origin === 'http://localhost:3000' 
        ? 'https://suporte-lojinha-409489811769.southamerica-east1.run.app'
        : window.location.origin,
    handleCodeInApp: true,
};
```

**Verifique:**
- A URL de destino está correta?
- O domínio da URL está autorizado no Firebase?
- `handleCodeInApp: true` está correto para sua necessidade?

## Correções Implementadas

✅ **Uso de `window.location.origin`** - Agora sempre usa a origem atual, funcionando em qualquer ambiente

✅ **Melhor tratamento de erros** - Agora mostra mensagens mais específicas:
- `auth/unauthorized-continue-uri` - **DOMÍNIO NÃO AUTORIZADO** (erro mais comum)
- `auth/invalid-email` - E-mail inválido
- `auth/user-disabled` - Conta desativada
- `auth/quota-exceeded` - Limite excedido
- `auth/operation-not-allowed` - Método não habilitado
- `auth/too-many-requests` - Muitas tentativas

✅ **Logs detalhados** - Console agora mostra código, mensagem e domínio atual

## Como Testar

1. Abra o console do navegador (F12)
2. Tente fazer login com e-mail
3. Verifique a mensagem de erro específica no console
4. Use a mensagem para identificar o problema exato

## Próximos Passos

1. ✅ Verificar no Firebase Console se Email Link está habilitado
2. ✅ Verificar se os domínios estão autorizados
3. ✅ Verificar quotas do Firebase
4. ✅ Testar novamente após as correções

## Nota sobre o Proxy Postmark

O proxy do Postmark (`postmark-email-proxy`) é usado para enviar e-mails de resposta aos tickets, **não** para e-mails de login. Os e-mails de login são enviados diretamente pelo Firebase Authentication.

Se você quiser usar o Postmark para e-mails de login também, seria necessário:
1. Criar um serviço customizado de autenticação
2. Ou usar Firebase Functions para enviar e-mails via Postmark

Mas o método atual (Firebase Email Link) é mais simples e recomendado.

