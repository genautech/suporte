# 🔧 Troubleshooting - Login Admin não funciona

## Problema
Não consegue fazer login com `admin@yoobe.co` / `123456`

## Possíveis Causas e Soluções

### 1. ⚠️ Email/Password não está habilitado no Firebase Auth

**Verificação:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/providers
2. Verifique se **Email/Password** está habilitado
3. Se não estiver, clique em **Email/Password** e depois em **Enable**

**Solução:**
- Habilitar Email/Password no Firebase Console
- Aguardar alguns segundos para propagação
- Tentar login novamente

### 2. ⚠️ Domínio não autorizado

**Verificação:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/settings
2. Role até **Authorized domains**
3. Verifique se `localhost` está na lista

**Solução:**
- Se `localhost` não estiver, adicione manualmente
- Para produção, adicione o domínio do Cloud Run se necessário

### 3. ⚠️ Usuário não existe no Firebase Auth

**Verificação:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/users
2. Procure por `admin@yoobe.co`
3. Se não existir, o código tenta criar automaticamente

**Solução Manual (se criação automática falhar):**
1. No Firebase Console, vá em **Authentication** > **Users**
2. Clique em **Add user**
3. Email: `admin@yoobe.co`
4. Password: `123456`
5. Clique em **Add user**

### 4. ⚠️ Senha muito fraca

**Problema:** Firebase pode rejeitar senhas muito simples

**Solução:**
- Se receber erro "weak-password", use uma senha mais forte temporariamente
- Ou desabilite a política de senha forte no Firebase (não recomendado)

### 5. ⚠️ Código não atualizado na imagem Docker

**Problema:** A imagem Docker pode ter sido buildada antes das correções

**Solução:**
```bash
# Rebuildar imagem com código atualizado
./rebuild-image-with-gemini.sh AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw

# Parar container antigo
docker stop suporte-lojinha-gemini
docker rm suporte-lojinha-gemini

# Executar nova imagem
docker run -d --name suporte-lojinha-gemini -p 8080:8080 -e PORT=8080 suporte-lojinha:local-latest
```

## 🔍 Como Diagnosticar

### 1. Verificar Console do Navegador (F12)
- Abra DevTools (F12)
- Vá na aba **Console**
- Tente fazer login
- Procure por mensagens começando com `[AdminLogin]`
- Anote qualquer erro que aparecer

### 2. Verificar Erros Comuns

**Erro: "auth/operation-not-allowed"**
- Email/Password não está habilitado no Firebase
- Solução: Habilitar no Firebase Console

**Erro: "auth/user-not-found"**
- Usuário não existe (código tenta criar automaticamente)
- Se criação falhar, criar manualmente no Firebase Console

**Erro: "auth/wrong-password"**
- Senha incorreta
- Verificar se está usando `123456`

**Erro: "auth/weak-password"**
- Senha muito fraca
- Criar usuário manualmente no Firebase com senha mais forte

**Erro: "auth/too-many-requests"**
- Muitas tentativas de login
- Aguardar alguns minutos

## ✅ Checklist de Verificação

- [ ] Email/Password está habilitado no Firebase Auth
- [ ] Domínio `localhost` está autorizado
- [ ] Tentou criar usuário manualmente no Firebase Console
- [ ] Verificou console do navegador para erros
- [ ] Rebuildou imagem Docker com código atualizado
- [ ] Limpou cache do navegador (Ctrl+Shift+R ou Cmd+Shift+R)

## 🚀 Solução Rápida

### Opção 1: Criar usuário manualmente (Mais rápido)

1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/authentication/users
2. Clique em **Add user**
3. Email: `admin@yoobe.co`
4. Password: `123456`
5. Clique em **Add user**
6. Tente fazer login novamente

### Opção 2: Verificar configurações Firebase

1. Verificar se Email/Password está habilitado
2. Verificar se localhost está autorizado
3. Tentar login novamente

### Opção 3: Usar código fonte local (Para desenvolvimento)

```bash
# Criar .env.local
echo "VITE_GEMINI_API_KEY=AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw" > .env.local

# Executar em desenvolvimento
npm run dev
```

## 📝 Logs Úteis

O código agora mostra logs detalhados no console:
- `[AdminLogin] Tentando fazer login com Firebase Auth...`
- `[AdminLogin] Login bem-sucedido!`
- `[AdminLogin] Erro no login: [código] [mensagem]`
- `[AdminLogin] Usuário não encontrado, tentando criar...`
- `[AdminLogin] Usuário criado com sucesso!`

Verifique esses logs no console do navegador para identificar o problema exato.

