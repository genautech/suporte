# 🚀 Instruções para Criar Usuário Admin

**Problema:** Não consegue fazer login com `admin@yoobe.co` / `123456`

## ✅ Solução Mais Rápida (Recomendada)

### Criar Manualmente no Firebase Console

1. **Acesse:** https://console.firebase.google.com/project/suporte-7e68b/authentication/users

2. **Clique em "Add user"** (botão no topo direito)

3. **Preencha:**
   - **Email:** `admin@yoobe.co`
   - **Password:** `123456`
   - **Deixe "Send email verification" DESMARCADO**

4. **Clique em "Add user"**

5. **Tente fazer login novamente** em http://localhost:8080/admin

**Tempo estimado:** 30 segundos ⚡

---

## 🔧 Verificações Antes de Criar

### 1. Email/Password está Habilitado?

**URL:** https://console.firebase.google.com/project/suporte-7e68b/authentication/providers

- Verifique se **Email/Password** está **Enabled**
- Se não estiver:
  1. Clique em **Email/Password**
  2. Clique em **Enable**
  3. Clique em **Save**

### 2. Domínio Autorizado?

**URL:** https://console.firebase.google.com/project/suporte-7e68b/authentication/settings

- Verifique se `localhost` está em **Authorized domains**
- Se não estiver:
  1. Clique em **Add domain**
  2. Digite: `localhost`
  3. Clique em **Add**

---

## 🔧 Alternativa: Script Node.js

Se tiver acesso ao Firebase Admin SDK:

```bash
# 1. Autenticar no gcloud
gcloud auth application-default login

# 2. Executar script
node criar-admin-firebase.js
```

O script criará ou atualizará o usuário `admin@yoobe.co` com senha `123456`.

---

## 📋 Após Criar o Usuário

1. **Acesse:** http://localhost:8080/admin
2. **Faça login:**
   - Email: `admin@yoobe.co`
   - Senha: `123456`
3. **Deve funcionar!** ✅

---

## 🐛 Se Ainda Não Funcionar

### Verifique o Console do Navegador (F12)

Procure por mensagens:
- `[AdminLogin] Tentando fazer login...`
- `[AdminLogin] Erro no login: [código]`

### Erros Comuns:

**`auth/operation-not-allowed`**
- Email/Password não está habilitado
- **Solução:** Habilitar no Firebase Console

**`auth/invalid-credential`**
- Usuário não existe ou senha incorreta
- **Solução:** Criar usuário no Firebase Console

**`auth/user-not-found`**
- Usuário não existe
- **Solução:** Criar usuário no Firebase Console

---

## 🔗 Links Úteis

- **Criar Usuário:** https://console.firebase.google.com/project/suporte-7e68b/authentication/users
- **Habilitar Email/Password:** https://console.firebase.google.com/project/suporte-7e68b/authentication/providers
- **Configurações:** https://console.firebase.google.com/project/suporte-7e68b/authentication/settings

---

**A solução mais rápida é criar manualmente no Firebase Console!** ⚡

