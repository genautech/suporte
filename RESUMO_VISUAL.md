# 🎯 Resumo Visual - Deploy em 6 Passos

## 📍 Onde Você Está

```
/Users/genautech/suporte/
└── cubbo-auth-proxy/          ← Você vai trabalhar aqui
    ├── index.js               ✅ Código corrigido
    ├── Dockerfile             ✅ Pronto
    ├── deploy-now.sh          ✅ Script pronto
    └── test-proxy.js          ✅ Para testar depois
```

---

## 🚀 Os 6 Passos

### **PASSO 1** 🔐 Autenticar

```bash
gcloud auth login
```

**O que fazer:**
1. Digite o comando
2. Pressione Enter
3. Uma janela do navegador abre
4. Escolha sua conta Google
5. Clique em "Permitir"
6. Volta para o terminal ✅

---

### **PASSO 2** ⚙️ Configurar Projeto

```bash
gcloud config set project suporte-7e68b
```

**O que fazer:**
1. Digite o comando
2. Pressione Enter
3. Deve aparecer: `Updated property [core/project].` ✅

---

### **PASSO 3** 📁 Ir para Pasta

```bash
cd cubbo-auth-proxy
```

**O que fazer:**
1. Digite o comando
2. Pressione Enter
3. Verifique com: `pwd`
4. Deve mostrar: `/Users/genautech/suporte/cubbo-auth-proxy` ✅

---

### **PASSO 4** 🎯 Executar Deploy

**Escolha UMA opção:**

#### Opção A: COM credenciais (se você já tem)

```bash
./deploy-now.sh seu_client_id seu_client_secret
```

**Substitua:**
- `seu_client_id` → Seu CLIENT_ID real
- `seu_client_secret` → Seu CLIENT_SECRET real

#### Opção B: SEM credenciais (adicionar depois)

```bash
./deploy-now.sh
```

**O que fazer:**
1. Digite o comando escolhido
2. Pressione Enter
3. **Aguarde 3-7 minutos** ⏳
4. O script mostra o progresso
5. No final, mostra a URL do serviço ✅

**Durante a espera, você verá:**
```
Building using Dockerfile...
Packing source code...
Uploading source code...
...
Service deployed successfully!
```

---

### **PASSO 5** 🧪 Testar

```bash
node test-proxy.js
```

**O que fazer:**
1. Digite o comando
2. Pressione Enter
3. Deve mostrar resultados dos testes ✅

**O que você quer ver:**
- ✅ Status: 200 OK
- ✅ Headers CORS presentes
- ✅ Resposta JSON

---

### **PASSO 6** 🔑 Adicionar Credenciais (só se fez Opção B)

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=seu_id,CUBBO_CLIENT_SECRET=seu_secret
```

**O que fazer:**
1. Substitua `seu_id` e `seu_secret` pelos valores reais
2. Digite o comando completo (é uma linha só)
3. Pressione Enter
4. Deve mostrar: `Service updated successfully` ✅

---

## ⏱️ Tempo Total

- **Preparação:** 2 minutos
- **Deploy:** 3-7 minutos
- **Teste:** 1 minuto
- **Total:** ~10 minutos

---

## ✅ Checklist Rápido

Marque conforme completar:

- [ ] `gcloud auth login` executado
- [ ] `gcloud config set project` executado
- [ ] `cd cubbo-auth-proxy` executado
- [ ] `./deploy-now.sh` executado
- [ ] Deploy concluído (URL mostrada)
- [ ] `node test-proxy.js` executado
- [ ] Credenciais adicionadas (se necessário)
- [ ] Teste no frontend funcionando

---

## 🆘 Se Algo Der Errado

### Erro: "command not found: gcloud"
→ Instale o Google Cloud SDK: https://cloud.google.com/sdk/docs/install

### Erro: "Permission denied"
→ Execute: `chmod +x deploy-now.sh`

### Erro: "You do not currently have an active account"
→ Execute: `gcloud auth login`

### Deploy demora muito (>10 minutos)
→ Normal, aguarde. Pode levar até 10 minutos na primeira vez.

---

## 🎉 Pronto!

Após completar todos os passos:
- ✅ Proxy deployado no Cloud Run
- ✅ CORS corrigido
- ✅ Pronto para usar no frontend

---

## 📞 Próximo Passo Após Deploy

1. Abra http://localhost:3000
2. Faça login como admin
3. Vá em "Configurações de API"
4. Teste a conexão
5. **O erro de CORS não deve mais aparecer!** 🎉








