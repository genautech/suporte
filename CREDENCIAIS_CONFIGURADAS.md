# ✅ Credenciais Configuradas

## Status

**Data:** 05/11/2025  
**Ação:** Credenciais da API Cubbo atualizadas no Cloud Run  
**Status:** ✅ Configurado

## Credenciais Configuradas

- **CUBBO_CLIENT_ID:** `681ac954-7b46-4644-8a52-6c88749eadbd`
- **CUBBO_CLIENT_SECRET:** `Z5w2LhLjfQ71Bf2Q6QdoB5-v5_iZVnSJsvv90_gkyyra1aaYgHkfqmqL4RGS_qvoBpxVvF-77kFocsJm3FGmYQ`

## Verificação

Para verificar se as credenciais estão configuradas:

```bash
gcloud run services describe cubbo-auth-proxy \
  --region southamerica-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

## Teste

```bash
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000"
```

## Observação

Se você receber um erro relacionado à URL da API Cubbo (`https://api.cubbo.com/oauth/token` retornando 404), pode ser necessário verificar na documentação da Cubbo qual é a URL correta do endpoint de autenticação.

A documentação está em: https://developers.cubbo.com/

## Próximos Passos

1. ✅ Credenciais configuradas
2. ⏳ Verificar URL correta da API Cubbo (se necessário)
3. ⏳ Testar conexão completa
4. ⏳ Testar no frontend



