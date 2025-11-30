# 📋 Resumo das Atualizações - Marco v2.3.0

## ✅ Deploy revisado

- **Data da revisão:** 30/11/2025  
- **Serviço:** `suporte-lojinha`  
- **Revisão Cloud Run:** `suporte-lojinha-00033-tlx` (build `767e0cdf-8c84-4ceb-bb06-56772a308b90`)  
- **URL produção:** https://suporte-lojinha-409489811769.southamerica-east1.run.app  
- **Status:** ✅ Live e servindo 100% do tráfego

---

## 🎯 Destaques do release

1. **Central de notificações em tempo real** para admins, gestores e clientes.  
2. **Banners de comunicação dirigida** com rich text e segmentação por empresa.  
3. **Biblioteca de respostas padrão** integrada ao aprendizado do Gemini.  
4. **Fluxo completo de escalonamento de gestores**, com alertas e acompanhamento.  
5. **Experiência do gestor aprimorada** (ordens celebradas, cache, preferências).  
6. **Documentação e scripts** alinhados ao `deploy-auto.sh` apontando para o novo endpoint oficial.

---

## 🔔 Central de Notificações

- `NotificationCenterProvider` injeta o escopo correto (admin/manager/user) direto no `App`.  
- `NotificationBell` exibe contador em tempo real, mantém estado de mute/localStorage e permite marcar tudo como lido.  
- `notificationService.ts` agrega tickets e conversas usando listeners Firestore, com fallback para usuários finais por `userId`.  
- Toasts com áudio leve alertam novos chamados, conversas e atualizações administrativas.

---

## 📣 Avisos e Banners Ricos

- `AdminSupportNotices` entrega CRUD com editor WYSIWYG, filtros por empresa e flags de exibição (`showOnHome`, `showOnSupport`).  
- `CompanyNoticePanel` permite que cada empresa registre avisos exclusivos direto no cadastro.  
- `SupportNoticeBanner` mostra cards responsivos antes do conteúdo principal (Home + SupportArea) e pode ser recolhido pelo usuário.  
- `supportNoticeService` centraliza persistência, filtros por local e listeners de ativos/inativos.

---

## 🧠 Biblioteca de Respostas Padrão

- `AdminDefaultResponses` organiza scripts por empresa com busca, categorias, keywords e contador de uso.  
- Integra opcionalmente com `knowledgeBaseService` e `autoLearningService` para promover respostas aprovadas.  
- `defaultResponseService` normaliza perguntas, calcula similaridade e expõe `findMatchingResponse` para alimentar o chatbot.

---

## 🚨 Escalonamentos e Alertas do Gestor

- `managerEscalationService` cria tickets de alta prioridade, relaciona pedido e sincroniza status com `managerNotificationService`.  
- `ManagerDashboard` ganhou abas específicas para ver/abrir escalations, com filtros, busca e modal dedicado.  
- `managerNotificationService` e `NotificationBell` entregam feed de pedidos novos, escalations e atualizações do suporte.

---

## 👤 Experiência completa do Gestor

- `managerProfileService` guarda preferências de notificação (canais, tópicos, timezone) e mantém dados em sincronia com `companyService`.  
- `OrderCelebration` celebra os pedidos mais recentes com animações suaves e indicadores de valor.  
- `orderCacheService` guarda até 50 pedidos recentes por empresa em `companyOrdersCache`, reduzindo a dependência imediata da API Cubbo.

---

## ⚙️ Infra & Deploy

- `deploy-auto.sh` validado contra o endpoint oficial, coleta logs e aborta quando faltar `cloudbuild.yaml`/`Dockerfile`.  
- `cloudbuild.yaml` continua responsável por injetar `VITE_GEMINI_API_KEY`; documentação reforça uso obrigatório.  
- `DEPLOY.md`, `DEPLOY_CHECKLIST.md`, `README`, `README_PROXIMOS_PASSOS.md` e `DEPLOY_CONCLUIDO.md` foram atualizados com o fluxo automático.  
- Novas coleções Firestore documentadas: `supportNotices`, `managerNotifications`, `managerProfiles`, `managerEscalations`, `defaultResponses`, `companyOrdersCache`.

---

## 🧪 Validação sugerida

1. **Admin**  
   - Entrar no dashboard → Ver badge de notificações e testes de mute/leitura.  
   - Criar banner no `AdminSupportNotices` e confirmar exibição imediata no SupportArea/Home.  
   - Criar resposta padrão com `includeInLearning` marcado e verificar entrada correspondente na base de conhecimento.

2. **Gestor**  
   - Login via `/manager` → Checar OrderCelebration e feed de notificações.  
   - Abrir um novo escalation a partir de um pedido e acompanhar status/alertas.  
   - Ajustar preferências de notificação e confirmar persistência.

3. **Cliente final**  
   - Logar, conferir `SupportNoticeBanner`, abrir notificações e validar sons/toasts.  
   - Criar ticket/abrir chat para garantir que as notificações aparecem no Admin.

4. **Deploy**  
   - Executar `./deploy-auto.sh` (ou `./deploy.sh`).  
   - Confirmar serviço ativo: `gcloud run services describe suporte-lojinha --region southamerica-east1`.  
   - Validar URL final `https://suporte-lojinha-409489811769.southamerica-east1.run.app`.

---

## 📂 Principais arquivos alterados (código)

- `App.tsx`, `DashboardHeader.tsx`, `NotificationCenterProvider.tsx`, `NotificationBell.tsx`  
- `SupportNoticeBanner.tsx`, `AdminSupportNotices.tsx`, `CompanyNoticePanel.tsx`  
- `AdminDefaultResponses.tsx`, `OrderCelebration.tsx`, `ManagerDashboard.tsx`, `SupportArea.tsx`  
- `services/notificationService.ts`, `managerNotificationService.ts`, `managerEscalationService.ts`, `managerProfileService.ts`, `defaultResponseService.ts`, `supportNoticeService.ts`, `orderCacheService.ts`

---

## 📚 Documentação atualizada

- `README.md`, `README_PROXIMOS_PASSOS.md`, `DEPLOY.md`, `DEPLOY_CHECKLIST.md`, `DEPLOY_CONCLUIDO.md`, `EXECUTAR_DEPLOY.md`, `GUIA_PASSO_A_PASSO_DEPLOY.md`  
- `docs/specs/05-services.md`, `docs/specs/09-features.md`, `RESUMO_DEPLOY.md`, `RESUMO_FINAL.md`

---

## ✅ Checklist rápido

- [x] Central de notificações disponível para todos os perfis  
- [x] Banners e respostas padrão gerenciados via AdminDashboard  
- [x] Pipeline de escalonamento/alertas de gestores funcionando  
- [x] ManagerDashboard com cache, celebrações e preferências  
- [x] Scripts/documentação ajustados para `deploy-auto.sh` + Cloud Run  
- [x] Ambiente em produção serve revisão `suporte-lojinha-00033-tlx`

---

Sistema liberado como marco **v2.3.0** e pronto para o ciclo de monitoramento pós-release. 🎉










