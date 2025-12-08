# 🛠️ Especificação de Serviços

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve todos os serviços internos e externos utilizados no sistema.

## 🔧 Serviços Internos

### 1. Support Service

**Arquivo:** `services/supportService.ts`  
**Tipo:** Serviço de negócio principal

#### Funcionalidades

##### Tickets
- `getTickets(includeArchived?)` - Listar todos os tickets (opcionalmente incluir arquivados)
- `getTicketsByUser()` - Listar tickets do usuário (automaticamente filtra arquivados)
- `createTicket()` - Criar novo ticket
- `updateTicketStatus()` - Atualizar status do ticket
- `addTicketComment()` - Adicionar comentário
- `archiveTicket(ticketId)` - Arquivar chamado (muda status para 'arquivado')
- `unarchiveTicket(ticketId)` - Reativar chamado arquivado (restaura status anterior)

##### Pedidos Cubbo
- `trackOrder(orderId)` - Rastrear pedido específico
- `findOrdersByCustomer(user)` - Buscar pedidos do cliente
- `formatOrderDetails(order)` - Formatar detalhes do pedido

##### Base de Conhecimento
- `getKnowledgeBase()` - Obter conteúdo do FAQ
- `updateKnowledgeBase(content)` - Atualizar FAQ

##### Configurações de API
- `getApiConfigs()` - Listar configurações
- `saveApiConfig(id, config)` - Salvar configuração
- `testApiConnection()` - Testar conexão Cubbo

##### Email
- `sendTicketReplyEmail(emailData)` - Enviar resposta por email

##### FAQ Search
- `searchFAQ(queryText)` - Buscar no FAQ (legado)
- `getTicketFormConfig(subject)` - Obter configuração de formulário dinâmico

#### Dependências
- Firebase Firestore
- Cubbo API (via proxy)
- Postmark API (via proxy)
- FAQ Service
- Knowledge Base Service

### 2. Gemini Service

**Arquivo:** `services/geminiService.ts`  
**Tipo:** Serviço de IA

#### Funcionalidades

- `getGeminiResponse(history, userMessage)` - Obter resposta do chatbot
  - Processa mensagem do usuário com histórico
  - Usa function calling para ações específicas
  - Retorna resposta do Gemini com possíveis function calls

- `searchIntelligentFAQ(query)` - Busca inteligente de FAQ
  - Combina busca no FAQ e Knowledge Base
  - Usa Gemini para sintetizar resposta completa
  - Retorna resposta sintetizada, fontes e perguntas sugeridas
  - Fallback para primeira resposta do FAQ se Gemini não disponível

#### Tools (Function Calling)

1. **findCustomerOrders**
   - Busca pedidos do cliente automaticamente
   - Usa email/telefone do usuário logado

2. **trackOrder**
   - Rastreia pedido específico por ID

3. **initiateExchange**
   - Inicia processo de troca

4. **searchFAQ**
   - Busca na base de conhecimento (legado)

5. **searchIntelligentFAQ**
   - Busca inteligente que combina FAQ e Knowledge Base
   - Usa Gemini para sintetizar resposta completa
   - Retorna fontes e perguntas sugeridas

6. **openSupportTicket**
   - Abre formulário de chamado com tipo de assunto específico
   - Parâmetros: `subject` (enum: cancelamento, reembolso, troca, produto_defeituoso, produto_nao_recebido, produto_errado, atraso_entrega, duvida_pagamento, outro), `orderNumber` (opcional)
   - Gemini AI identifica automaticamente o tipo de assunto baseado na conversa
   - Formulário abre pré-preenchido com assunto correto

7. **escalateToHuman**
   - Escala para atendente humano

#### Configuração

- **Modelo:** `gemini-2.5-flash`
- **API Key:** `VITE_GEMINI_API_KEY`
- **Idioma:** Português do Brasil

### 3. FAQ Service

**Arquivo:** `services/faqService.ts`  
**Tipo:** Serviço de gerenciamento de FAQ

#### Funcionalidades

- `getFAQEntries(category?)` - Listar FAQs por categoria
  - Filtra por categoria se fornecida
  - Ordena por `order` e `createdAt`
  - Retorna apenas entradas ativas (`active !== false`)
  - Usa fallback em memória se índice não estiver disponível

- `getFAQEntry(id)` - Buscar FAQ por ID
  - Retorna entrada específica ou `null` se não encontrada

- `getAllFAQEntries()` - Listar todas as entradas (incluindo inativas)
  - Útil para admin
  - Ordenado por `order`

- `createFAQEntry(data)` - Criar nova FAQ
  - Calcula `order` automaticamente se não fornecido
  - Inicializa `views: 0` e `helpful: 0`
  - Define timestamps automaticamente

- `updateFAQEntry(id, data)` - Atualizar FAQ
  - Atualiza `updatedAt` automaticamente
  - Permite atualização parcial

- `deleteFAQEntry(id)` - Deletar FAQ
  - Remove entrada permanentemente

- `searchFAQ(query)` - Buscar no FAQ
  - Busca por texto em pergunta, resposta e tags
  - Usa sistema de scoring por relevância
  - Retorna até 10 resultados ordenados por relevância
  - Retorna apenas entradas ativas

- `incrementFAQViews(id)` - Incrementar visualizações
  - Usa `increment(1)` do Firestore
  - Operação não crítica (não lança erro)

- `markFAQHelpful(id)` - Marcar como útil
  - Incrementa contador de feedback útil
  - Operação não crítica (não lança erro)

- `reorderFAQEntries(entries)` - Reordenar FAQs
  - Atualiza `order` de múltiplas entradas
  - Útil para admin reorganizar ordem

#### Dependências

- Firebase Firestore (collection: `faq`)

#### Estrutura de Dados

```typescript
interface FAQEntry {
  id?: string;
  question: string;
  answer: string;
  category: FAQCategory; // 'compra' | 'troca' | 'rastreio' | 'cancelamento' | 'reembolso' | 'sla' | 'geral'
  tags: string[];
  order: number;
  active: boolean;
  views?: number;
  helpful?: number;
  createdAt: number;
  updatedAt: number;
}
```

### 4. Knowledge Base Service

**Arquivo:** `services/knowledgeBaseService.ts`  
**Tipo:** Serviço de base de conhecimento

#### Funcionalidades

- `getKnowledgeBaseEntries(filters?)` - Listar entradas
  - Filtros opcionais: `category`, `verified`
  - Ordenado por `createdAt` (descendente)
  - Retorna todas as entradas se nenhum filtro fornecido

- `getKnowledgeEntry(id)` - Buscar entrada por ID
  - Retorna entrada específica ou `null` se não encontrada

- `createKnowledgeEntry(data)` - Criar nova entrada
  - Define `verified: false` por padrão
  - Inicializa `relatedTickets: []` se não fornecido
  - Define timestamps automaticamente

- `updateKnowledgeEntry(id, data)` - Atualizar entrada
  - Atualiza `updatedAt` automaticamente
  - Permite atualização parcial

- `deleteKnowledgeEntry(id)` - Deletar entrada
  - Remove entrada permanentemente

- `searchKnowledgeBase(query, useGemini?)` - Buscar na base
  - Busca por relevância em título, conteúdo e tags
  - Retorna apenas entradas verificadas por padrão (`verified: true`)
  - Usa sistema de scoring
  - Retorna resposta sintetizada e fontes (até 5 resultados)
  - Parâmetro `useGemini` não é usado atualmente (integração feita no geminiService)

- `suggestFromTicket(ticketId)` - Criar sugestão de ticket resolvido
  - Extrai informações de ticket resolvido
  - Cria entrada não verificada na base de conhecimento
  - Extrai categoria e tags automaticamente do ticket
  - Relaciona ticket à entrada criada
  - Retorna ID da entrada criada ou `null` em caso de erro

- `verifyKnowledgeEntry(id)` - Verificar entrada
  - Marca entrada como verificada (`verified: true`)
  - Usado por admin para aprovar sugestões

#### Dependências

- Firebase Firestore (collection: `knowledgeBase`)
- Support Service (para buscar tickets em `suggestFromTicket`)

#### Estrutura de Dados

```typescript
interface KnowledgeBaseEntry {
  id?: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: 'faq' | 'ticket' | 'manual' | 'gemini';
  relatedTickets?: string[];
  verified: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### 5. Auth Service

**Arquivo:** `services/authService.ts`  
**Tipo:** Serviço de autenticação

#### Funcionalidades

- `generateAuthCode(email)` - Gerar código de 4 dígitos
  - Gera código aleatório entre 1000-9999
  - Salva no Firestore com expiração de 5 minutos
  - Invalida códigos anteriores do mesmo email
  - Retorna o código gerado

- `validateAuthCode(email, code, markAsUsed?)` - Validar código
  - Verifica se código existe e não foi usado
  - Verifica se não expirou (5 minutos)
  - Parâmetro `markAsUsed` (padrão: `true`) controla se marca como usado
  - Retorna `true` se válido, `false` caso contrário

- `sendAuthCodeEmail(email, code)` - Enviar email com código
  - Envia email formatado via Postmark proxy
  - Inclui código de 4 dígitos destacado
  - Retorna resultado da operação

- `resetPasswordWithCode(email, code)` - Resetar senha usando código
  - Valida código de autenticação
  - Chama Firebase Auth Reset Proxy (backend)
  - Backend usa Firebase Admin SDK para resetar senha ou criar usuário
  - Marca código como usado após operação bem-sucedida
  - Retorna resultado da operação

#### Dependências

- Firebase Firestore (collection: `authCodes`)
- Postmark Email Proxy (para envio de emails)
- Firebase Auth Reset Proxy (para reset de senha)

#### Estrutura de Dados

```typescript
interface AuthCode {
  email: string;
  code: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  used: boolean;
}
```

### 6. Conversation Service

**Arquivo:** `services/conversationService.ts`  
**Tipo:** Serviço de gerenciamento de conversas do chatbot

#### Funcionalidades

- `saveConversation(userId, sessionId, messages, orderNumbers?)` - Salvar conversa
  - Salva nova conversa no Firestore
  - Inicializa `resolved: false` e `attempts: 0`
  - Retorna ID da conversa criada

- `updateConversation(conversationId, updates)` - Atualizar conversa
  - Atualiza campos da conversa
  - Atualiza `updatedAt` automaticamente

- `getConversationHistory(userId, limitCount?)` - Buscar histórico
  - Busca últimas conversas do usuário (padrão: 3)
  - Ordenado por `createdAt` (descendente)
  - Usado para contexto em novas conversas

- `getLastConversation(userId)` - Buscar última conversa
  - Retorna última conversa do usuário
  - Usado para detectar usuários retornantes

- `getConversationById(conversationId)` - Buscar por ID
  - Retorna conversa específica ou `null`

- `addFeedback(conversationId, rating, comment?)` - Adicionar feedback
  - Adiciona rating (1-5) e comentário opcional
  - Marca conversa como resolvida (`resolved: true`)

- `incrementAttempts(conversationId)` - Incrementar tentativas
  - Incrementa contador de tentativas sem resolução
  - Usado para detectar quando escalar para humano

- `getOrCreateSessionId()` - Gerar/recuperar sessionId
  - Gera UUID único se não existir no localStorage
  - Expira após 30 dias
  - Retorna sessionId atual ou novo

- `isSessionValid()` - Verificar sessão válida
  - Verifica se sessionId ainda é válido (não expirado)
  - Retorna `true` se válido, `false` se expirado

#### Dependências

- Firebase Firestore (collection: `conversations`)
- localStorage (para persistência de sessionId)

#### Estrutura de Dados

```typescript
interface Conversation {
  id?: string;
  userId: string; // Email do usuário
  sessionId: string; // UUID único da sessão
  messages: ConversationMessage[];
  orderNumbers: string[]; // Códigos de pedidos mencionados
  resolved: boolean;
  feedback?: {
    rating: number; // 1-5
    comment?: string;
    timestamp: number;
  };
  attempts: number;
  createdAt: number;
  updatedAt: number;
}

interface ConversationMessage {
  text: string;
  sender: MessageSender; // 'user' | 'bot' | 'system'
  timestamp: number;
  functionCalls?: Array<{
    name: string;
    args: any;
  }>;
  orderNumbers?: string[];
}
```

### 7. Default Response Service

**Arquivo:** `services/defaultResponseService.ts`  
**Coleção:** `defaultResponses`

#### Funcionalidades
- `getDefaultResponses(companyId, activeOnly?)` – retorna respostas de uma empresa ordenadas por `usageCount`.
- `createDefaultResponse(data)` / `updateDefaultResponse(id, data)` / `deleteDefaultResponse(id)` – CRUD completo.
- `incrementUsage(id)` – incrementa contador de uso e `updatedAt`.
- `findMatchingResponse(question, companyId, threshold?)` – aplica normalização, similaridade por palavras e bônus por uso para sugerir a melhor resposta.

#### Notas
- Mantém `keywords`, `category`, flags `includeInLearning`/`includeInAutoLearning`.
- Utilizado pelo `AdminDefaultResponses` e pelo chatbot (para respostas rápidas antes do Gemini).

### 8. Support Notice Service

**Arquivo:** `services/supportNoticeService.ts`  
**Coleção:** `supportNotices`

#### Funcionalidades
- `listen(filters, handler)` / `listenActive(filters, handler)` – ouvem avisos ativos/inativos filtrando por empresa/local (`home`, `support` ou `all`).
- `create(data)` / `update(id, data)` / `toggleActive(id, active)` / `remove(id)` – CRUD com timestamps automáticos.
- `getAll()` / `getById(id)` – consultas diretas.

#### Estrutura
```ts
interface SupportNotice {
  id?: string;
  title: string;
  content: string; // HTML rico (sanitizado no render)
  active: boolean;
  showOnHome: boolean;
  showOnSupport: boolean;
  targetCompanyIds: string[];
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  updatedBy?: string;
}
```

### 9. Notification Service

**Arquivo:** `services/notificationService.ts`

#### Funcionalidades
- `listenToTicketNotifications({ scope, limit }, handler)` – tickets recentes filtrados por `email` (usuário) ou `companyId` (admin).
- `listenToConversationNotifications({ scope, limit }, handler)` – conversas recentes; usuários finais filtram por `userId`.

#### Escopos suportados
```ts
type NotificationScope =
  | { role: 'admin' }
  | { role: 'manager'; companyId: string }
  | { role: 'user'; email: string };
```

Ambos os listeners retornam objetos `NotificationItem` com `id`, `title`, `summary`, `status`, `createdAt` e `meta` (priority, ticketId, orderNumber, etc.).

### 10. Manager Notification Service

**Arquivo:** `services/managerNotificationService.ts`  
**Coleção:** `managerNotifications`

#### Funcionalidades
- `publish(payload)` – grava notificações para gestores (novo pedido, atualização de escalonamento, etc.).
- `listen(companyId, handler)` – retorna últimas notificações de uma empresa em tempo real.
- `fetch({ companyId, cursor?, pageSize? })` – paginação manual.
- `markAsRead(notificationId, managerEmail)` – registra leitura (array `readBy`).

### 11. Manager Escalation Service

**Arquivo:** `services/managerEscalationService.ts`  
**Coleção:** `managerEscalations`

#### Funcionalidades
- `createEscalation(payload)` – cria ticket de prioridade alta, registra escalation e publica notificação para o gestor.
- `getEscalation(id)` / `listEscalations({ companyId, status?, search?, cursor? })`.
- `updateEscalationStatus(id, status, adminSummary?)` – sincroniza estado com `managerNotificationService` e atualiza o ticket relacionado.

### 12. Manager Profile Service

**Arquivo:** `services/managerProfileService.ts`  
**Coleção:** `managerProfiles`

#### Funcionalidades
- `getProfile(companyId)` / `listenToProfile(companyId, handler)` – recupera/observa perfil do gestor.
- `upsertProfile(companyId, payload)` – atualiza nome, email, timezone e preferências. Sincroniza com `companyService` e garante permissões (`grantManagerAccess` / `revokeManagerAccess`).
- `updateNotificationPreferences(companyId, prefs)` – substitui preferências rapidamente.
- `markCelebrationSeen(companyId)` – registra último acesso ao feed de celebrações.

#### Estrutura (resumo)
```ts
interface ManagerProfile {
  id?: string;
  companyId: string;
  name: string;
  email: string;
  timezone?: string;
  notificationPreferences: {
    newOrders: boolean;
    escalations: boolean;
    celebrationFeed: boolean;
    channels: Array<'in_app' | 'email'>;
  };
  lastCelebrationSeenAt?: number;
  createdAt: number;
  updatedAt: number;
}
```

### 13. Order Cache Service

**Arquivo:** `services/orderCacheService.ts`  
**Coleção:** `companyOrdersCache`

#### Funcionalidades
- `getCompanyCache(companyId)` – retorna até 50 pedidos em cache + `expiresAt`.
- `setCompanyCache(companyId, orders, ttlMs?)` – persiste snapshot sanitizado das orders (TTL padrão 5 minutos).

Usado pelo `ManagerDashboard` para reduzir chamadas diretas à API Cubbo e permitir UI de “Novas orders celebradas”.

## ☁️ Serviços Cloud Run

### 1. Cubbo Auth Proxy

**Nome:** `cubbo-auth-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`

#### Especificações

- **Runtime:** Node.js
- **Porta:** 8080 (Cloud Run)
- **Timeout:** 60s
- **Memória:** 256Mi
- **CPU:** 1

#### Variáveis de Ambiente

- `CUBBO_CLIENT_ID` (obrigatório)
- `CUBBO_CLIENT_SECRET` (obrigatório)
- `PORT` (opcional, padrão: 8080)

#### Endpoints

- `POST /` - Obter token Cubbo

**Arquivo:** `cubbo-auth-proxy/index.js`

### 2. Postmark Email Proxy

**Nome:** `postmark-email-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://postmark-email-proxy-409489811769.southamerica-east1.run.app`

#### Especificações

- **Runtime:** Node.js
- **Porta:** 8080 (Cloud Run)
- **Timeout:** 60s
- **Memória:** 256Mi
- **CPU:** 1

#### Variáveis de Ambiente

- `POSTMARK_SERVER_TOKEN` (obrigatório) - Valor: `ee246569-f54b-4986-937a-9288b25377f4`
- `FROM_EMAIL` (obrigatório) - Valor: `atendimento@yoobe.co` (confirmado e verificado no Postmark)
- `PORT` (opcional, padrão: 8080)

#### Endpoints

- `POST /` - Enviar email

**Arquivo:** `postmark-email-proxy/index.js`

### 3. Firebase Auth Reset Proxy

**Nome:** `firebase-auth-reset-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app`

#### Especificações

- **Runtime:** Node.js
- **Porta:** 8080 (Cloud Run) ou 8081 (local)
- **Timeout:** 60s
- **Memória:** 256Mi
- **CPU:** 1

#### Variáveis de Ambiente

- `FIREBASE_SERVICE_ACCOUNT` (obrigatório) - Service Account JSON (pode ser base64 encoded)
- `PORT` (opcional, padrão: 8080 no Cloud Run, 8081 local)

#### Endpoints

- `GET /` - Health check
- `POST /reset-password` - Resetar senha usando código de autenticação

#### Funcionalidade

- Valida código de autenticação no Firestore
- Usa Firebase Admin SDK para resetar senha ou criar usuário
- Marca código como usado após operação bem-sucedida
- Cria usuário se não existir

**Arquivo:** `firebase-auth-reset-proxy/index.js`

### 4. Aplicação Principal

**Nome:** `suporte-lojinha`  
**Região:** `southamerica-east1`  
**URL:** `https://suporte-lojinha-409489811769.southamerica-east1.run.app`

#### Especificações

- **Runtime:** NGINX (servindo build React)
- **Porta:** 8080 (Cloud Run)
- **Timeout:** 300s
- **Memória:** 512Mi
- **CPU:** 1
- **Máx. Instâncias:** 10

#### Build Variables

- `VITE_GEMINI_API_KEY` (passada durante build)

**Arquivo:** `Dockerfile`

## 🔄 Fluxos de Serviço

### Fluxo de Busca de Pedidos

1. Cliente pergunta no chat: "Quais são meus pedidos?"
2. Gemini identifica intenção e chama `findCustomerOrders`
3. `supportService.findOrdersByCustomer()` busca na Cubbo API
4. Proxy autentica e obtém token
5. Frontend chama `GET /v1/orders?customer_email={email}`
6. Resultados formatados e exibidos ao cliente

### Fluxo de Criação de Ticket

1. Cliente preenche formulário
2. `supportService.createTicket()` salva no Firestore
3. Email de confirmação enviado via Postmark proxy
4. Ticket exibido no dashboard do cliente

### Fluxo de Chatbot

1. Cliente envia mensagem
2. `geminiService.getGeminiResponse()` processa
3. Gemini pode chamar functions (tools)
4. Functions executam ações via `supportService`
5. Resposta formatada retornada ao cliente

## 📊 Dependências entre Serviços

```
Frontend (React)
├── Firebase Auth
├── Firebase Firestore
├── Gemini Service
│   └── Google Gemini API
├── FAQ Service
│   └── Firebase Firestore (faq)
├── Knowledge Base Service
│   ├── Firebase Firestore (knowledgeBase)
│   └── Support Service
├── Conversation Service
│   └── Firebase Firestore (conversations)
├── Auth Service
│   ├── Firebase Firestore (authCodes)
│   ├── Postmark Email Proxy
│   └── Firebase Auth Reset Proxy
└── Support Service
    ├── Firebase Firestore
    ├── Cubbo Auth Proxy
    │   └── Cubbo API
    └── Postmark Email Proxy
        └── Postmark API
```

## ⚠️ Regras de Mudança

### ❌ NUNCA modificar sem:
1. Consultar esta spec
2. Testar em ambiente isolado
3. Atualizar documentação
4. Verificar dependências

### ✅ SEMPRE fazer quando:
1. Adicionar novo serviço
2. Modificar lógica de negócio
3. Mudar integrações
4. Atualizar configurações Cloud Run

## 🔄 Changelog

### v1.3.0 (2025-11-06)
- ✅ Gemini Service atualizado com tipos de assunto específicos
- ✅ Função `openSupportTicket` agora aceita `subject` e `orderNumber`
- ✅ Instruções do sistema atualizadas com tipos de chamados
- ✅ Integração chatbot com identificação automática de assunto

### v1.2.0 (2025-11-06)
- ✅ Adicionado Conversation Service completo
- ✅ Adicionado Firebase Auth Reset Proxy
- ✅ Atualizado Auth Service com `resetPasswordWithCode`
- ✅ Documentação completa de Conversation Service
- ✅ Atualizado diagrama de dependências

### v1.1.0 (2025-01-XX)
- ✅ Adicionado FAQ Service com CRUD completo
- ✅ Adicionado Knowledge Base Service com busca inteligente
- ✅ Adicionado Auth Service para autenticação por código
- ✅ Atualizado Gemini Service com `searchIntelligentFAQ`
- ✅ Documentação completa de novos serviços

### v1.0.0 (2025-11-05)
- Documentação inicial de todos os serviços
- Especificação de serviços Cloud Run
- Fluxos de serviço documentados
- Dependências mapeadas



