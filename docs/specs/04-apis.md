# 🌐 Especificação de APIs

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve todas as APIs externas e endpoints internos utilizados no sistema.

## 🔌 APIs Externas

### 1. Firebase API

**Tipo:** Backend as a Service  
**Documentação:** https://firebase.google.com/docs

#### Endpoints Utilizados

##### Firestore Database
- **Collection:** `tickets` - Chamados de suporte
- **Collection:** `apiConfigs` - Configurações de APIs
- **Collection:** `knowledgeBase` - Base de conhecimento (legado)
- **Collection:** `faq` - FAQ entries (novo)
- **Collection:** `knowledgeBaseEntries` - Entradas da base de conhecimento (novo)
- **Collection:** `authCodes` - Códigos de autenticação temporários
- **Collection:** `conversations` - Conversas do chatbot

##### Authentication
- `sendSignInLinkToEmail()` - Envio de link de autenticação
- `signInWithEmailLink()` - Autenticação via link
- `signInWithPhoneNumber()` - Autenticação via SMS
- `signOut()` - Logout

**Configuração:** Ver `01-authentication.md`

### 2. Google Gemini API

**Tipo:** AI Service  
**Documentação:** https://ai.google.dev/  
**Base URL:** `https://generativelanguage.googleapis.com`

#### Endpoint Principal

**Modelo:** `gemini-2.5-flash`

**Uso:** Chatbot de suporte com function calling

**Funções Disponíveis:**
- `findCustomerOrders` - Buscar pedidos do cliente por email/telefone
- `trackOrder` - Rastrear pedido específico OU buscar por email. O cliente pode informar código do pedido OU email. O sistema valida automaticamente que o pedido pertence ao cliente logado.
- `initiateExchange` - Iniciar processo de troca
- `searchFAQ` - Buscar na base de conhecimento e FAQ usando busca inteligente com Gemini
- `openSupportTicket` - Abrir chamado de suporte com tipo de assunto específico. Parâmetros: `subject` (enum: cancelamento, reembolso, troca, produto_defeituoso, produto_nao_recebido, produto_errado, atraso_entrega, duvida_pagamento, outro), `orderNumber` (opcional)
- `escalateToHuman` - Escalar para atendente humano

**Função Adicional:**
- `searchIntelligentFAQ(query: string)` - Busca inteligente que combina FAQ e Knowledge Base, usando Gemini para sintetizar resposta completa. Retorna resposta sintetizada, fontes e perguntas sugeridas.

**Segurança em trackOrder:**
- Se cliente informar código do pedido: valida contra email do cliente logado
- Se cliente informar email: busca todos os pedidos daquele email
- Validação automática para garantir que pedidos só sejam mostrados ao dono

**Autenticação:** API Key via `VITE_GEMINI_API_KEY`

**Arquivo:** `services/geminiService.ts`

### 3. Cubbo API

**Tipo:** E-commerce API  
**Documentação:** https://developers.cubbo.com/  
**Base URL:** `https://api.cubbo.com`

#### Endpoints Utilizados

##### Autenticação
- **Endpoint:** `POST /v1/auth/token`
- **Método:** OAuth 2.0 Client Credentials
- **Grant Type:** `client_credentials`
- **Proxy:** Sim (via Cloud Run)

**Request:**
```http
POST /v1/auth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "expires_in": 86400,
  "type": "Bearer"
}
```

##### Pedidos

**Buscar por Email ou Telefone:**
- **Endpoint:** `GET /v1/orders?customer_email={email}&store_id={storeId}`
- **Endpoint:** `GET /v1/orders?customer_phone={phone}&store_id={storeId}`
- **Response:** `{ orders: [...] }` - Array de pedidos

**Buscar por Número do Pedido (order_number):**
- **Endpoint:** `GET /v1/orders?store_id={storeId}&order_number={orderNumber}`
- **IMPORTANTE:** A API Cubbo busca por `order_number` usando QUERY PARAMETER, não path parameter
- **NÃO use:** `GET /v1/orders/{orderId}` (path parameter não funciona)
- **USE:** `GET /v1/orders?store_id=X&order_number=Y` (query parameter)
- **Response:** `{ orders: [{ ... }] }` - Array com o pedido encontrado (pegar `orders[0]`)

**IMPORTANTE:** 
- O parâmetro `store_id` é OBRIGATÓRIO em todas as requisições de pedidos
- Para buscar por número do pedido, use `order_number` como query parameter
- O código do pedido deve ser usado EXATAMENTE como fornecido (com hífens, duplicações, etc.)
- A resposta sempre retorna `{ orders: [...] }` mesmo para busca individual

**Headers:**
```http
Authorization: Bearer {access_token}
```

**Response (Lista):**
```json
{
  "orders": [
    {
      "id": "string",
      "order_number": "string",
      "status": "string",
      "items_summary": ["string"],
      "products": [
        {
          "sku": "string",
          "quantity": 1,
          "name": "string",
          "price": 0.0,
          "total": 0.0
        }
      ],
      "items": [
        {
          "sku": "string",
          "name": "string",
          "quantity": 1,
          "price": 0.0,
          "total": 0.0
        }
      ],
      "shipping_information": {
        "tracking_url": "string",
        "tracking_number": "string",
        "courier": "string",
        "email": "string",
        "estimated_time_arrival": "string"
      },
      "shipping": {
        "first_name": "string",
        "last_name": "string",
        "phone": "string",
        "email": "string",
        "address1": "string",
        "address2": "string",
        "city": "string",
        "province": "string",
        "zip_code": "string",
        "country": "string"
      },
      "shipping_address": {
        "street": "string",
        "street_number": "string",
        "neighborhood": "string",
        "city": "string",
        "state": "string",
        "zip_code": "string",
        "country": "string",
        "complement": "string",
        "reference": "string"
      },
      "pickup_location": {
        "service_name": "string",
        "description": "string",
        "source": "string",
        "distance": "string",
        "service_code": "string"
      },
      "billing_address": {
        "street": "string",
        "street_number": "string",
        "neighborhood": "string",
        "city": "string",
        "state": "string",
        "zip_code": "string",
        "country": "string"
      },
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "shipped_at": "ISO8601",
      "delivered_at": "ISO8601",
      "customer_email": "string",
      "shipping_email": "string",
      "customer_phone": "string",
      "payment_method": "string",
      "total_amount": 0.0,
      "currency": "BRL",
      "receipt_url": "string",
      "receipt_image": "string"
    }
  ]
}
```

**Response (Pedido Individual):**
```json
{
  "id": "string",
  "order_number": "string",
  "status": "string",
  "items_summary": ["string"],
  "products": [
    {
      "sku": "string",
      "quantity": 1
    }
  ],
  "items": [...],
  "shipping_information": {...},
  "shipping": {
    "first_name": "string",
    "last_name": "string",
    "phone": "string",
    "email": "string",
    "address1": "string",
    "address2": "string",
    "city": "string",
    "province": "string",
    "zip_code": "string",
    "country": "string"
  },
  "shipping_address": {...},
  "pickup_location": {...},
  "billing_address": {...},
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "shipped_at": "ISO8601",
  "delivered_at": "ISO8601",
  "customer_email": "string",
  "shipping_email": "string",
  "customer_phone": "string",
  "payment_method": "string",
  "total_amount": 0.0,
  "currency": "BRL",
  "receipt_url": "string",
  "receipt_image": "string"
}
```

**NOTA IMPORTANTE SOBRE PRODUTOS:**
- A API Cubbo retorna produtos como `products` (array com `sku` e `quantity`)
- O sistema também aceita `items` para compatibilidade
- Normalização automática:
  - `products` → mapeado para `items` com estrutura completa
  - `items_summary` criado automaticamente se não existir

**NOTA IMPORTANTE SOBRE ENDEREÇOS:**
- A API Cubbo retorna endereço como `shipping` com formato específico:
  - `address1` - Endereço linha 1 (pode conter rua e número separados por vírgula)
  - `address2` - Endereço linha 2 (bairro/complemento)
  - `city` - Cidade
  - `province` - Estado/Província (não `state`)
  - `zip_code` - CEP
  - `country` - Código do país (ex: MX, CO, BR)
  - `first_name`, `last_name`, `phone`, `email` - Dados do destinatário
- O sistema também aceita formatos alternativos:
  - `shipping_address`, `shippingAddress`, `address`, `delivery_address`
  - Campos podem estar em formato snake_case ou camelCase
- Normalização automática:
  - `shipping.address1` → `street` e `street_number` (separados por vírgula)
  - `shipping.address2` → `neighborhood`
  - `shipping.province` → `state`
  - `shipping.city` → `city`
  - `shipping.zip_code` → `zip_code`
  - `shipping.country` → `country`

**Proxy Service:** `cubbo-auth-proxy` (Cloud Run)  
**URL:** `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`

**Rotas do Proxy:**
- `GET /api/orders?store_id={storeId}&customer_email={email}` - Buscar por email
- `GET /api/orders?store_id={storeId}&customer_phone={phone}` - Buscar por telefone
- `GET /api/orders?store_id={storeId}&order_number={orderNumber}` - Buscar por número do pedido
- `GET /api/orders/{orderId}?store_id={storeId}` - **DEPRECATED** - Não funciona corretamente

**Nota sobre Busca por Order Number:**
- A API Cubbo requer o uso de query parameter `order_number`
- O código do pedido deve ser usado exatamente como fornecido (ex: "R595531189-dup")
- A resposta sempre retorna `{ orders: [...] }` mesmo para busca individual
- Pegar o primeiro item: `orders[0]`

**Arquivo:** `services/supportService.ts`

### 4. Postmark API (via Proxy)

**Tipo:** Email Service  
**Documentação:** https://postmarkapp.com/developer/api  
**Proxy:** Sim (via Cloud Run)

**Uso:** Envio de emails de resposta a tickets

**Proxy Service:** `postmark-email-proxy` (Cloud Run)

**Arquivo:** `services/supportService.ts`

## 🔧 APIs Internas (Proxies)

### Cubbo Auth Proxy

**Serviço:** Cloud Run  
**Nome:** `cubbo-auth-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`

#### Endpoint

**POST /** - Obter token de acesso Cubbo

**Request:**
```http
POST /
Origin: http://localhost:3000
```

**Response (Success):**
```json
{
  "token": "eyJhbGc...",
  "expires_in": 86400,
  "type": "Bearer"
}
```

**Response (Error):**
```json
{
  "error": "Mensagem de erro",
  "details": {}
}
```

**CORS:** Configurado para:
- `http://localhost:3000`
- `http://localhost:5173`
- `https://suporte-7e68b.web.app`
- `https://suporte-7e68b.firebaseapp.com`

**Arquivo:** `cubbo-auth-proxy/index.js`

### Postmark Email Proxy

**Serviço:** Cloud Run  
**Nome:** `postmark-email-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://postmark-email-proxy-409489811769.southamerica-east1.run.app`

#### Endpoint

**POST /** - Enviar email via Postmark

**Request:**
```json
{
  "to": "destinatario@exemplo.com",
  "subject": "Assunto do email",
  "htmlBody": "<html>...</html>"
}
```

**Response:**
```json
{
  "success": true
}
```

**Arquivo:** `postmark-email-proxy/index.js`

### Firebase Auth Reset Proxy

**Serviço:** Cloud Run  
**Nome:** `firebase-auth-reset-proxy`  
**Região:** `southamerica-east1`  
**URL:** `https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app`

#### Endpoints

**GET /** - Health check do serviço

**Response:**
```json
{
  "service": "Firebase Auth Reset Proxy",
  "status": "online",
  "version": "1.0.0",
  "endpoints": {
    "POST /reset-password": "Reset user password using auth code"
  }
}
```

**POST /reset-password** - Resetar senha do usuário usando código de autenticação

**Request:**
```json
{
  "email": "usuario@exemplo.com",
  "code": "1234"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Senha resetada com sucesso."
}
```

**Response (Error):**
```json
{
  "error": "Código inválido ou expirado.",
  "details": "..."
}
```

**Funcionalidade:**
- Valida código de autenticação no Firestore
- Usa Firebase Admin SDK para resetar senha ou criar usuário
- Marca código como usado após operação bem-sucedida
- Cria usuário se não existir

**Arquivo:** `firebase-auth-reset-proxy/index.js`

## 🔧 APIs Internas (Firebase Services)

### FAQ Service

**Arquivo:** `services/faqService.ts`  
**Collection:** `faq`

#### Endpoints

**getFAQEntries(category?: FAQCategory): Promise<FAQEntry[]>**
- Lista todas as entradas de FAQ, opcionalmente filtradas por categoria
- Ordena por `order` e `createdAt`

**getFAQEntryById(id: string): Promise<FAQEntry | null>**
- Busca uma entrada específica por ID

**createFAQEntry(data: Omit<FAQEntry, 'id' | 'createdAt' | 'updatedAt' | 'views' | 'helpful'>): Promise<string>**
- Cria nova entrada de FAQ
- Retorna o ID do documento criado

**updateFAQEntry(id: string, data: Partial<FAQEntry>): Promise<void>**
- Atualiza uma entrada existente
- Atualiza automaticamente `updatedAt`

**deleteFAQEntry(id: string): Promise<void>**
- Remove uma entrada de FAQ

**searchFAQ(query: string): Promise<FAQEntry[]>**
- Busca no FAQ por texto (pergunta, resposta ou tags)
- Retorna apenas entradas ativas

**incrementFAQViewCount(id: string): Promise<void>**
- Incrementa contador de visualizações

**updateFAQHelpfulCount(id: string, isHelpful: boolean): Promise<void>**
- Atualiza contador de feedback útil

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

### Knowledge Base Service

**Arquivo:** `services/knowledgeBaseService.ts`  
**Collection:** `knowledgeBase` (nota: o código usa `knowledgeBase`, não `knowledgeBaseEntries`)

#### Endpoints

**getKnowledgeBaseEntries(category?: string): Promise<KnowledgeBaseEntry[]>**
- Lista todas as entradas da base de conhecimento
- Opcionalmente filtradas por categoria

**getKnowledgeBaseEntryById(id: string): Promise<KnowledgeBaseEntry | null>**
- Busca entrada específica por ID

**createKnowledgeEntry(data: Omit<KnowledgeBaseEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>**
- Cria nova entrada na base de conhecimento

**updateKnowledgeEntry(id: string, data: Partial<KnowledgeBaseEntry>): Promise<void>**
- Atualiza entrada existente

**deleteKnowledgeEntry(id: string): Promise<void>**
- Remove entrada da base de conhecimento

**searchKnowledgeBase(query: string, useGemini?: boolean): Promise<{ answer: string; sources: KnowledgeBaseEntry[] }>**
- Busca na base de conhecimento
- Retorna resposta sintetizada e fontes
- Por padrão, retorna apenas entradas verificadas (`verified: true`)
- Usa busca por relevância (score baseado em título, conteúdo e tags)

**suggestFromTicket(ticketId: string): Promise<string | null>**
- Cria sugestão de entrada na base de conhecimento a partir de ticket resolvido
- Retorna ID da entrada criada ou null em caso de erro
- Entrada criada como não verificada (requer aprovação do admin)

**verifyKnowledgeEntry(id: string): Promise<void>**
- Marca entrada como verificada

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

### Auth Service

**Arquivo:** `services/authService.ts`  
**Collection:** `authCodes`

#### Endpoints

**generateAuthCode(email: string): Promise<string>**
- Gera código de 4 dígitos (1000-9999)
- Salva no Firestore com expiração de 5 minutos
- Invalida códigos anteriores do mesmo email
- Retorna o código gerado

**validateAuthCode(email: string, code: string): Promise<boolean>**
- Valida código de autenticação
- Verifica expiração e se já foi usado
- Marca código como usado após validação bem-sucedida
- Retorna `true` se válido, `false` caso contrário

**sendAuthCodeEmail(email: string, code: string): Promise<{ success: boolean; error?: string }>**
- Envia email com código de acesso via Postmark proxy
- Retorna resultado da operação

**resetPasswordWithCode(email: string, code: string): Promise<{ success: boolean; error?: string }>**
- Reseta senha do usuário usando código de autenticação válido
- Usa Firebase Auth Reset Proxy (backend com Admin SDK)
- Retorna resultado da operação
- Marca código como usado após reset bem-sucedido

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

## 📊 Resumo de Integrações

| API | Tipo | Autenticação | Proxy | Status |
|-----|------|--------------|-------|--------|
| Firebase | BaaS | SDK | Não | ✅ Ativo |
| Gemini | AI | API Key | Não | ✅ Ativo |
| Cubbo | E-commerce | OAuth 2.0 | Sim | ✅ Ativo |
| Postmark | Email | Token | Sim | ✅ Configurado - URL: `https://postmark-email-proxy-409489811769.southamerica-east1.run.app` |
| Firebase Auth Reset | Auth | Admin SDK | Sim | ✅ Configurado - URL: `https://firebase-auth-reset-proxy-409489811769.southamerica-east1.run.app` |

## 🔄 Fluxo de Autenticação Cubbo

1. Frontend chama proxy: `POST /cubbo-auth-proxy/`
2. Proxy autentica com Cubbo: `POST /v1/auth/token`
3. Proxy retorna token ao frontend
4. Frontend usa token para chamar endpoints Cubbo
5. Token expira em 24 horas (86400 segundos)

## ⚠️ Regras de Mudança

### ❌ NUNCA modificar sem:
1. Consultar esta spec
2. Testar em ambiente de desenvolvimento
3. Atualizar documentação
4. Notificar dependências

### ✅ SEMPRE fazer quando:
1. Adicionar nova API
2. Modificar endpoints existentes
3. Mudar estrutura de autenticação
4. Atualizar URLs ou configurações

## 💾 Firestore Collections

### conversations

Collection para armazenar conversas do chatbot.

**Estrutura:**
```typescript
{
  userId: string; // Email do usuário
  sessionId: string; // ID único da sessão
  messages: ConversationMessage[]; // Array de mensagens
  orderNumbers: string[]; // Códigos de pedidos mencionados
  resolved: boolean; // Se foi resolvida
  feedback?: {
    rating: number; // 1-5
    comment?: string;
    timestamp: number;
  };
  attempts: number; // Tentativas sem resolução
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Índices recomendados:**
- `userId` (ascending)
- `createdAt` (descending)
- `sessionId` (ascending)

**Operações:**
- Criar: `conversationService.saveConversation()`
- Atualizar: `conversationService.updateConversation()`
- Buscar histórico: `conversationService.getConversationHistory()`
- Buscar última conversa: `conversationService.getLastConversation()`
- Buscar por ID: `conversationService.getConversationById()`
- Adicionar feedback: `conversationService.addFeedback()`
- Incrementar tentativas: `conversationService.incrementAttempts()`
- Gerar/recuperar sessionId: `conversationService.getOrCreateSessionId()`
- Verificar sessão válida: `conversationService.isSessionValid()`

### Conversation Service

**Arquivo:** `services/conversationService.ts`  
**Collection:** `conversations`

#### Endpoints

**saveConversation(userId: string, sessionId: string, messages: ConversationMessage[], orderNumbers?: string[]): Promise<string>**
- Salva nova conversa no Firestore
- Retorna ID da conversa criada
- Inicializa `resolved: false` e `attempts: 0`

**updateConversation(conversationId: string, updates: Partial<Conversation>): Promise<void>**
- Atualiza conversa existente
- Atualiza automaticamente `updatedAt`

**getConversationHistory(userId: string, limitCount?: number): Promise<Conversation[]>**
- Busca histórico recente de conversas do usuário
- Padrão: últimas 3 conversas
- Ordenado por `createdAt` (descendente)

**getLastConversation(userId: string): Promise<Conversation | null>**
- Retorna a última conversa do usuário
- Usado para detectar usuários retornantes

**getConversationById(conversationId: string): Promise<Conversation | null>**
- Busca conversa específica por ID

**addFeedback(conversationId: string, rating: number, comment?: string): Promise<void>**
- Adiciona feedback (rating e comentário) à conversa
- Marca conversa como resolvida (`resolved: true`)

**incrementAttempts(conversationId: string): Promise<void>**
- Incrementa contador de tentativas sem resolução
- Usado para detectar quando escalar para humano

**getOrCreateSessionId(): string**
- Gera ou recupera sessionId do localStorage
- Cria novo UUID se não existir
- Expira após 30 dias

**isSessionValid(): boolean**
- Verifica se sessionId atual ainda é válido
- Retorna `false` se expirado

#### Estrutura de Dados

```typescript
interface Conversation {
  id?: string;
  userId: string; // Email do usuário
  sessionId: string; // ID único da sessão (UUID)
  messages: ConversationMessage[]; // Array de mensagens
  orderNumbers: string[]; // Códigos de pedidos mencionados
  resolved: boolean; // Se a conversa foi resolvida
  feedback?: {
    rating: number; // 1-5 estrelas
    comment?: string;
    timestamp: number;
  };
  attempts: number; // Contador de tentativas sem resolução
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
  orderNumbers?: string[]; // Códigos de pedidos extraídos da mensagem
}
```

### tickets

**Campo adicionado:**
- `orderNumber?: string` - Número do pedido relacionado (ex: "R595531189-dup")
- `conversationId?: string` - ID da conversa que gerou o ticket

**Relacionamento Pedido-Chamado:**
- Quando `orderNumber` é fornecido, sistema busca pedido automaticamente
- `orderId` é preenchido com o ID do pedido encontrado
- Pedido é exibido no `TicketDetailModal` quando disponível

## 🔄 Changelog

### v1.3.0 (2025-01-XX)
- ✅ Collection `conversations` criada no Firestore
- ✅ Campo `orderNumber` adicionado ao Ticket
- ✅ Campo `conversationId` adicionado ao Ticket
- ✅ Função `extractOrderNumbers` implementada
- ✅ Relacionamento automático pedido-chamado
- ✅ Documentação de endpoints de conversas

### v1.5.0 (2025-11-06)
**Novas APIs - Conversation Service e Firebase Auth Reset:**
- ✅ Adicionado Conversation Service completo
- ✅ Adicionado Firebase Auth Reset Proxy
- ✅ Documentação completa de Conversation Service
- ✅ Documentação de endpoints de reset de senha
- ✅ Sistema de sessões e histórico de conversas

### v1.4.0 (2025-01-XX)
**Novas APIs - FAQ e Knowledge Base:**
- ✅ Adicionado FAQ Service com CRUD completo
- ✅ Adicionado Knowledge Base Service com busca inteligente
- ✅ Adicionado Auth Service para autenticação por código
- ✅ Integração com Gemini para busca inteligente de FAQ (`searchIntelligentFAQ`)
- ✅ Sistema de aprendizado automático de tickets resolvidos
- ✅ Documentação completa de novas collections Firestore

### v1.3.0 (2025-11-05)
**Correção Crítica - Busca por Order Number:**
- ✅ Corrigido endpoint de busca por número do pedido em `trackOrder` e `getOrderDetails`
- ✅ Mudado de path parameter (`/orders/{id}`) para query parameter (`/orders?order_number={id}`)
- ✅ Admin e Chatbot agora usam o mesmo formato de busca (consistência total)
- ✅ Resposta da API sempre retorna `{ orders: [...] }` mesmo para busca individual
- ✅ Tratamento correto para pegar `orders[0]` da resposta
- ✅ Melhorado treinamento do Gemini para usar código exatamente como fornecido pelo cliente
- ✅ Melhoradas respostas do chatbot com formato mais natural, empático e humanizado
- ✅ Adicionados exemplos de respostas humanizadas no sistema de instruções
- ✅ Documentação atualizada com formato correto de busca

### v1.2.0 (2025-01-XX)
- ✅ Adicionado suporte completo a `shipping_address` (endereço de entrega)
- ✅ Normalização automática de diferentes formatos de endereço da API
- ✅ Suporte a `pickup_location` (Click and Collect)
- ✅ Suporte a `billing_address` (endereço de cobrança)
- ✅ Adicionado `delivered_at` (data de recebimento)
- ✅ Adicionado suporte a `receipt_url` e `receipt_image` (comprovante de recebimento)
- ✅ Endereço agora aparece em todas as buscas e visualizações (chatbot, modal, listas)
- ✅ Formatação completa de endereços em respostas do chatbot
- ✅ Documentação atualizada com estrutura completa de resposta da API

### v1.1.0 (2025-11-05)
- ✅ Adicionado suporte a `store_id` obrigatório em requisições de pedidos
- ✅ Implementada validação de segurança: pedidos validados por código + email
- ✅ Função `trackOrder` agora aceita código do pedido OU email
- ✅ Sistema valida automaticamente que pedido pertence ao cliente logado
- ✅ Atualizada documentação de endpoints com `store_id`

### v1.0.0 (2025-11-05)
- Documentação inicial de todas as APIs
- Especificação completa do Cubbo API
- Documentação de proxies Cloud Run
- Fluxo de autenticação documentado

