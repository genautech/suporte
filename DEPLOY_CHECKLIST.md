# 📋 Checklist de Deploy – Marco v2.3.0

**Data:** 30/11/2025  
**Versão:** `v2.3.0`  
**Status:** ✅ Pronto para deploy / release

---

## 🎯 Objetivo

Conferir todas as entregas do marco v2.3.0 (notificações em tempo real, banners/avisos, respostas padrão, escalonamento de gestores e melhorias no painel do cliente) antes de executar o `deploy-auto.sh`.

---

## ✅ Features revisadas

### 1. Central de Notificações
- [x] `NotificationCenterProvider` integrado ao `App.tsx` com escopos `admin`, `manager` e `user`.
- [x] `NotificationBell` exibindo contador, mute, “marcar tudo” e toasts para novos eventos.
- [x] `notificationService.ts` agrupando tickets/conversas (`listenToTicketNotifications`, `listenToConversationNotifications`).
- [x] Áudio leve (`public/sounds/notification.wav`) disparado apenas quando não estiver silenciado.

### 2. Avisos e Banners do Suporte
- [x] `AdminSupportNotices.tsx` com editor WYSIWYG, filtros por empresa e flags `showOnHome`/`showOnSupport`.
- [x] `CompanyNoticePanel.tsx` liberado dentro de `AdminCompanies` para avisos rápidos por empresa.
- [x] `supportNoticeService.ts` com filtros por empresa/local e listeners para ativos/inativos.
- [x] `SupportNoticeBanner.tsx` renderizado no `HomePage` (visitantes) e `SupportArea` (clientes/admin-mode) com botão de recolher/atalho para notificações.

### 3. Biblioteca de Respostas Padrão
- [x] `AdminDefaultResponses.tsx` listando, filtrando e permitindo CRUD por empresa.
- [x] `defaultResponseService.ts` lidando com similaridade, keywords e flags de aprendizado.
- [x] Integração com `knowledgeBaseService`/`autoLearningService` para promover respostas marcadas com “Incluir no aprendizado”.

### 4. Escalonamento de Gestores & Alertas
- [x] `managerEscalationService.ts` cria tickets prioritários, vincula pedidos e sincroniza status.
- [x] `managerNotificationService.ts` publica eventos em `managerNotifications` + listener dedicado.
- [x] Abas novas no `ManagerDashboard.tsx` (escalations, pedidos celebrados, preferências).
- [x] `managerProfileService.ts` guarda nome/email/timezone e preferências de notificação (canais, tópicos).

### 5. Experiência do Cliente
- [x] `SupportArea.tsx` inicia com `SupportNoticeBanner` e tabs responsivas.
- [x] Chatbot, tickets e pedidos continuam operando após a inserção dos novos componentes.
- [x] `OrderCelebration.tsx` mostra pedidos recentes do gestor com métricas amigáveis.
- [x] `orderCacheService.ts` grava `companyOrdersCache` (até 50 pedidos / TTL ~5 min).

### 6. Documentação & Scripts
- [x] `README.md`, `README_PROXIMOS_PASSOS.md`, `DEPLOY.md`, `DEPLOY_CONCLUIDO.md`, `RESUMO_ATUALIZACOES.md`, `docs/specs/05-services.md`, `docs/specs/09-features.md` atualizados.
- [x] `deploy-auto.sh` validando URL oficial, presença de `cloudbuild.yaml`/`Dockerfile` e registrando revisão `suporte-lojinha-00033-tlx`.
- [x] `EXECUTAR_DEPLOY.md` e `GUIA_PASSO_A_PASSO_DEPLOY.md` reforçando o uso do pipeline automático.

---

## 🔧 Verificações pré-deploy

### Variáveis obrigatórias (Cloud Build / `.env.local`)
- [x] `VITE_GEMINI_API_KEY`
- [x] `VITE_POSTMARK_PROXY_URL`
- [x] `VITE_AUTH_RESET_PROXY_URL`

### Coleções Firestore
- [x] `supportNotices`
- [x] `managerNotifications`
- [x] `managerEscalations`
- [x] `managerProfiles`
- [x] `defaultResponses`
- [x] `companyOrdersCache`
- [x] `tickets`, `conversations`, `faq`, `knowledgeBase`, `authCodes` (legadas) permanecem acessíveis

### Índices recomendados
- [ ] `tickets`: `email` + `updatedAt` (desc)
- [ ] `conversations`: `userId` + `updatedAt` (desc)
- [ ] `faq`: `companyId` + `active` + `order`
- [ ] `supportNotices`: `targetCompanyIds` + `updatedAt`
- [ ] `managerNotifications`: `companyId` + `createdAt`
- [ ] `managerEscalations`: `companyId` + `createdAt`
- [ ] `defaultResponses`: `companyId` + `usageCount`

> Sem os índices o sistema continua operando (fallback em memória), mas com latência maior sob carga.

### Proxies/Serviços Cloud Run
- [x] `suporte-lojinha` (app principal)
- [x] `cubbo-auth-proxy`
- [x] `postmark-email-proxy`
- [x] `firebase-auth-reset-proxy`

---

## 📦 Processo de deploy (produção)

1. **Executar script automático**
   ```bash
   ./deploy-auto.sh
   ```
   - Valida gcloud, projeto e arquivos (`cloudbuild.yaml`, `Dockerfile`)
   - `gcloud builds submit --config cloudbuild.yaml --project suporte-7e68b`
   - `gcloud run deploy suporte-lojinha --image gcr.io/suporte-7e68b/suporte-lojinha:latest ...`
   - Verifica URL final `https://suporte-lojinha-409489811769.southamerica-east1.run.app`

2. **Smoke tests imediatos**
   - Login admin/gestor/cliente e navegação básica
   - Criar banner → validar exibição no `SupportNoticeBanner`
   - Criar resposta padrão → checar persistência e (se marcado) inclusão na base de conhecimento
   - Abrir ticket/escalation → garantir badges/toasts em admin e gestor

3. **Monitoramento**
   ```bash
   gcloud run services logs read suporte-lojinha \
     --region southamerica-east1 \
     --limit 100
   ```

---

## 🧪 Checklist funcional pós-deploy

- 🔔 **Notificações**: badge incrementa, mute funciona, marcar tudo limpa não-lidos.
- 📣 **Avisos**: banner aparece no Home/SupportArea, recolher mantém estado durante a sessão.
- 🧠 **Respostas padrão**: CRUD por empresa, busca e contador de uso atualizam em tempo real.
- 🚨 **Escalonamento**: gestor abre nova solicitação → admin recebe alerta → status sincroniza.
- 🎉 **OrderCelebration/Cache**: gestor visualiza pedidos recentes mesmo antes do request remoto.
- 👤 **Preferências do gestor**: alterações persistem e sincronizam com `companyService`.

---

## ✅ Resultado esperado

- Central de notificações ativa para todos os perfis.
- Banners e respostas padrão configuráveis pelo admin.
- Escalonamentos de gestores com alertas dedicados.
- Painel do cliente inicia com avisos relevantes e mantém chatbot/tickets intactos.
- Deploy automático publica a revisão `suporte-lojinha-00033-tlx` apontando para o endpoint oficial.

> Concluído este checklist, o ambiente está pronto para etiquetar `v2.3.0` e comunicar o release.






