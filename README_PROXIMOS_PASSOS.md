# ✅ Próximos Passos – Marco v2.3.0

**Data de corte:** 30/11/2025  
**Status:** ✅ Deploy homologado / aguardando pós-checks

---

## 🎉 O que já está pronto

- Revisão `suporte-lojinha-00055-jt4` servindo 100% do tráfego em produção.  
- Novas frentes liberadas: central de notificações, banners/avisos, biblioteca de respostas padrão, escalonamento para gestores, OrderCelebration e cache de pedidos.  
- Documentação e scripts (`deploy-auto.sh`, `DEPLOY.md`, `CHANGELOG.md`) atualizados para o marco `v2.3.0`.

---

## 🚀 Próximas ações (ordem sugerida)

| # | Tarefa | Responsável | Status |
|---|--------|-------------|--------|
| 1 | **Rodar `./deploy-auto.sh`** (caso ainda não tenha executado no ambiente alvo) | Tech | ✅ |
| 2 | **Criar/confirmar índices Firestore** (`tickets`, `conversations`, `supportNotices`, `managerNotifications`, `managerEscalations`, `defaultResponses`) | Tech | ⏳ |
| 3 | **Popular avisos iniciais** em `AdminSupportNotices` (banner geral + comunicados por empresa) | Suporte | ⏳ |
| 4 | **Cadastrar respostas padrão críticas** (macro de SLA, rastreio, troca) marcando “Incluir no aprendizado” | Conteúdo | ⏳ |
| 5 | **Validar notificações**: abrir ticket/conversa/escalation e garantir badges/toasts em admin/gestor/cliente | QA | ⏳ |
| 6 | **Testar fluxo do gestor**: login `/manager`, OrderCelebration, preferências e abertura de escalonamento | QA | ⏳ |
| 7 | **Executar smoke tests do cliente**: banner no SupportArea, chatbot, formulário de ticket, pedidos e FAQ | QA | ⏳ |
| 8 | **Registrar resultado** em `DEPLOY_CONCLUIDO.md` + comunicar stakeholders | Tech Lead | ⏳ |

---

## 🔎 Detalhamento das validações

### 1. Deploy automático
```bash
cd /Users/genautech/suporte
./deploy-auto.sh
```
- Confirma gcloud/projeto, sobe imagem, publica em Cloud Run e checa URL.
- Logs ficam em `deploy-output.log`.

### 2. Índices Firestore
Use `firebase firestore:indexes` ou o script existente (`CRIAR_INDICES_FIRESTORE.sh`) adicionando:
- `tickets`: `email` + `updatedAt`
- `conversations`: `userId` + `updatedAt`
- `supportNotices`: `targetCompanyIds` + `updatedAt`
- `managerNotifications`: `companyId` + `createdAt`
- `managerEscalations`: `companyId` + `createdAt`
- `defaultResponses`: `companyId` + `usageCount`

### 3. Avisos/Banners
1. Abrir painel admin → “Avisos do Suporte”.  
2. Criar banner geral (ex.: manutenção programada) marcado para `Home` + `Área do cliente`.  
3. Criar aviso direcionado para uma empresa via `CompanyNoticePanel`.  
4. Validar exibição no `HomePage` (visitante) e `SupportArea` (cliente).

### 4. Respostas Padrão
1. Abrir “Respostas Padrão”.  
2. Criar scripts críticos (SLA, cobrança, rastreio).  
3. Marcar “Incluir no aprendizado” para ao menos uma delas.  
4. Checar se entrada correspondente aparece como verificada na base de conhecimento (status `verified: true`).

### 5. Notificações / Escalonamentos
- Criar ticket de um cliente real → badge no admin deve subir + toast tocando som (se não silenciado).  
- Iniciar conversa no chatbot → admin recebe notificação “Nova interação”.  
- Logar como gestor e abrir escalonamento → admin vê alerta “Chamado atualizado”; gestor recebe feed em `NotificationBell`.  
- Testar botão “Marcar tudo como lido” + switch de mute.

### 6. Fluxo do Gestor
- Login via `/manager`.  
- Conferir `OrderCelebration` (últimos pedidos) e cards de estatísticas.  
- Editar preferências de notificação (canais/temas) e validar persistência.  
- Abrir a aba **Pedidos** e confirmar que a listagem retorna resultados ao buscar clientes com `customer_email` *ou* `shipping_email` preenchidos (novo fallback do `findOrdersByCustomer`).  
- Abrir modal de escalonamento direto da listagem de pedidos; acompanhar status (aberto → em andamento → resolvido).

### 7. Experiência do Cliente
- Login normal, garantir que o banner apareça antes das abas.  
- Abrir chat, criar ticket e navegar nos pedidos.  
- Certificar-se de que as notificações do cliente refletem os tickets recém-criados.

---

## 📎 Materiais úteis

- `CHANGELOG.md` – histórico completo (seção `v2.3.0`).  
- `RESUMO_ATUALIZACOES.md` – detalhes técnicos do release.  
- `DEPLOY.md` – guia completo do pipeline.  
- `DEPLOY_CONCLUIDO.md` – status consolidado pós-deploy.  
- `docs/specs/05-services.md` e `docs/specs/09-features.md` – referências sobre novos serviços/funcionalidades.

---

## ✅ Quando considerar a etapa concluída?

- Todos os itens da tabela “Próximas ações” marcados como concluídos.  
- Smoke tests executados e documentados (sem regressões críticas).  
- Cloud Run servindo `suporte-lojinha-00055-jt4` com logs limpos nas últimas 24h.  
- Comunicação do release enviada ao time (linkando este documento + changelog).

> Após esses passos, o marco `v2.3.0` é oficialmente o baseline do ambiente de produção. Parabéns! 🎉

