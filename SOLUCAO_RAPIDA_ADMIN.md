# 🚀 Solução Rápida - Criar Usuário Admin

**Problema:** Não consegue fazer login com `admin@yoobe.co`

## ✅ Solução Mais Rápida: Criar Manualmente no Firebase Console

### Passo a Passo:

1. **Acesse o Firebase Console:**
   https://console.firebase.google.com/project/suporte-7e68b/authentication/users

2. **Clique em "Add user"** (botão no topo)

3. **Preencha:**
   - **Email:** `admin@yoobe.co`
   - **Password:** `123456`
   - **Deixe "Send email verification" DESMARCADO**

4. **Clique em "Add user"**

5. **Tente fazer login novamente** em http://localhost:8080/admin

## ⚠️ Verificações Importantes

### 1. Email/Password está Habilitado?

**URL:** https://console.firebase.google.com/project/suporte-7e68b/authentication/providers

- Verifique se **Email/Password** está **Enabled**
- Se não estiver, clique e habilite

### 2. Domínio Autorizado?

**URL:** https://console.firebase.google.com/project/suporte-7e68b/authentication/settings

- Verifique se `localhost` está em **Authorized domains**
- Se não estiver, adicione

## 🔧 Alternativa: Usar Script Node.js

Se tiver acesso ao Firebase Admin SDK:

```bash
# Instalar dependências (se necessário)
npm install firebase-admin

# Autenticar no gcloud
gcloud auth application-default login

# Executar script
node criar-admin-firebase.js
```

## 📋 Status Atual

- ✅ Código atualizado com melhor tratamento de erros
- ✅ Imagem rebuildada com código atualizado
- ✅ Container rodando em http://localhost:8080
- ⚠️ **AÇÃO NECESSÁRIA:** Criar usuário no Firebase Console

## 🎯 Próximo Passo

**Crie o usuário manualmente no Firebase Console** (solução mais rápida e garantida):

1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/users
2. Clique em "Add user"
3. Email: `admin@yoobe.co`
4. Password: `123456`
5. Clique em "Add user"
6. Tente fazer login novamente

---

**Esta é a solução mais rápida e garantida!** O código agora tem melhor tratamento de erros, mas criar o usuário manualmente resolve o problema imediatamente.

