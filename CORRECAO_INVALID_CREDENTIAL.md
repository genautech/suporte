# ✅ Correção - Erro auth/invalid-credential

**Data:** 2025-11-17  
**Status:** ✅ Código corrigido e imagem rebuildada

## 🔍 Problema Identificado

**Erro:** `auth/invalid-credential`  
**Causa:** O Firebase retorna `auth/invalid-credential` quando:
- Usuário não existe (às vezes ao invés de `auth/user-not-found`)
- Senha incorreta
- Credenciais inválidas

## 🔧 Correção Aplicada

### Código Atualizado
- `components/AdminLogin.tsx` agora trata `auth/invalid-credential` também
- Quando recebe `auth/invalid-credential`, tenta criar o usuário automaticamente
- Se criação falhar com `auth/email-already-in-use`, mostra mensagem específica

### Mudanças:
```typescript
// ANTES: Só tratava auth/user-not-found
if (authError.code === 'auth/user-not-found') {
  // tentar criar
}

// DEPOIS: Trata ambos os casos
if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
  // tentar criar usuário
}
```

## 🧪 Como Testar

1. **Acesse:** http://localhost:8080/admin
2. **Abra console do navegador** (F12)
3. **Tente fazer login:**
   - Email: `admin@yoobe.co`
   - Senha: `123456`
4. **Verifique logs no console:**
   - Deve aparecer: `[AdminLogin] Usuário não encontrado ou credenciais inválidas, tentando criar...`
   - Se criar com sucesso: `[AdminLogin] Usuário criado com sucesso!`
   - Se falhar: Verá mensagem de erro específica

## ⚠️ Se Ainda Não Funcionar

### Opção 1: Criar Usuário Manualmente (Recomendado)

1. **Acesse:** https://console.firebase.google.com/project/suporte-7e68b/authentication/users
2. **Clique em "Add user"**
3. **Preencha:**
   - Email: `admin@yoobe.co`
   - Password: `123456`
4. **Clique em "Add user"**
5. **Tente fazer login novamente**

### Opção 2: Verificar Email/Password está Habilitado

1. **Acesse:** https://console.firebase.google.com/project/suporte-7e68b/authentication/providers
2. **Verifique se Email/Password está Enabled**
3. **Se não estiver, habilite**

### Opção 3: Resetar Senha do Usuário Existente

Se o usuário já existe mas com senha diferente:

1. **Acesse:** https://console.firebase.google.com/project/suporte-7e68b/authentication/users
2. **Encontre `admin@yoobe.co`**
3. **Clique nos três pontos** ao lado do usuário
4. **Selecione "Reset password"**
5. **Defina nova senha:** `123456`
6. **Tente fazer login novamente**

## 📋 Status Atual

- ✅ Código atualizado para tratar `auth/invalid-credential`
- ✅ Imagem rebuildada com código atualizado
- ✅ Container rodando com nova imagem
- ✅ Logs detalhados no console

## 🔗 Links Úteis

- **Firebase Console:** https://console.firebase.google.com/project/suporte-7e68b
- **Authentication Users:** https://console.firebase.google.com/project/suporte-7e68b/authentication/users
- **Authentication Providers:** https://console.firebase.google.com/project/suporte-7e68b/authentication/providers

---

**Agora o código tenta criar o usuário automaticamente quando recebe `auth/invalid-credential`. Tente fazer login novamente e verifique o console para ver o que acontece!**

