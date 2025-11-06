# 🔧 Solução para GEMINI_API_KEY não estar sendo detectada

## Problema Identificado

O Cloud Run com `--set-build-env-vars` passa variáveis como variáveis de ambiente do Cloud Build, mas o Docker precisa recebê-las como `ARG`. O Cloud Build automaticamente passa variáveis de ambiente como ARG, mas pode haver problemas de timing ou cache.

## Solução Implementada

### 1. Dockerfile Atualizado
- ✅ Adicionado debug para verificar se a variável está sendo passada
- ✅ ARG e ENV configurados corretamente

### 2. Verificação Necessária

**IMPORTANTE:** O problema pode ser que o Cloud Build está fazendo cache do build anterior sem a variável.

**Solução:** Fazer um novo deploy forçando rebuild sem cache:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_GEMINI_API_KEY=AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw \
  --project suporte-7e68b
```

Ou usar o Cloud Build diretamente:

```bash
gcloud run deploy suporte-lojinha \
  --image gcr.io/suporte-7e68b/suporte-lojinha:latest \
  --region southamerica-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300 \
  --max-instances 10 \
  --project suporte-7e68b
```

### 3. Alternativa: Usar Secret Manager

Para maior segurança, podemos usar o Secret Manager do GCP:

```bash
# Criar secret
echo -n "AIzaSyBtDlRu_AxMOLFnlBy8hBb0LUWxuySbtWw" | \
  gcloud secrets create gemini-api-key --data-file=-

# Dar permissão ao Cloud Build
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

E atualizar o `cloudbuild.yaml` para usar o secret.

## Status Atual

- ✅ Dockerfile corrigido com debug
- ✅ Deploy realizado (revisão 00015-n8k)
- ⚠️ **AÇÃO NECESSÁRIA:** Verificar logs do build para confirmar se a variável está sendo passada

## Próximos Passos

1. Verificar logs do build mais recente:
```bash
gcloud builds list --limit=1 --project suporte-7e68b
gcloud builds log BUILD_ID --project suporte-7e68b
```

2. Se a variável não estiver sendo passada, usar `cloudbuild.yaml` ou Secret Manager

3. Limpar cache do navegador após novo deploy

