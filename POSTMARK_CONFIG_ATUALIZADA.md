# ✅ Configuração Postmark Atualizada

## 📋 Informações do Servidor

**Server:** suporte-yoobe  
**Stream ID:** outbound  
**Tipo:** Transactional  
**Server API Token:** `ee246569-f54b-4986-937a-9288b25377f4`  
**Criado em:** Nov 05, 2025

## ✅ Verificações Realizadas

### 1. Código do Proxy ✓
- ✅ Stream ID configurado como `"outbound"` (correto)
- ✅ Usa `MessageStream: "outbound"` no corpo da requisição
- ✅ Token configurado via variável de ambiente `POSTMARK_SERVER_TOKEN`

### 2. Documentação Atualizada ✓
- ✅ `postmark-email-proxy/DEPLOY_GUIDE.md` - Token atualizado
- ✅ `docs/specs/03-secrets.md` - Token e configurações atualizadas
- ✅ `CONFIGURACAO_AUTH_CODIGO.md` - Instruções atualizadas
- ✅ `postmark-email-proxy/README.md` - Criado com informações atuais

### 3. Scripts de Teste Criados ✓
- ✅ `postmark-email-proxy/test-email.js` - Teste direto via API
- ✅ `test-postmark-email.sh` - Script bash para facilitar testes

## 🚀 Próximos Passos

### 1. Fazer Deploy do Proxy

```bash
cd postmark-email-proxy
chmod +x deploy.sh
./deploy.sh ee246569-f54b-4986-937a-9288b25377f4 atendimento@yoobe.co
```

### 3. Testar Envio de Email

#### Opção A: Teste Direto (sem deploy)

```bash
# Teste direto via API Postmark
cd postmark-email-proxy
node test-email.js seu-email@exemplo.com

# Ou usando o script bash
cd ..
./test-postmark-email.sh seu-email@exemplo.com
```

#### Opção B: Teste via Proxy (após deploy)

```bash
# Obter URL do proxy após deploy
# Exemplo: https://postmark-email-proxy-409489811769.southamerica-east1.run.app

curl -X POST https://sua-url-postmark-proxy.a.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "to": "seu-email@exemplo.com",
    "subject": "Teste de Email",
    "htmlBody": "<h1>Teste</h1><p>Este é um email de teste.</p>"
  }'
```

### 4. Configurar Variável de Ambiente

Após fazer deploy e obter a URL do proxy:

```bash
# Criar/editar .env.local
echo "VITE_POSTMARK_PROXY_URL=https://sua-url-postmark-proxy.a.run.app" >> .env.local
```

## 📝 Resumo das Configurações

### Variáveis de Ambiente no Cloud Run

```bash
POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4
FROM_EMAIL=atendimento@yoobe.co
PORT=8080
```

### Variáveis de Ambiente no Frontend (.env.local)

```bash
VITE_POSTMARK_PROXY_URL=https://sua-url-postmark-proxy.a.run.app
```

## 🔍 Verificação de Status

### Verificar se o proxy está rodando

```bash
gcloud run services list --region southamerica-east1 | grep postmark
```

### Ver logs do proxy

```bash
gcloud run services logs read postmark-email-proxy \
  --region southamerica-east1 \
  --limit 50
```

### Ver informações do serviço

```bash
gcloud run services describe postmark-email-proxy \
  --region southamerica-east1
```

## ⚠️ Importante

1. **Email Remetente:** O email `atendimento@yoobe.co` está confirmado e verificado no Postmark
2. **Token:** O token `ee246569-f54b-4986-937a-9288b25377f4` está correto e atualizado
3. **Stream:** O código já está configurado para usar `outbound` (correto)
4. **Segurança:** Não commite o arquivo `.env.local` no Git

## ✅ Checklist Final

- [x] Email remetente confirmado: `atendimento@yoobe.co`
- [ ] Fazer deploy do proxy com o token correto
- [ ] Anotar URL do proxy gerada
- [ ] Testar envio de email (direto ou via proxy)
- [ ] Configurar `VITE_POSTMARK_PROXY_URL` no `.env.local`
- [ ] Testar autenticação por código na aplicação

## 📚 Arquivos Criados/Atualizados

1. ✅ `postmark-email-proxy/test-email.js` - Script de teste
2. ✅ `test-postmark-email.sh` - Script bash de teste
3. ✅ `postmark-email-proxy/README.md` - Documentação do proxy
4. ✅ `postmark-email-proxy/DEPLOY_GUIDE.md` - Atualizado
5. ✅ `docs/specs/03-secrets.md` - Atualizado
6. ✅ `CONFIGURACAO_AUTH_CODIGO.md` - Atualizado
7. ✅ `POSTMARK_CONFIG_ATUALIZADA.md` - Este arquivo

