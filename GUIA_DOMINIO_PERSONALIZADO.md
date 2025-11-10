# 🚀 Guia Rápido - Configurar Domínio Personalizado `suporte.yoobe.app`

## 📍 Onde Encontrar as Informações Necessárias

### 1. **Informações do Domínio (yoobe.app)**
   - **Onde:** No seu provedor de domínio (Registro.br, GoDaddy, Cloudflare, etc.)
   - **O que você precisa:** Acesso ao painel DNS do domínio `yoobe.app`
   - **Como encontrar:** 
     - Acesse o site onde você comprou/gerenciou o domínio
     - Procure por "DNS", "Gerenciar DNS" ou "Zona DNS"

### 2. **Informações do Firebase**
   - **Onde:** https://console.firebase.google.com/
   - **Projeto:** `suporte-7e68b`
   - **O que você precisa:** Acesso ao projeto Firebase

---

## ✅ Passo a Passo (Método Mais Fácil)

### **Passo 1: Configurar Firebase Hosting**

1. **Acesse o Firebase Console:**
   ```
   https://console.firebase.google.com/project/suporte-7e68b/hosting
   ```

2. **Clique em "Get Started"** (se ainda não configurou hosting)

3. **Ou vá direto para adicionar domínio:**
   - No menu lateral, clique em **Hosting**
   - Clique em **Add custom domain** (ou "Adicionar domínio personalizado")

### **Passo 2: Adicionar o Domínio**

1. **Digite o domínio:**
   ```
   suporte.yoobe.app
   ```

2. **Clique em "Continue"**

3. **O Firebase vai mostrar instruções de DNS:**
   - Ele vai pedir para você adicionar um registro **A** ou **CNAME**
   - **ANOTE essas informações!** Você vai precisar delas no próximo passo

### **Passo 3: Configurar DNS no Provedor do Domínio**

1. **Acesse o painel DNS do domínio `yoobe.app`**

2. **Adicione o registro conforme o Firebase pediu:**
   
   **Opção A - Se pedir CNAME (mais comum):**
   ```
   Tipo: CNAME
   Nome: suporte
   Valor: [o que o Firebase mostrar, algo como: suporte-7e68b.web.app]
   TTL: 3600 (ou padrão)
   ```

   **Opção B - Se pedir registro A:**
   ```
   Tipo: A
   Nome: suporte
   Valor: [IP que o Firebase mostrar]
   TTL: 3600 (ou padrão)
   ```

3. **Salve as alterações**

### **Passo 4: Verificar no Firebase**

1. **Volte para o Firebase Console**
2. **Aguarde alguns minutos** (pode levar até 24h, mas geralmente é rápido)
3. **O Firebase vai verificar automaticamente**
4. **Quando aparecer um ✅ verde, está pronto!**

### **Passo 5: Fazer Deploy no Firebase Hosting**

Execute no terminal:

```bash
# 1. Instalar Firebase CLI (se ainda não tiver)
npm install -g firebase-tools

# 2. Fazer login
firebase login

# 3. Build do projeto
npm run build

# 4. Deploy no Firebase Hosting
firebase deploy --only hosting
```

### **Passo 6: Adicionar Domínio na Autenticação**

⚠️ **IMPORTANTE:** Adicione o novo domínio na lista de domínios autorizados:

1. **Acesse:** https://console.firebase.google.com/project/suporte-7e68b/authentication/settings
2. **Vá em "Authorized domains"**
3. **Clique em "Add domain"**
4. **Digite:** `suporte.yoobe.app` (sem http/https)
5. **Clique em "Add"**

---

## 🎯 Resumo dos Locais para Encontrar Informações

| Informação | Onde Encontrar |
|------------|----------------|
| **Gerenciar DNS do domínio** | Site do provedor do domínio (Registro.br, GoDaddy, Cloudflare, etc.) |
| **Configurar Firebase Hosting** | https://console.firebase.google.com/project/suporte-7e68b/hosting |
| **Domínios autorizados (Auth)** | https://console.firebase.google.com/project/suporte-7e68b/authentication/settings |
| **Projeto Firebase** | `suporte-7e68b` |

---

## ⚡ Método Alternativo (Via Firebase CLI)

Se preferir fazer tudo pelo terminal:

```bash
# 1. Login no Firebase
firebase login

# 2. Adicionar domínio
firebase hosting:channel:deploy --only hosting

# Depois configure o DNS conforme as instruções que aparecerem
```

---

## 🔍 Verificar se Está Funcionando

Após configurar tudo:

1. **Aguarde a propagação DNS** (pode levar alguns minutos a horas)
2. **Acesse:** https://suporte.yoobe.app
3. **Deve carregar sua aplicação!** ✅

---

## ⚠️ Troubleshooting

### Domínio não está funcionando?

1. **Verifique o DNS:**
   - Use: https://dnschecker.org/
   - Digite: `suporte.yoobe.app`
   - Veja se o registro está propagado

2. **Verifique no Firebase:**
   - Console → Hosting → Veja se o domínio aparece como "Connected"

3. **Verifique domínios autorizados:**
   - Authentication → Settings → Authorized domains
   - Certifique-se que `suporte.yoobe.app` está na lista

---

## 📝 Notas Importantes

- ✅ O Firebase Hosting é **GRÁTIS** para uso básico
- ✅ SSL/HTTPS é **automático** e **grátis**
- ✅ Não precisa configurar certificados manualmente
- ⏱️ Propagação DNS pode levar de minutos a 24 horas (geralmente é rápido)
- 🔒 O Firebase já configura HTTPS automaticamente

---

## 🎉 Pronto!

Depois de seguir esses passos, seu domínio `suporte.yoobe.app` estará funcionando!

