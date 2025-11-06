# ✅ Deploy Concluído - GEMINI_API_KEY Configurada

## Solução Implementada

Criado arquivo `cloudbuild.yaml` mínimo que passa a variável `VITE_GEMINI_API_KEY` como build arg para o Dockerfile.

## Arquivos Modificados

- ✅ `cloudbuild.yaml` - Criado (arquivo mínimo, apenas configuração de build)
- ✅ `Dockerfile` - Mantido como estava (sem mudanças)
- ✅ `docs/specs/06-deployment.md` - Documentação atualizada

## Como Funciona

1. O `cloudbuild.yaml` define a substituição `_VITE_GEMINI_API_KEY`
2. Durante o build, passa como `--build-arg VITE_GEMINI_API_KEY=${_VITE_GEMINI_API_KEY}`
3. O Dockerfile recebe a variável via ARG e define como ENV
4. O Vite usa a variável durante o build

## Deploy Realizado

- ✅ Build ID: `872ff5ef-9288-40d4-b017-1113aee5ad09`
- ✅ Imagem: `gcr.io/suporte-7e68b/suporte-lojinha:latest`
- ✅ Revisão: `suporte-lojinha-00019-64f`
- ✅ URL: https://suporte-lojinha-409489811769.southamerica-east1.run.app

## Próximos Deploys

**Opção 1 - Build e Deploy Separados:**
```bash
gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b
gcloud run deploy suporte-lojinha --image gcr.io/suporte-7e68b/suporte-lojinha:latest --region southamerica-east1 --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --timeout 300 --max-instances 10 --project suporte-7e68b
```

**Opção 2 - Deploy Direto (Cloud Build detecta cloudbuild.yaml):**
```bash
gcloud run deploy suporte-lojinha --source . --region southamerica-east1 --allow-unauthenticated --port 8080 --memory 512Mi --cpu 1 --timeout 300 --max-instances 10 --project suporte-7e68b
```

## Impacto

- ✅ **Mínimo impacto:** Apenas 1 arquivo novo (`cloudbuild.yaml`)
- ✅ **Sem mudanças no código:** Dockerfile e código permanecem iguais
- ✅ **Documentação atualizada:** Processo documentado nas specs

