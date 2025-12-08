# 🔑 Atualizar Credenciais da API Cubbo

## ✅ Status Atual

**Deploy:** ✅ Concluído com sucesso!
**CORS:** ✅ Funcionando corretamente!
**Credenciais:** ⚠️ Ainda são placeholders ("seu_client_id", "seu_client_secret")

## 🎯 Próximo Passo: Atualizar Credenciais

Você precisa substituir as credenciais placeholder pelas credenciais reais da API Cubbo.

### 1. Obter suas Credenciais

Você precisa ter:
- **CUBBO_CLIENT_ID** - ID do cliente da API Cubbo
- **CUBBO_CLIENT_SECRET** - Secret do cliente da API Cubbo

Se você ainda não tem, obtenha na documentação da Cubbo:
https://developers.cubbo.com/

### 2. Atualizar no Cloud Run

Execute este comando substituindo pelos valores reais:

```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=SEU_CLIENT_ID_REAL,CUBBO_CLIENT_SECRET=SEU_CLIENT_SECRET_REAL
```

**Exemplo:**
```bash
gcloud run services update cubbo-auth-proxy \
  --region southamerica-east1 \
  --set-env-vars CUBBO_CLIENT_ID=abc123xyz,CUBBO_CLIENT_SECRET=secret456def
```

### 3. Verificar se foi atualizado

```bash
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

Deve mostrar suas credenciais reais (não mais "seu_client_id").

### 4. Testar novamente

```bash
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000"
```

**Com credenciais corretas, você deve receber:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

## ✅ Verificação Final

Após atualizar as credenciais:

1. ✅ CORS funcionando (já está ✅)
2. ✅ Credenciais atualizadas
3. ✅ Token sendo retornado
4. ✅ Teste no frontend funcionando

## 🧪 Testar no Frontend

1. Abra http://localhost:3000
2. Faça login como admin
3. Vá em "Configurações de API"
4. Configure as credenciais Cubbo (se ainda não tiver)
5. Clique em "Testar Conexão"
6. Deve funcionar sem erros! ✅










