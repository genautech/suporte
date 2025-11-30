# Sistema de Conversas e Aprendizado do Chatbot

## Visão Geral

O sistema de conversas permite que o chatbot aprenda com interações anteriores, reconheça usuários retornantes, gerencie tentativas sem resolução e relacione automaticamente pedidos com chamados de suporte.

## Estrutura de Dados

### Conversation

```typescript
interface Conversation {
  id?: string;
  userId: string; // Email do usuário
  sessionId: string; // ID único da sessão (UUID)
  messages: ConversationMessage[];
  orderNumbers: string[]; // Array de pedidos mencionados na conversa
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
```

### ConversationMessage

```typescript
interface ConversationMessage {
  text: string;
  sender: MessageSender;
  timestamp: number;
  functionCalls?: Array<{
    name: string;
    args: any;
  }>;
  orderNumbers?: string[]; // Códigos de pedidos extraídos da mensagem
}
```

## Serviço de Conversas

### conversationService.ts

Localização: `services/conversationService.ts`

#### Funções Principais

**saveConversation**
- Salva uma nova conversa no Firestore
- Collection: `conversations`
- Parâmetros: `userId`, `sessionId`, `messages`, `orderNumbers`
- Retorna: ID da conversa criada

**updateConversation**
- Atualiza uma conversa existente
- Usado para atualizar mensagens, tentativas, ou marcar como resolvida

**getConversationHistory**
- Busca histórico recente de conversas de um usuário
- Padrão: últimas 3 conversas
- Ordenado por data de criação (mais recente primeiro)

**getLastConversation**
- Retorna a última conversa do usuário
- Usado para detectar usuários retornantes

**addFeedback**
- Adiciona feedback (rating e comentário) à conversa
- Marca a conversa como resolvida

**incrementAttempts**
- Incrementa o contador de tentativas sem resolução
- Usado para rastrear quando não conseguimos ajudar

**getOrCreateSessionId**
- Gera ou recupera sessionId do localStorage
- SessionId persiste por 30 dias
- Usado para rastrear sessões entre visitas

## Fluxo de Aprendizado

### 1. Inicialização

Ao abrir o chat:
1. Verifica se existe sessionId no localStorage
2. Se não existe, gera um novo UUID
3. Busca última conversa do usuário no Firestore
4. Se encontrada, marca como usuário retornante
5. Carrega histórico recente (últimas 3 conversas)

### 2. Durante a Conversa

A cada mensagem:
1. Extrai códigos de pedido mencionados (`extractOrderNumbers`)
2. Salva mensagem na conversa atual
3. Atualiza lista de `orderNumbers` mencionados
4. Rastreia tentativas sem resolução

### 3. Após Interação

Após processar função do Gemini:
1. Salva/atualiza conversa no Firestore
2. Se pedido encontrado ou chamado aberto: marca como resolvida
3. Se não resolvido: incrementa tentativas
4. Após 3 tentativas: sugere abertura de chamado

### 4. Feedback

Após resolução ou abertura de chamado:
1. Mostra componente de feedback
2. Coleta rating (1-5 estrelas) e comentário opcional
3. Salva feedback na conversa
4. Usa feedback para melhorar respostas futuras

## Detecção de Pedidos Mencionados

### extractOrderNumbers

Localização: `services/supportService.ts`

Extrai códigos de pedido do texto usando padrões regex:
- `R\d+[-\w]*` - Padrão R123456, R595531189-dup
- `LP[-_]?\d+` - Padrão LP-12345, LP12345
- `pedido\s+([R\d]+[-\w]*)` - "pedido R123456"
- `order\s+([R\d]+[-\w]*)` - "order R123456"

## Reconhecimento de Usuários Retornantes

### Critérios

1. **Firestore**: Verifica se existe conversa anterior do mesmo `userId` (email)
2. **localStorage**: Verifica se existe `sessionId` válido (não expirado)

### Mensagem Personalizada

Se usuário retornante:
- "Olá novamente, [nome]! 👋 Que bom te ver de volta!"
- Menciona pedidos da conversa anterior (se houver)
- Mantém tom amistoso mas focado em solução

## Contador de Tentativas

### Lógica

- Incrementa quando:
  - Pedido não encontrado
  - FAQ não retorna resultado útil
  - Erro ao processar requisição
  - Função não consegue resolver problema

- Reseta quando:
  - Pedido encontrado com sucesso
  - Chamado de suporte aberto
  - Problema resolvido

- Após 3 tentativas:
  - Mostra mensagem empática
  - Oferece botão destacado para abrir chamado
  - Relaciona pedido mencionado (se houver)

## Relacionamento Pedido-Chamado

### Detecção Automática

Quando cliente abre chamado:
1. Se `orderNumber` foi mencionado na conversa, relaciona automaticamente
2. Se apenas email informado e pedido encontrado, relaciona
3. Caso contrário, abre chamado sem relacionamento

### Visualização

No `TicketDetailModal`:
- Se `orderNumber` existe, busca pedido automaticamente
- Mostra card com resumo do pedido relacionado
- Botão "Ver Detalhes" abre `OrderDetailModal` completo

## Contexto Enriquecido para Gemini

### Informações Incluídas

1. **Histórico recente**: Últimas 3 conversas do usuário
2. **Pedidos mencionados**: Lista de códigos de pedidos da conversa atual e anteriores
3. **Tentativas sem resolução**: Contador atual
4. **Feedback anterior**: Rating e comentários (se disponível)

### Formato do Contexto

```
[Contexto: Usuário mencionou anteriormente os pedidos: R123456, R789012]
[Tentativas sem resolução: 2]
```

## Sistema de Feedback

### ConversationFeedback Component

Localização: `components/ConversationFeedback.tsx`

### Funcionalidades

- Coleta rating de 1-5 estrelas
- Campo opcional para comentário
- Salva feedback no Firestore
- Pode ser pulado pelo usuário

### Quando Mostrar

- Após resolução bem-sucedida de problema
- Após abertura de chamado de suporte
- Uma vez por conversa (não repetir)

## Tratamento de Urgências

### Detecção

Palavras-chave: "demorando", "cadê", "atrasado", "não chegou", "problema", "erro", "ruim"

### Protocolo

1. **Empatia primeiro**: Reconhecer preocupação do cliente
2. **Priorizar rastreio**: Para pedidos "shipped", mostrar código de rastreio primeiro
3. **Apresentar informações**: Todas as informações disponíveis de forma clara
4. **Oferecer chamado**: Após apresentar informações, oferecer abertura de chamado

## Persistência de Sessão

### localStorage

- Chave: `chatbot_session_id`
- Valor: UUID único gerado na primeira visita
- Expiração: 30 dias (armazenado em `chatbot_session_id_expires`)

### Firestore

- Collection: `conversations`
- Índices recomendados:
  - `userId` (ascending)
  - `createdAt` (descending)
  - `sessionId` (ascending)

## Integração com Chatbot

### Chatbot.tsx

O componente `Chatbot` integra todo o sistema:

1. **Inicialização**: Carrega histórico e detecta usuários retornantes
2. **Durante conversa**: Salva mensagens e extrai pedidos
3. **Após interação**: Atualiza tentativas e relaciona pedidos
4. **Feedback**: Mostra componente após resolução

### Estados Gerenciados

- `sessionId`: ID único da sessão
- `currentConversationId`: ID da conversa atual no Firestore
- `attemptsWithoutResolution`: Contador de tentativas
- `isReturningUser`: Flag de usuário retornante
- `mentionedOrderNumbers`: Lista de pedidos mencionados
- `conversationHistory`: Histórico recente carregado
- `showFeedback`: Flag para mostrar componente de feedback

## Melhorias Futuras

1. **Análise de Sentimento**: Detectar frustração ou satisfação nas mensagens
2. **Sugestões Proativas**: Oferecer ajuda baseada em padrões de conversa
3. **Aprendizado de Padrões**: Identificar perguntas frequentes e melhorar respostas
4. **Métricas**: Dashboard com estatísticas de conversas e feedback
5. **Exportação**: Exportar conversas para análise externa

## Changelog

### v1.0.0 (2025-01-XX)
- Implementação inicial do sistema de conversas
- Detecção de usuários retornantes
- Sistema de feedback
- Relacionamento automático pedido-chamado
- Contador de tentativas sem resolução
- Contexto enriquecido para Gemini








