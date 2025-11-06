# Postmark Email Proxy

Proxy de email para envio de emails transacionais via Postmark API.

## 📋 Configuração Atual

**Server:** suporte-yoobe  
**Stream ID:** outbound  
**Tipo:** Transactional  
**Server API Token:** `ee246569-f54b-4986-937a-9288b25377f4`

## 🚀 Deploy

### Deploy Rápido

```bash
./deploy.sh ee246569-f54b-4986-937a-9288b25377f4 atendimento@yoobe.co
```

### Deploy Manual

```bash
gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co" \
  --project suporte-7e68b
```

## 🧪 Testar Envio de Email

### Teste Direto via API Postmark

```bash
cd postmark-email-proxy
node test-email.js seu-email@exemplo.com
```

### Teste via Proxy (após deploy)

```bash
curl -X POST https://sua-url-postmark-proxy.a.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "to": "seu-email@exemplo.com",
    "subject": "Teste",
    "htmlBody": "<h1>Teste</h1><p>Email de teste</p>"
  }'
```

## 📝 Variáveis de Ambiente

- `POSTMARK_SERVER_TOKEN`: Token do servidor Postmark (obrigatório)
- `FROM_EMAIL`: Email remetente confirmado: `atendimento@yoobe.co` (obrigatório)
- `PORT`: Porta do servidor (padrão: 8080)

## 🔍 Verificar Status

```bash
# Ver logs do Cloud Run
gcloud run services logs read postmark-email-proxy \
  --region southamerica-east1 \
  --limit 50

# Ver informações do serviço
gcloud run services describe postmark-email-proxy \
  --region southamerica-east1
```

## 📚 Documentação

- [Guia de Deploy](./DEPLOY_GUIDE.md)
- [Postmark API Docs](https://postmarkapp.com/developer/api/email-api)

