# 🏗️ Especificação de Arquitetura

**Última Atualização:** 2025-11-07  
**Status:** ✅ Ativo

## 📋 Visão Geral

Este documento descreve a arquitetura geral do sistema Suporte Lojinha Prio by Yoobe.

## 🎯 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   HomePage   │  │  UserLogin   │  │ AdminLogin   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │UserDashboard │  │AdminDashboard│  │   Chatbot    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Firebase   │   │Gemini Service│   │Support Service│
│   (Auth +    │   │   (AI Chat)  │   │  (Business   │
│  Firestore)  │   │              │   │    Logic)    │
└──────────────┘   └──────────────┘   └──────────────┘
                                                  │
                                                  │
        ┌─────────────────────────────────────────┼─────────┐
        │                                         │         │
        ▼                                         ▼         ▼
┌──────────────┐                         ┌──────────────┐  │
│Cubbo Auth    │                         │Postmark Email│  │
│   Proxy      │                         │    Proxy     │  │
│ (Cloud Run)  │                         │ (Cloud Run)  │  │
└──────────────┘                         └──────────────┘  │
        │                                                 │
        ▼                                                 ▼
┌──────────────┐                                 ┌──────────────┐
│  Cubbo API   │                                 │ Postmark API │
│  (External)  │                                 │  (External)  │
└──────────────┘                                 └──────────────┘
```

## 🔧 Camadas do Sistema

### 1. Presentation Layer (Frontend)

**Tecnologia:** React 19 + TypeScript + Vite  
**UI Framework:** DaisyUI + Tailwind CSS

#### Componentes Principais

**Páginas e Dashboards:**
- `HomePage` - Página inicial
- `UserLogin` - Login de cliente (autenticação por código)
- `AdminLogin` - Login de administrador
- `UserDashboard` - Dashboard do cliente
- `AdminDashboard` - Dashboard do administrador

**Componentes de Suporte:**
- `Chatbot` - Chatbot com Gemini (modo flutuante e inline)
- `OrderList` - Lista de pedidos do cliente
- `AdminOrders` - Busca de pedidos (admin)
- `SupportArea` - Área de suporte do cliente (tabs: pedidos, tickets, FAQ, chat)
- `SupportTicketFormAdvanced` - Formulário dinâmico de tickets baseado em assunto
- `TicketDetailModal` - Modal de detalhes do ticket

**Componentes de FAQ:**
- `FAQArea` - Área de FAQ com categorias e busca
- `IntelligentFAQSearch` - Busca inteligente integrada com Gemini
- `AdminFAQ` - CRUD de FAQ no admin
- `AdminKnowledgeBase` - Gerenciamento da base de conhecimento

**Componentes de Conversas:**
- `ConversationFeedback` - Componente de feedback para conversas do chatbot
- Sistema de conversas integrado no `Chatbot`

### 2. Service Layer

**Localização:** `services/`

#### Services

- `supportService.ts` - Lógica de negócio principal
- `geminiService.ts` - Integração com Gemini AI
- `faqService.ts` - Gerenciamento de FAQ
- `knowledgeBaseService.ts` - Gerenciamento da base de conhecimento
- `authService.ts` - Autenticação por código de email
- `conversationService.ts` - Gerenciamento de conversas do chatbot

### 3. Data Layer

#### Firebase Firestore

**Collections:**
- `tickets` - Chamados de suporte
- `apiConfigs` - Configurações de APIs
- `knowledgeBase` - Base de conhecimento (usado por knowledgeBaseService)
- `faq` - FAQ entries
- `authCodes` - Códigos de autenticação temporários
- `conversations` - Conversas do chatbot

#### Firebase Authentication

- Email/Password Authentication (com senha determinística gerada internamente)
- Autenticação por código de 4 dígitos enviado por email
- Phone Authentication (SMS) - disponível mas não usado atualmente

### 4. Integration Layer

#### Proxies (Cloud Run)

- **Cubbo Auth Proxy** - Autenticação com Cubbo API
- **Postmark Email Proxy** - Envio de emails
- **Firebase Auth Reset Proxy** - Reset de senha usando Firebase Admin SDK

#### APIs Externas

- **Google Gemini** - Chatbot AI
- **Cubbo API** - Gestão de pedidos
- **Postmark** - Envio de emails transacionais

## 🔄 Fluxos Principais

### Fluxo de Autenticação

1. Usuário acessa `HomePage`
2. Seleciona "Acessar Portal do Cliente"
3. `UserLogin` exibe formulário de email
4. Usuário digita email e solicita código
5. Sistema gera código de 4 dígitos e salva no Firestore
6. Email enviado via Postmark proxy com código
7. Usuário digita código recebido
8. Sistema valida código no Firestore
9. Após validação, cria/login com senha determinística no Firebase Auth
10. Redirecionamento automático para `UserDashboard`

### Fluxo de Chatbot

1. Cliente envia mensagem no `Chatbot`
2. `geminiService` processa com Gemini
3. Gemini pode chamar functions (tools)
4. Functions executam ações via `supportService`
5. Resposta formatada retornada ao cliente

### Fluxo de Busca de Pedidos

1. Cliente pergunta sobre pedidos
2. Gemini identifica e chama `findCustomerOrders`
3. `supportService` busca na Cubbo API via proxy
4. Proxy autentica e obtém token
5. Dados formatados e exibidos

### Fluxo de FAQ Inteligente

1. Cliente faz pergunta no `IntelligentFAQSearch` ou no `Chatbot`
2. Sistema busca no FAQ e Knowledge Base simultaneamente
3. `geminiService.searchIntelligentFAQ()` sintetiza resposta usando Gemini
4. Resposta completa com fontes e perguntas sugeridas é exibida
5. Cliente pode marcar como útil ou abrir chamado se não resolver

### Fluxo de Conversas do Chatbot

1. Cliente inicia conversa no `Chatbot`
2. Sistema verifica se é usuário retornante via `conversationService`
3. Carrega histórico recente (últimas 3 conversas) para contexto
4. Durante conversa, mensagens são salvas em tempo real
5. Pedidos mencionados são extraídos e relacionados automaticamente
6. Após resolução, sistema solicita feedback
7. Conversa é marcada como resolvida e salva no Firestore

### Fluxo de Formulário Dinâmico

1. Cliente seleciona assunto no `SupportTicketFormAdvanced`
2. Sistema carrega configuração específica do assunto via `getTicketFormConfig`
3. Formulário adapta campos e perguntas dinamicamente
4. Validação específica por tipo de campo
5. Preview do pedido se `orderNumber` fornecido
6. Ticket criado com informações completas

## 📊 Tecnologias Utilizadas

### Frontend
- React 19.2.0
- TypeScript 5.8.2
- Vite 6.2.0
- DaisyUI 4.12.10
- Tailwind CSS (via CDN)

### Backend Services
- Node.js 18 (Cloud Run)
- Express.js (proxies)
- Firebase SDK 12.5.0

### Infrastructure
- Google Cloud Run
- Firebase (Auth + Firestore)
- Docker + NGINX

### External Services
- Google Gemini AI
- Cubbo API
- Postmark API

## 🔐 Segurança

### Autenticação
- Firebase Authentication
- OAuth 2.0 para Cubbo API
- API Keys para serviços externos

### CORS
- Configurado explicitamente em todos os proxies
- Origins permitidos definidos

### Secrets Management
- Variáveis de ambiente no Cloud Run
- Build-time variables para frontend
- Nenhum secret hardcoded

## 📈 Escalabilidade

### Cloud Run
- Auto-scaling baseado em requisições
- Máximo de 10 instâncias (aplicação principal)
- Timeout configurável por serviço

### Firebase
- Escala automaticamente
- Sem limite de requisições (dentro do plano)

## 🔄 Processo de Desenvolvimento

1. **Desenvolvimento Local:**
   - `npm run dev` - Servidor Vite local
   - Firebase emulador (opcional)

2. **Build:**
   - `npm run build` - Build de produção
   - Output em `dist/`

3. **Deploy:**
   - Cloud Run via `gcloud run deploy`
   - Build automático no Cloud Build

## ⚠️ Regras de Arquitetura

### ❌ NUNCA fazer:
- Lógica de negócio no frontend
- Chamadas diretas a APIs externas (usar proxies)
- Hardcode de configurações
- Acoplamento forte entre componentes

### ✅ SEMPRE fazer:
- Separar concerns (presentation/service/data)
- Usar services para lógica de negócio
- Usar proxies para APIs externas
- Manter componentes reutilizáveis

## 🔄 Changelog

### v1.2.0 (2025-11-06)
- ✅ Adicionado Conversation Service à arquitetura
- ✅ Adicionado Firebase Auth Reset Proxy
- ✅ Documentado fluxo de FAQ inteligente
- ✅ Documentado fluxo de conversas do chatbot
- ✅ Documentado fluxo de formulário dinâmico
- ✅ Atualizada lista de componentes e serviços

### v1.1.0 (2025-01-XX)
- ✅ Adicionados componentes de FAQ e Knowledge Base
- ✅ Adicionados novos serviços (FAQ, Knowledge Base, Auth)
- ✅ Documentado fluxo de autenticação por código
- ✅ Atualizada lista de collections Firestore
- ✅ Documentados novos componentes de UI

### v1.0.0 (2025-11-05)
- Arquitetura inicial documentada
- Fluxos principais mapeados
- Tecnologias listadas
- Regras de arquitetura definidas



