# 🚀 Deploy do Cubbo Auth Proxy - Guia Completo

## Problema Resolvido: CORS

O erro de CORS foi corrigido adicionando:
1. ✅ Configuração explícita de CORS no Express
2. ✅ Headers CORS em todas as respostas (sucesso e erro)
3. ✅ Tratamento de requisições OPTIONS (preflight)
4. ✅ Dockerfile para deploy no Cloud Run

## Arquivos Modificados/Criados

- ✅ `cubbo-auth-proxy/index.js` - CORS corrigido
- ✅ `cubbo-auth-proxy/Dockerfile` - Criado
- ✅ `cubbo-auth-proxy/.dockerignore` - Criado
- ✅ `cubbo-auth-proxy/.gcloudignore` - Criado
- ✅ `cubbo-auth-proxy/DEPLOY.md` - Instruções de deploy
- ✅ `cubbo-auth-proxy/test-proxy.js` - Script de teste
- ✅ `test-cubbo-connection.testprite.ts` - Teste com TestPrite

## Passos para Deploy

### 1. Verificar Credenciais

Certifique-se de ter:
- `CUBBO_CLIENT_ID` - ID do cliente da API Cubbo
- `CUBBO_CLIENT_SECRET` - Secret do cliente da API Cubbo

### 2. Fazer Deploy

```bash
cd cubbo-auth-proxy

gcloud run deploy cubbo-auth-proxy \
  --source . \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --set-env-vars CUBBO_CLIENT_ID=seu_client_id,CUBBO_CLIENT_SECRET=seu_client_secret \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --timeout 60
```

### 3. Verificar Deploy

Após o deploy, você receberá uma URL. Teste com:

```bash
# Teste básico
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000"

# Ou use o script de teste
node test-proxy.js
```

### 4. Testar com TestPrite

```bash
# Instalar TestPrite (se ainda não tiver)
npm install -D testprite

# Executar testes
npx testprite run test-cubbo-connection.testprite.ts
```

## Verificações Pós-Deploy

### ✅ CORS está funcionando?
- Acesse http://localhost:3000
- Abra o DevTools (F12)
- Tente usar a funcionalidade que chama a API Cubbo
- Verifique se não há mais erros de CORS

### ✅ Proxy está respondendo?
```bash
curl -v -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000"
```

### ✅ Token está sendo retornado?
- Verifique os logs do Cloud Run
- Execute o script de teste
- Verifique se há erros relacionados às credenciais

## Troubleshooting

### Erro: CORS ainda não funciona
1. Verifique se o deploy foi feito com o código atualizado
2. Verifique se o serviço foi atualizado corretamente:
   ```bash
   gcloud run services describe cubbo-auth-proxy --region southamerica-east1
   ```
3. Tente fazer um novo deploy completo

### Erro: Variáveis de ambiente não encontradas
```bash
# Verificar variáveis configuradas
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(spec.template.spec.containers[0].env)"

# Atualizar variáveis
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=novo_id,CUBBO_CLIENT_SECRET=novo_secret
```

### Erro: Proxy não responde
```bash
# Verificar se o serviço está rodando
gcloud run services list --region southamerica-east1

# Ver logs
gcloud run services logs read cubbo-auth-proxy \
  --region southamerica-east1 \
  --limit 50
```

## Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Atualizar a URL no código se necessário (já está configurada)
2. ✅ Testar a conexão no frontend
3. ✅ Verificar se o token está sendo obtido corretamente
4. ✅ Testar rastreamento de pedidos

## Referências

- Documentação Cubbo: https://developers.cubbo.com/
- Cloud Run Docs: https://cloud.google.com/run/docs
- CORS no Express: https://expressjs.com/en/resources/middleware/cors.html



