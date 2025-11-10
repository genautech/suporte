# 📋 Checklist de Deploy - Features Locais para Produção

**Data:** 2025-01-XX  
**Versão:** v1.7.0  
**Status:** ✅ Pronto para Deploy

## 🎯 Objetivo

Este checklist documenta todas as features implementadas localmente que precisam ser deployadas para produção, garantindo que nada seja esquecido.

## ✅ Features Implementadas Localmente

### 1. Sistema de FAQ Completo (v1.7.0 - Multi-tenant)

#### Componentes
- [x] `FAQArea.tsx` - Área de FAQ para clientes
- [x] `IntelligentFAQSearch.tsx` - Busca inteligente com Gemini
- [x] `AdminFAQ.tsx` - CRUD de FAQ no admin (atualizado com multi-tenant)

#### Serviços
- [x] `faqService.ts` - CRUD completo de FAQ (suporta companyId)
- [x] `faqSeedData.ts` - Dados iniciais do FAQ

#### Funcionalidades
- [x] Navegação por categorias
- [x] Busca por texto
- [x] Busca inteligente com Gemini
- [x] Sistema de feedback (views, helpful)
- [x] Reordenação de FAQs
- [x] Ativação/desativação de entradas
- [x] População automática com dados iniciais
- [x] **FAQ Multi-tenant por Cliente** - FAQs específicas por empresa
- [x] **Select box de cliente** - Admin pode associar FAQ a cliente específico
- [x] **Badges visuais** - Mostra qual cliente a FAQ pertence
- [x] **Filtragem automática** - Clientes veem apenas FAQs da sua empresa + gerais

**Status:** ✅ Pronto para deploy

### 2. Base de Conhecimento

#### Componentes
- [x] `AdminKnowledgeBase.tsx` - Gerenciamento da base de conhecimento

#### Serviços
- [x] `knowledgeBaseService.ts` - CRUD completo
- [x] Sistema de aprendizado automático de tickets resolvidos

#### Funcionalidades
- [x] CRUD completo no admin
- [x] Sistema de verificação (aprovado/pendente)
- [x] Sugestões automáticas de tickets resolvidos
- [x] Busca integrada com FAQ
- [x] Relacionamento com tickets

**Status:** ✅ Pronto para deploy

### 3. Formulário Dinâmico de Tickets

#### Componentes
- [x] `SupportTicketFormAdvanced.tsx` - Formulário adaptativo

#### Dados
- [x] `ticketFormConfigs.ts` - Configurações por assunto

#### Serviços
- [x] `supportService.getTicketFormConfig()` - Obter configuração

#### Funcionalidades
- [x] Formulário adaptativo por assunto selecionado
- [x] Validação específica por tipo de campo
- [x] Preview de pedido quando número fornecido
- [x] 9 assuntos pré-configurados

**Status:** ✅ Pronto para deploy

### 4. Sistema de Conversas do Chatbot

#### Componentes
- [x] Sistema integrado no `Chatbot.tsx`
- [x] Modo inline no `SupportArea`

#### Serviços
- [x] `conversationService.ts` - Gerenciamento completo de conversas

#### Funcionalidades
- [x] Histórico persistente de conversas
- [x] Reconhecimento de usuários retornantes
- [x] Sistema de feedback do chatbot
- [x] Contador de tentativas sem resolução
- [x] Relacionamento automático pedido-conversa
- [x] SessionId persistente (30 dias)

**Status:** ✅ Pronto para deploy

### 5. Melhorias no Chatbot (v1.7.0 - Integração FAQ)

#### Funcionalidades
- [x] Modo inline no SupportArea
- [x] Integração com FAQ inteligente
- [x] Contexto enriquecido com histórico
- [x] Tratamento empático de urgências
- [x] Sistema de feedback
- [x] **Integração FAQ com Gemini AI** - Contexto do FAQ disponível para aprendizado
- [x] **Filtragem por cliente** - Gemini recebe apenas FAQs relevantes ao cliente

**Status:** ✅ Pronto para deploy

### 6. Visualização Admin como Cliente (v1.7.0)

#### Componentes
- [x] `AdminClientView.tsx` - Novo componente para visualização admin como cliente
- [x] `AdminDashboard.tsx` - Select box para escolher cliente
- [x] `UserDashboard.tsx` - Suporte para `adminSelectedCompanyId` e `adminMode`

#### Funcionalidades
- [x] Admin pode selecionar cliente antes de visualizar
- [x] Perfil mostra dados corretos do cliente selecionado
- [x] Aba "Gerenciar FAQ" disponível quando admin visualiza como cliente
- [x] Admin pode criar/editar FAQs do cliente selecionado

**Status:** ✅ Pronto para deploy

### 7. Correções de Bugs (v1.7.0)

#### Problemas Corrigidos
- [x] Select boxes não abrem - Corrigido (z-index + modal={false})
- [x] Perfil mostra dados do admin - Corrigido (AdminClientView)
- [x] Manager não consegue criar/editar FAQ - Corrigido (lógica companyId)

**Status:** ✅ Pronto para deploy

### 8. Logs de Erro Melhorados (v1.7.0)

#### Melhorias
- [x] Logs com prefixo do serviço (`[faqService]`, `[geminiService]`, etc.)
- [x] Contexto completo nos logs (companyId, id, etc.)
- [x] Stack trace quando disponível
- [x] Mensagens de erro mais descritivas

**Status:** ✅ Pronto para deploy

### 6. Firebase Auth Reset Proxy

#### Serviço
- [x] `firebase-auth-reset-proxy` - Backend Cloud Run

#### Funcionalidades
- [x] Reset de senha usando código de autenticação
- [x] Criação de usuário se não existir
- [x] Validação de código no Firestore
- [x] Health check endpoint

**Status:** ✅ Deployado e Funcionando

## 🔧 Verificações Pré-Deploy

### Variáveis de Ambiente

- [x] `VITE_GEMINI_API_KEY` - Configurada em produção
- [x] `VITE_POSTMARK_PROXY_URL` - Configurada (fallback automático)
- [x] `VITE_AUTH_RESET_PROXY_URL` - Configurada (fallback automático)

### Collections Firestore

- [x] `faq` - Collection existe
- [x] `knowledgeBase` - Collection existe
- [x] `conversations` - Collection existe
- [x] `authCodes` - Collection existe

### Índices Firestore (Recomendados)

- [ ] `faq`: `category` + `order` (composite)
- [ ] `faq`: `companyId` + `active` + `order` (composite) - **NOVO para v1.7.0**
- [ ] `knowledgeBase`: `category` + `verified` + `createdAt` (composite)
- [ ] `conversations`: `userId` + `createdAt` (composite)
- [ ] `authCodes`: `email` + `createdAt` (composite)

**Nota:** Os serviços têm fallback em memória se índices não existirem, mas índices melhoram performance significativamente.

### Proxies Cloud Run

- [x] `cubbo-auth-proxy` - ✅ Deployado
- [x] `postmark-email-proxy` - ✅ Deployado
- [x] `firebase-auth-reset-proxy` - ✅ Deployado

## 📦 Processo de Deploy

### 1. Build da Aplicação

```bash
# Build com variáveis de ambiente
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
```

### 2. Deploy no Cloud Run

```bash
gcloud run deploy suporte-lojinha \
  --source . \
  --region southamerica-east1 \
  --platform managed \
  --allow-unauthenticated \
  --set-env-vars VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
```

### 3. Verificações Pós-Deploy

- [ ] Aplicação carrega corretamente
- [ ] Login de cliente funciona
- [ ] Login de admin funciona
- [ ] FAQ carrega e exibe corretamente
- [ ] Busca inteligente funciona
- [ ] Admin pode gerenciar FAQ
- [ ] Admin pode gerenciar Knowledge Base
- [ ] Formulário dinâmico funciona
- [ ] Chatbot com histórico funciona
- [ ] Conversas são salvas
- [ ] Feedback funciona
- [ ] Chat inline funciona no SupportArea

## 🎯 Checklist de Features para Testar em Produção

### FAQ (v1.7.0 - Multi-tenant)

- [ ] FAQ carrega todas as categorias
- [ ] Busca por texto funciona
- [ ] Busca inteligente retorna resultados
- [ ] Perguntas expandem/colapsam corretamente
- [ ] Botão "Foi útil?" funciona
- [ ] Contador de visualizações incrementa
- [ ] Admin pode criar/editar/deletar FAQs
- [ ] Admin pode reordenar FAQs
- [ ] Admin pode ativar/desativar FAQs
- [ ] Botão "Popular FAQ" funciona
- [ ] **Admin pode selecionar cliente ao criar FAQ**
- [ ] **Admin pode criar FAQ como "Geral" (visível para todos)**
- [ ] **Manager pode criar/editar FAQs da sua empresa**
- [ ] **Cliente vê apenas FAQs da sua empresa + FAQs gerais**
- [ ] **Badges mostram corretamente qual cliente a FAQ pertence**

### Base de Conhecimento

- [ ] Admin pode criar entradas
- [ ] Admin pode editar entradas
- [ ] Admin pode deletar entradas
- [ ] Admin pode verificar entradas
- [ ] Sugestões de tickets resolvidos aparecem
- [ ] Busca funciona corretamente
- [ ] Filtros por categoria funcionam
- [ ] Filtros por verificação funcionam

### Formulário Dinâmico

- [ ] Dropdown de assuntos funciona
- [ ] Formulário adapta campos por assunto
- [ ] Validação funciona corretamente
- [ ] Preview de pedido aparece quando número fornecido
- [ ] Ticket é criado com informações corretas
- [ ] Todos os 9 assuntos têm configurações corretas

### Chatbot e Conversas (v1.7.0 - Integração FAQ)

- [ ] Chatbot abre corretamente (modo flutuante e inline)
- [ ] Histórico de conversas carrega
- [ ] Usuários retornantes são reconhecidos
- [ ] Conversas são salvas no Firestore
- [ ] Feedback funciona corretamente
- [ ] Contador de tentativas funciona
- [ ] Relacionamento pedido-conversa funciona
- [ ] Busca inteligente de FAQ funciona no chatbot
- [ ] **Chatbot usa contexto do FAQ nas respostas**
- [ ] **FAQ específica da empresa aparece no contexto do chatbot**
- [ ] **FAQ geral aparece para todos os clientes**

### Visualização Admin como Cliente (v1.7.0)

- [ ] Select box de cliente aparece no AdminDashboard
- [ ] Admin pode selecionar cliente antes de visualizar
- [ ] Perfil mostra dados corretos do cliente selecionado
- [ ] Aba "Gerenciar FAQ" aparece quando admin visualiza como cliente
- [ ] Admin pode criar/editar FAQs do cliente selecionado

### Select Boxes (v1.7.0 - Correção)

- [ ] Todos os select boxes abrem corretamente
- [ ] Select boxes funcionam dentro de Dialogs
- [ ] Select boxes aparecem sobre outros elementos (z-index correto)

### Autenticação

- [ ] Código de autenticação é gerado
- [ ] Email com código é enviado
- [ ] Código é validado corretamente
- [ ] Reset de senha funciona quando necessário
- [ ] Login funciona após reset

## 📊 Resumo de Status

### Features Prontas para Deploy (v1.7.0)

- ✅ Sistema de FAQ Completo (Multi-tenant)
- ✅ Base de Conhecimento
- ✅ Formulário Dinâmico de Tickets
- ✅ Sistema de Conversas do Chatbot
- ✅ Melhorias no Chatbot (Integração FAQ)
- ✅ Visualização Admin como Cliente
- ✅ Correções de Bugs (Select boxes, Perfil, Manager FAQ)
- ✅ Logs de Erro Melhorados
- ✅ Firebase Auth Reset Proxy (já deployado)

### Verificações Pendentes

- ⚠️ Criar índices Firestore (opcional, mas recomendado)
- ⚠️ Popular FAQ com dados iniciais após deploy
- ⚠️ Testar todas as features em produção

## 🚀 Próximos Passos

1. **Fazer deploy** da aplicação principal
2. **Criar índices Firestore** (se necessário)
3. **Popular FAQ** com dados iniciais
4. **Testar todas as features** em produção
5. **Validar integração** completa entre features
6. **Documentar** qualquer problema encontrado

---

**Última Atualização:** 2025-01-XX  
**Versão:** v1.7.0  
**Status:** ✅ Pronto para Deploy

**Ver também:**
- `DEPLOY_v1.7.0.md` - Guia completo de deploy desta versão
- `CHANGELOG.md` - Histórico completo de mudanças
- `TROUBLESHOOTING.md` - Guia de troubleshooting

