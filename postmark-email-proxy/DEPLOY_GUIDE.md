# Guia de Deploy do Postmark Email Proxy

## 📋 Configuração Atual do Postmark

**Server:** suporte-yoobe  
**Stream ID:** outbound  
**Tipo:** Transactional  
**Server API Token:** `ee246569-f54b-4986-937a-9288b25377f4`  
**FROM_EMAIL:** `atendimento@yoobe.co` (confirmado e verificado no Postmark)

## Passo 1: Fazer Deploy

### Opção A: Usando o script de deploy (Recomendado)

```bash
cd postmark-email-proxy
chmod +x deploy.sh
./deploy.sh ee246569-f54b-4986-937a-9288b25377f4 atendimento@yoobe.co
```

### Opção B: Deploy manual

```bash
cd postmark-email-proxy

gcloud run deploy postmark-email-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars "POSTMARK_SERVER_TOKEN=ee246569-f54b-4986-937a-9288b25377f4,FROM_EMAIL=atendimento@yoobe.co" \
  --project suporte-7e68b
```

## Passo 3: Anotar a URL

Após o deploy bem-sucedido, você verá uma saída como:

```
Service [postmark-email-proxy] revision [postmark-email-proxy-xxxxx] has been deployed.
Service URL: https://postmark-email-proxy-409489811769.southamerica-east1.run.app
```

**Copie essa URL** - você precisará dela para atualizar o código.

## Passo 4: Atualizar o Código

Após obter a URL, execute o script de atualização:

```bash
cd ..
./update-postmark-url.sh https://postmark-email-proxy-409489811769.southamerica-east1.run.app
```

Ou atualize manualmente:
1. Edite `services/supportService.ts` linha 221
2. Substitua a URL placeholder pela URL real
3. Edite `.env.local` e adicione: `VITE_POSTMARK_PROXY_URL=https://postmark-email-proxy-409489811769.southamerica-east1.run.app`

