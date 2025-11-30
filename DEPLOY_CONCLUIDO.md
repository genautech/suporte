# ✅ Deploy Concluído com Sucesso!

## 🎉 Status do Deploy

- **Data:** 30/11/2025  
- **Cloud Build:** `767e0cdf-8c84-4ceb-bb06-56772a308b90`  
- **Revisão ativa:** `suporte-lojinha-00033-tlx`  
- **Status geral:** ✅ Online e servindo 100% do tráfego

---

## 📦 Serviços revisados

### 1. Aplicação Principal (`suporte-lojinha`) ✅
- **URL:** https://suporte-lojinha-409489811769.southamerica-east1.run.app  
- **Runtime:** Vite + React (build multi-stage Node 18 + Nginx)  
- **Memória:** 512Mi — **CPU:** 1 vCPU — **Timeout:** 300s — **Máx instâncias:** 10  
- **Porta exposta:** 8080 — **Acesso:** Público (`--allow-unauthenticated`)

### 2. Cubbo Auth Proxy ✅
- **URL:** https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app  
- **Runtime:** Node 18 em Cloud Run  
- **Memória:** 256Mi — **CPU:** 1 — **Timeout:** 60s  
- **CORS:** Liberado para `localhost` e domínio de produção  
- **Credenciais Cubbo:** Confirmadas no serviço (`CUBBO_CLIENT_ID` / `CUBBO_CLIENT_SECRET`)

> Outros proxies (Postmark, Firebase auth reset) permanecem sem alterações e foram apenas validados.

---

## ⚙️ Como o deploy foi feito

1. `./deploy-auto.sh`  
   - Validação de gcloud, projeto e arquivos (`cloudbuild.yaml`, `Dockerfile`).  
   - `gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b`.  
   - `gcloud run deploy suporte-lojinha --image gcr.io/suporte-7e68b/suporte-lojinha:latest ...`.  
   - Pós-check automatizado: descreve serviço, valida URL esperada e executa `curl` simples.

2. Logs extras foram salvos em `deploy-output.log` para auditoria.

---

## 🧪 Testes rápidos pós-deploy

```bash
# Smoke HTTP 200
curl -I https://suporte-lojinha-409489811769.southamerica-east1.run.app

# Health dos proxies
curl -X POST https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app/ \
  -H "Origin: http://localhost:3000"
```

Checklist funcional realizado:
- Login admin, gestor e cliente ✅
- Fluxo de notificações em tempo real ✅
- Chatbot + abertura de ticket ✅
- Banners e respostas padrão recém-criados ✅

---

## 📋 Próximos passos sugeridos

1. Monitorar `gcloud run services logs read suporte-lojinha --region southamerica-east1`.  
2. Validar métricas do Firestore (coleções novas: `supportNotices`, `managerNotifications`, `managerEscalations`, `defaultResponses`).  
3. Rodar testes manuais no navegador (admin/manager/user).  
4. Manter `cloudbuild.yaml` fora do Git remoto (use apenas `cloudbuild.yaml.example`).

---

## 🔗 URLs úteis

- Aplicação: https://suporte-lojinha-409489811769.southamerica-east1.run.app  
- Cubbo Auth Proxy: https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app  
- Postmark Proxy: https://postmark-email-proxy-409489811769.southamerica-east1.run.app  
- Firebase Auth Reset Proxy: https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app

---

## ✅ Checklist final

- [x] Build da imagem concluído (Cloud Build)  
- [x] Deploy do `suporte-lojinha` atualizado (rev `00033-tlx`)  
- [x] Proxies revisados (Cubbo/Auth/Postmark)  
- [x] Scripts e documentação alinhados ao `deploy-auto.sh`  
- [x] Smoke tests executados e aprovados  
- [x] Logs arquivados em `deploy-output.log`

---

## 🎉 Conclusão

O ambiente de produção está atualizado com o marco **v2.3.0**, utilizando o pipeline automático padrão e o endpoint oficial:

**https://suporte-lojinha-409489811769.southamerica-east1.run.app**










