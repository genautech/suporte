# Deploy do Cubbo Auth Proxy no Google Cloud Run

## Pré-requisitos

1. Google Cloud SDK instalado (`gcloud`)
2. Projeto Google Cloud configurado
3. Credenciais da API Cubbo (CLIENT_ID e CLIENT_SECRET)

## Passo a Passo

### 1. Configurar o projeto Google Cloud

```bash
# Definir o projeto
gcloud config set project seu-projeto-id

# Ou usar o projeto existente
gcloud config set project 409489811769
```

### 2. Deploy do Proxy

```bash
cd cubbo-auth-proxy

# Deploy no Cloud Run
gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars CUBBO_CLIENT_ID=seu_client_id_aqui,CUBBO_CLIENT_SECRET=seu_client_secret_aqui \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60 \
  --max-instances 10
```

### 3. Verificar o Deploy

Após o deploy, você receberá uma URL como:
```
https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app
```

### 4. Testar o Proxy

```bash
# Teste local usando curl
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000"

# Ou usando o script de teste
node test-proxy.js
```

### 5. Verificar Logs

```bash
# Ver logs em tempo real
gcloud run services logs read cubbo-auth-proxy \
  --region southamerica-east1 \
  --limit 50

# Seguir logs
gcloud run services logs tail cubbo-auth-proxy \
  --region southamerica-east1
```

### 6. Atualizar Variáveis de Ambiente (se necessário)

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=novo_client_id,CUBBO_CLIENT_SECRET=novo_client_secret
```

## Troubleshooting

### Erro: CORS ainda não funciona
- Verifique se o deploy foi feito com o código atualizado
- Verifique os logs do Cloud Run para erros
- Teste diretamente com curl para verificar se o proxy responde

### Erro: Variáveis de ambiente não encontradas
- Verifique se as variáveis foram setadas corretamente no deploy
- Use `gcloud run services describe` para verificar as variáveis

### Erro: Proxy não responde
- Verifique se o serviço está rodando: `gcloud run services list`
- Verifique os logs para erros de inicialização
- Verifique se a porta está configurada corretamente (8080)

## Notas Importantes

- O proxy deve estar configurado como `--allow-unauthenticated` para permitir requisições do frontend
- A região `southamerica-east1` foi escolhida para reduzir latência no Brasil
- O timeout de 60 segundos deve ser suficiente para a autenticação



