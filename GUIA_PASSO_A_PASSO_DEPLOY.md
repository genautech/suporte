# 📚 Guia Passo a Passo - Deploy do Cubbo Auth Proxy

## 🎯 Objetivo
Fazer o deploy do proxy de autenticação da API Cubbo no Google Cloud Run para corrigir o erro de CORS.

---

## 📋 Pré-requisitos

Antes de começar, você precisa ter:

1. ✅ **Google Cloud SDK (gcloud)** instalado
   - Verificar: `gcloud --version`
   - Se não tiver: https://cloud.google.com/sdk/docs/install

2. ✅ **Conta Google Cloud** com acesso ao projeto
   - Projeto: `suporte-7e68b` ou `409489811769`

3. ✅ **Credenciais da API Cubbo** (opcional para início)
   - `CUBBO_CLIENT_ID`
   - `CUBBO_CLIENT_SECRET`
   - Se não tiver, pode adicionar depois

---

## 🚀 PASSO 1: Abrir o Terminal

1. Abra o Terminal no seu Mac
2. Navegue até a pasta do projeto:
   ```bash
   cd /Users/genautech/suporte
   ```

---

## 🔐 PASSO 2: Autenticar no Google Cloud

### 2.1 Verificar se já está autenticado

```bash
gcloud auth list
```

**O que procurar:**
- Se aparecer uma conta com `ACTIVE` → Você já está autenticado ✅
- Se aparecer `(empty)` → Precisa autenticar ❌

### 2.2 Fazer login (se necessário)

```bash
gcloud auth login
```

**O que vai acontecer:**
1. Uma janela do navegador vai abrir
2. Você vai escolher sua conta Google
3. Vai autorizar o acesso
4. Volta para o terminal mostrando "You are now logged in"

**Exemplo de saída:**
```
You are now logged in as: seu-email@gmail.com
```

---

## ⚙️ PASSO 3: Configurar o Projeto Google Cloud

### 3.1 Verificar projeto atual

```bash
gcloud config get-value project
```

**Possíveis resultados:**
- Mostra um ID (ex: `suporte-7e68b`) → Projeto já configurado ✅
- Mostra `(unset)` → Precisa configurar ❌

### 3.2 Configurar o projeto (se necessário)

```bash
gcloud config set project suporte-7e68b
```

**Ou se preferir usar o número do projeto:**
```bash
gcloud config set project 409489811769
```

**Confirmação esperada:**
```
Updated property [core/project].
```

---

## 📁 PASSO 4: Navegar para a Pasta do Proxy

```bash
cd cubbo-auth-proxy
```

**Verificar se está na pasta certa:**
```bash
pwd
# Deve mostrar: /Users/genautech/suporte/cubbo-auth-proxy

ls -la
# Deve mostrar os arquivos: index.js, Dockerfile, deploy-now.sh, etc.
```

---

## 🎯 PASSO 5: Escolher Estratégia de Deploy

Você tem **2 opções**:

### **Opção A: Deploy COM credenciais** (Recomendado se você já tem)

Se você já tem as credenciais da API Cubbo (`CUBBO_CLIENT_ID` e `CUBBO_CLIENT_SECRET`):

```bash
./deploy-now.sh seu_client_id_aqui seu_client_secret_aqui
```

**Substitua:**
- `seu_client_id_aqui` → Seu CLIENT_ID real da Cubbo
- `seu_client_secret_aqui` → Seu CLIENT_SECRET real da Cubbo

### **Opção B: Deploy SEM credenciais** (Adicionar depois)

Se você ainda não tem as credenciais ou quer testar primeiro:

```bash
./deploy-now.sh
```

Você pode adicionar as credenciais depois (veja Passo 7).

---

## ⏳ PASSO 6: Aguardar o Deploy

### 6.1 O que acontece durante o deploy

Quando você executa o script, ele vai:

1. ✅ Verificar se você está autenticado
2. ✅ Configurar o projeto automaticamente
3. ✅ Fazer build da aplicação (pode demorar 2-5 minutos)
4. ✅ Fazer upload para o Cloud Run
5. ✅ Criar/atualizar o serviço
6. ✅ Mostrar a URL do serviço

### 6.2 O que você vai ver

```
🚀 Deploy do Cubbo Auth Proxy

✅ Credenciais fornecidas (ou ⚠️ Aviso: Deployando sem credenciais)

📦 Iniciando deploy...

Building using Dockerfile...
Packing source code...
Uploading source code...
...
Service [cubbo-auth-proxy] revision [cubbo-auth-proxy-00001-abc] has been deployed
Service URL: https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app

✅ Deploy concluído!
```

**⏱️ Tempo estimado:** 3-7 minutos

---

## 🔗 PASSO 7: Verificar o Deploy

### 7.1 Ver a URL do serviço

O script já mostra a URL, mas você pode verificar:

```bash
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(status.url)"
```

**Resultado esperado:**
```
https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app
```

### 7.2 Ver o status do serviço

```bash
gcloud run services list --region southamerica-east1
```

**Você deve ver:**
```
SERVICE            REGION              URL
cubbo-auth-proxy   southamerica-east1  https://cubbo-auth-proxy-...
```

---

## 🔑 PASSO 8: Adicionar Credenciais (se necessário)

**Só faça isso se você fez deploy SEM credenciais no Passo 5.**

### 8.1 Obter as credenciais

Você precisa ter:
- `CUBBO_CLIENT_ID` - ID do cliente da API Cubbo
- `CUBBO_CLIENT_SECRET` - Secret do cliente da API Cubbo

### 8.2 Atualizar o serviço

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=seu_client_id,CUBBO_CLIENT_SECRET=seu_client_secret
```

**Substitua:**
- `seu_client_id` → Seu CLIENT_ID real
- `seu_client_secret` → Seu CLIENT_SECRET real

**Confirmação esperada:**
```
Service [cubbo-auth-proxy] revision [cubbo-auth-proxy-00002-xyz] has been deployed
```

---

## 🧪 PASSO 9: Testar o Deploy

### 9.1 Teste rápido com curl

```bash
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000" \
  -v
```

**O que procurar:**
- ✅ Status `200 OK` ou outro status HTTP
- ✅ Headers `Access-Control-Allow-Origin` presentes
- ✅ Resposta JSON (pode ser erro se credenciais não estiverem configuradas)

### 9.2 Teste com script Node

```bash
cd /Users/genautech/suporte/cubbo-auth-proxy
node test-proxy.js
```

**O que você vai ver:**
```
🧪 Testando proxy do Cubbo...

URL: https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app

📤 Enviando requisição POST...
✅ Status: 200 OK
📋 Headers CORS:
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   ...
```

### 9.3 Teste no Frontend

1. Abra http://localhost:3000 no navegador
2. Faça login como admin
3. Vá em "Configurações de API"
4. Configure as credenciais Cubbo (se ainda não tiver)
5. Clique em "Testar Conexão"
6. **O erro de CORS não deve mais aparecer!** ✅

---

## 📊 PASSO 10: Verificar Logs (se necessário)

Se algo não funcionar, veja os logs:

```bash
gcloud run services logs read cubbo-auth-proxy \
  --region southamerica-east1 \
  --limit 50
```

**Ou para ver logs em tempo real:**
```bash
gcloud run services logs tail cubbo-auth-proxy \
  --region southamerica-east1
```

---

## ✅ Checklist Final

Marque cada item conforme completar:

- [ ] Terminal aberto
- [ ] Autenticado no Google Cloud (`gcloud auth login`)
- [ ] Projeto configurado (`gcloud config set project`)
- [ ] Na pasta `cubbo-auth-proxy`
- [ ] Deploy executado (`./deploy-now.sh`)
- [ ] URL do serviço anotada
- [ ] Credenciais adicionadas (se necessário)
- [ ] Teste com curl funcionando
- [ ] Teste no frontend sem erro de CORS

---

## 🆘 Troubleshooting

### Problema: "You do not currently have an active account selected"

**Solução:**
```bash
gcloud auth login
```

### Problema: "Permission denied"

**Solução:**
Verifique se você tem permissões no projeto. Entre em contato com o administrador do projeto.

### Problema: "API not enabled"

**Solução:**
```bash
gcloud services enable run.googleapis.com
```

### Problema: Script não executa

**Solução:**
```bash
chmod +x deploy-now.sh
./deploy-now.sh
```

### Problema: CORS ainda não funciona

**Solução:**
1. Verifique se o deploy foi feito com o código atualizado
2. Verifique os logs para erros
3. Faça um novo deploy completo

---

## 📞 Próximos Passos Após Deploy

1. ✅ **Atualizar URL no código** (se necessário)
   - O código já está configurado com a URL correta
   - Verifique em `services/supportService.ts` linha 57

2. ✅ **Testar todas as funcionalidades**
   - Rastreamento de pedidos
   - Criação de tickets
   - Chatbot

3. ✅ **Monitorar logs**
   - Verificar se há erros
   - Verificar performance

---

## 🎉 Pronto!

Após completar todos os passos, seu proxy estará funcionando e o erro de CORS será resolvido!

**Tempo total estimado:** 10-15 minutos










