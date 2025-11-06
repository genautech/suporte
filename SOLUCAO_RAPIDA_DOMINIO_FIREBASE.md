# 🚀 Solução Rápida - Erro de Domínio Não Autorizado

## Erro Atual
```
Firebase: Domain not allowlisted by project (auth/unauthorized-continue-uri)
```

## ✅ Solução em 3 Passos

### Passo 1: Identificar o Domínio Atual

O código agora mostra o domínio atual no erro. Verifique a mensagem de erro que aparecerá.

**Domínios comuns:**
- **Desenvolvimento:** `localhost`
- **Produção Cloud Run:** `suporte-lojinha-409489811769.southamerica-east1.run.app`

### Passo 2: Adicionar Domínio no Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto: **suporte-7e68b**
3. Vá em: **Authentication** → **Settings** (ícone de engrenagem)
4. Role até: **Authorized domains**
5. Clique em: **Add domain**
6. Digite o domínio (SEM http/https):
   ```
   suporte-lojinha-409489811769.southamerica-east1.run.app
   ```
7. Clique em: **Add**

### Passo 3: Testar Novamente

1. Recarregue a página
2. Tente fazer login com e-mail novamente
3. Deve funcionar! ✅

## 📋 Lista de Domínios que Devem Estar Autorizados

Verifique se estes domínios estão na lista:

- ✅ `localhost` (desenvolvimento)
- ✅ `suporte-7e68b.firebaseapp.com` (Firebase Hosting)
- ✅ `suporte-7e68b.web.app` (Firebase Hosting alternativo)
- ⚠️ `suporte-lojinha-409489811769.southamerica-east1.run.app` (Cloud Run - **ADICIONAR**)

## 🔍 Como Verificar se o Domínio Está Autorizado

1. No Firebase Console: **Authentication** → **Settings** → **Authorized domains**
2. Procure na lista pelo domínio
3. Se não estiver, adicione usando os passos acima

## ⚠️ Importante

- Digite apenas o **hostname** (sem `http://` ou `https://`)
- Não precisa de barras `/` no final
- Pode levar alguns segundos para propagar

## 🎯 Resultado Esperado

Após adicionar o domínio:
- ✅ O erro `auth/unauthorized-continue-uri` desaparece
- ✅ O e-mail de login é enviado com sucesso
- ✅ O link de autenticação funciona corretamente

## 💡 Dica

Se você rodar a aplicação em múltiplos ambientes (localhost, Cloud Run, domínio customizado), adicione todos os domínios na lista de autorizados.



