# Changelog - Sistema de Suporte

## [v2.3.0] - 2025-11-30

### 🎉 Novas Funcionalidades

#### Central de Notificações em Tempo Real
- **NotificationCenterProvider** agrega tickets, conversas e alertas de gestores em um único fluxo (App + `DashboardHeader`).
- **NotificationBell** entrega badges de não lidos, botão de silenciar áudio e leitura em lote para admins, gestores e usuários finais.
- **Toasts com áudio leve** informam novos chamados/interações sem que o usuário precise atualizar a página.

#### Avisos e Banner de Comunicação Dirigida
- **AdminSupportNotices** cria banners ricos com editor WYSIWYG, filtros por empresa e flags `showOnHome`/`showOnSupport`.
- **CompanyNoticePanel** permite avisos rápidos diretamente do cadastro da empresa.
- **SupportNoticeBanner** exibe alertas contextuais no Home e no SupportArea, com botão de recolher e atalho para notificações.

#### Biblioteca de Respostas Padrão
- **AdminDefaultResponses** gerencia scripts por empresa (perguntas, resposta, palavras-chave, categoria, status).
- Integração opcional com **KnowledgeBase** e **autoLearning** para promover respostas aprovadas ao treinamento do Gemini.
- Registro de uso e filtros por empresa/busca para acelerar onboarding de novos atendentes.

#### Escalonamento e Alertas para Gestores
- **managerEscalationService** converte solicitações críticas em tickets priorizados e sincroniza status com o gestor.
- **managerNotificationService** provê feed dedicado (`managerNotifications`) consumido no Dashboard do gestor.
- **ManagerDashboard** ganhou abas para escalar pedidos, acompanhar status e configurar preferências individuais.

#### Experiência do Gestor
- **ManagerProfileService** armazena nome, e-mail, timezone e preferências de canais (in-app, email) por empresa.
- **OrderCelebration** celebra os últimos pedidos e destaca ganho de receita de forma animada.
- **orderCacheService** reduz latência ao guardar o último snapshot de pedidos por empresa no Firestore.

### 🔧 Melhorias

- SupportArea abre com o novo `SupportNoticeBanner`, mantendo avisos críticos visíveis antes das abas.
- Tabs, cards e diálogos foram revisados para acessibilidade (botões maiores, estados de loading e placeholders empáticos).
- Scripts `deploy-auto.sh`/`deploy.sh` receberam revisão final para apontar para `https://suporte-lojinha-409489811769.southamerica-east1.run.app` e validar o revision `suporte-lojinha-00033-tlx`.
- Documentação reorganizada (README, DEPLOY.md, CHECKLIST, RESUMOS e specs) descreve o pipeline automático e as coleções recém-criadas (`supportNotices`, `managerNotifications`, `managerEscalations`, `defaultResponses`, `managerProfiles`, `companyOrdersCache`).

### 🐛 Correções & Hardenings

- Normalização extra em `notificationService` evita inconsistências quando `updatedAt` vem como `Timestamp` ou número.
- `SupportArea`, `AdminDashboard` e `ManagerDashboard` agora protegidos contra dados `undefined` para evitar que salvamentos Firestore falhem.
- Ajustes de segurança nos serviços novos garantem `localStorage` isolado por escopo e fallback quando permissões de áudio falham.
- `deploy-auto.sh` aborta imediatamente se `cloudbuild.yaml` ou `Dockerfile` não estiverem presentes e denuncia URL divergente da esperada.
- `findOrdersByCustomer` passou a consultar `customer_email` e `shipping_email` (além de `customer_phone`) em chamadas separadas, unificando os resultados para que o painel do gestor sempre liste os pedidos mesmo quando a Cubbo só preenche um dos campos.

## [v1.8.0] - 2025-01-XX

### 🎉 Novas Funcionalidades

#### Sistema de Pontos
- **Novo Tipo de Chamado**: Adicionado assunto "pontos" para problemas com sistema de pontos/fidelidade
- **Formulário Especializado**: Formulário com campos específicos para problemas de pontos (tipo de problema, quantidade de pontos, pedido relacionado)
- **Detecção Inteligente**: Chatbot detecta automaticamente menções de problemas com pontos
- **Respostas Tranquilizadoras**: Chatbot acalma usuários e explica o processo de resolução
- **Memória de Resoluções**: Sistema inclui resoluções anteriores de problemas com pontos no contexto do chat
- **Filtro Admin**: Filtro por assunto no painel admin incluindo "Problema com Pontos"

#### Endereço da Loja (Store URL)
- **Cadastro na Empresa**: Admin pode cadastrar URL da loja no cadastro de empresas
- **Atribuição Automática**: URL da loja é automaticamente atribuída aos usuários quando empresa é identificada
- **Botão "Voltar para a Loja"**: Botão visível no dashboard do cliente quando URL da loja está disponível
- **Responsivo**: Botão adapta texto para mobile ("Loja") e desktop ("Voltar para a Loja")

### 🔧 Melhorias de UX

#### Responsividade
- **Abas Visíveis**: Corrigido problema onde abas eram ocultadas em mobile
- **Layout Flexível**: TabsList agora usa flex com wrap para garantir visibilidade de todas as abas
- **Scroll Horizontal**: Abas podem fazer scroll horizontal quando necessário em telas pequenas
- **Botão de Chamado**: Botão "Abrir Chamado" agora visível na aba de chat

#### Chatbot
- **Memória Aprimorada**: Sistema busca e inclui resoluções anteriores de tickets de pontos no contexto
- **Referência a Casos Anteriores**: Chatbot pode mencionar que casos similares foram resolvidos anteriormente
- **Processo de Resolução**: Informações sobre prazo de retorno (3 dias úteis) e processo de investigação

### 🐛 Correções

- ✅ Corrigido layout responsivo das abas que ocultava aba de chat em mobile
- ✅ Adicionado botão "Abrir Chamado" na aba de chat
- ✅ Melhorada detecção e tratamento de problemas com pontos no chatbot
- ✅ Adicionado contexto de resoluções anteriores no buildFAQContext

## [v1.7.0] - 2025-01-XX

### 🔧 Correções Técnicas (2025-01-XX)

#### TypeScript e Build
- ✅ Corrigido `BadgeProps` para aceitar `children` explicitamente
- ✅ Corrigido escopo de `finalCompanyId` em `AdminFAQ.tsx`
- ✅ Adicionado tipo `FAQAttachment` em `types.ts`
- ✅ Adicionado campo `rows` em `FormField` interface
- ✅ Adicionado export de `storage` em `firebase.ts`
- ✅ Adicionados tipos `CustomerKnowledge` e `CustomerKnowledgeEntry`
- ✅ Corrigido uso inconsistente da API Gemini (`getGenerativeModel` → `models.generateContent`)

#### Build e Deploy
- ✅ Build passa sem erros críticos
- ✅ Warnings CSS do DaisyUI são não-críticos e podem ser ignorados

### 🎉 Novas Funcionalidades

#### FAQ Multi-tenant por Cliente
- **Admin Geral**: Pode criar/editar FAQs e associá-las a clientes específicos via select box
- **Managers**: Podem criar/editar FAQs apenas para sua empresa (automático)
- **FAQ Geral**: Opção para marcar FAQ como "Geral" (visível para todos os clientes)
- **Badges Visuais**: Listagem mostra badge indicando qual cliente a FAQ pertence
- **Filtragem Automática**: Clientes veem apenas FAQs da sua empresa + FAQs gerais

#### Integração FAQ com Gemini AI
- **Contexto Dinâmico**: FAQ agora está disponível no contexto do Gemini AI para aprendizado contínuo
- **Filtragem por Cliente**: Gemini AI recebe apenas FAQs relevantes ao cliente (empresa específica + gerais)
- **Aprendizado Automático**: O chatbot aprende com o conteúdo do FAQ para responder melhor às perguntas

#### Visualização Admin como Cliente
- **Seleção de Cliente**: Admin pode escolher qual cliente visualizar antes de entrar no modo cliente
- **Perfil Correto**: Perfil mostra dados do cliente selecionado (nome da empresa, email fictício)
- **Gerenciamento FAQ**: Admin pode gerenciar FAQs do cliente selecionado diretamente na visualização de cliente
- **Aba Dedicada**: Nova aba "⚙️ Gerenciar FAQ" disponível quando admin visualiza como cliente

### 🐛 Correções

#### Permissões e Firestore (2025-11-17)
- ✅ Corrigido erro ao salvar conversas com campos `undefined`
- ✅ Removidos campos `undefined` antes de salvar no Firestore
- ✅ Melhorados logs para debug de pedidos Cubbo
- ✅ Adicionados comentários claros nas regras do Firestore

#### Select Boxes
- **Problema**: Select boxes pararam de abrir em toda a plataforma
- **Solução**: 
  - Aumentado z-index padrão de `z-50` para `z-[9999]`
  - Adicionado `modal={false}` no SelectContent para funcionar dentro de Dialogs
  - Todos os SelectContent agora têm z-index alto (`z-[10000]`) para aparecer sobre Dialogs

#### Perfil do Cliente
- **Problema**: Quando admin visualizava como cliente, mostrava perfil do admin ao invés do cliente
- **Solução**: 
  - Criado componente `AdminClientView` que carrega dados da empresa selecionada
  - MockUser agora usa nome e email baseados na empresa selecionada
  - ProfileModal atualiza corretamente quando user muda

#### Criação/Edição FAQ para Managers
- **Problema**: Managers não conseguiam criar/editar FAQs
- **Solução**: 
  - Lógica corrigida para sempre usar `companyId` do manager ao criar/editar
  - Formulário funciona corretamente para managers

### 🔧 Melhorias Técnicas

#### Logs de Erro
- Logs melhorados em todos os serviços
- Mensagens de erro mais descritivas
- Contexto adicional nos logs para facilitar debugging

#### Componentes
- `AdminClientView.tsx`: Novo componente para visualização admin como cliente
- `AdminFAQ.tsx`: Adicionado select de cliente e badges visuais
- `SupportArea.tsx`: Adicionada aba "Gerenciar FAQ" quando em modo admin
- `UserDashboard.tsx`: Suporte para `adminSelectedCompanyId` e `adminMode`

#### Serviços
- `faqService.ts`: Já suportava `companyId` (sem mudanças necessárias)
- `geminiService.ts`: Adicionada função `buildFAQContext()` e parâmetro `companyId` em `getGeminiResponse()`

### 📚 Documentação

- README.md atualizado com novas funcionalidades
- DEPLOY_CHECKLIST.md atualizado
- CHANGELOG.md criado
- Documentação de erros atualizada

### 🔒 Segurança

- Nenhuma mudança de segurança necessária
- Todas as validações existentes mantidas

---

## [v1.6.0] - 2025-11-06

### Funcionalidades Anteriores
- Sistema de FAQ completo
- Base de conhecimento
- Formulário dinâmico de tickets
- Sistema de conversas do chatbot
- Autenticação por código de email

---

**Nota**: Versões anteriores documentadas em arquivos separados.

