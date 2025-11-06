# 🔥 Firestore Collections e Índices - Documentação

**Data:** 2025-11-06  
**Status:** ✅ Documentação Completa

## 📚 Collections Firestore

### 1. `tickets`

**Descrição:** Chamados de suporte dos clientes

**Estrutura:**
```typescript
{
  id: string;
  userId: string; // Email do usuário
  subject: string;
  description: string;
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  orderNumber?: string; // Número do pedido relacionado
  orderId?: string; // ID do pedido relacionado
  conversationId?: string; // ID da conversa que gerou o ticket
  history: Array<{
    author: string;
    content: string;
    type: 'comment' | 'status_change';
    timestamp: number;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Índices Recomendados:**
- `userId` (ascending)
- `status` (ascending)
- `createdAt` (descending)
- `orderNumber` (ascending) - para busca por pedido

**Status:** ✅ Collection existe e está em uso

---

### 2. `faq`

**Descrição:** Entradas de FAQ (Perguntas Frequentes)

**Estrutura:**
```typescript
{
  id: string;
  question: string;
  answer: string;
  category: 'compra' | 'troca' | 'rastreio' | 'cancelamento' | 'reembolso' | 'sla' | 'geral';
  tags: string[];
  order: number; // Para ordenação
  active: boolean; // Para mostrar/ocultar
  views: number; // Contador de visualizações
  helpful: number; // Contador de feedback útil
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Índices Recomendados:**
- `category` + `order` (composite) - para listagem por categoria
- `active` + `order` (composite) - opcional, se filtrado em memória não é necessário
- `order` (ascending) - para ordenação geral

**Nota:** O serviço `faqService` tem fallback em memória se índices não existirem, mas índices melhoram performance significativamente.

**Status:** ✅ Collection existe e está em uso

---

### 3. `knowledgeBase`

**Descrição:** Base de conhecimento (entradas de conhecimento)

**Estrutura:**
```typescript
{
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: 'faq' | 'ticket' | 'manual' | 'gemini';
  relatedTickets?: string[]; // IDs de tickets relacionados
  verified: boolean; // Se foi verificado/aprovado pelo admin
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Índices Recomendados:**
- `category` + `verified` + `createdAt` (composite) - para listagem filtrada
- `verified` + `createdAt` (composite) - para listar apenas verificados
- `category` (ascending) - para filtro por categoria
- `createdAt` (descending) - para ordenação por data

**Status:** ✅ Collection existe e está em uso

---

### 4. `conversations`

**Descrição:** Conversas do chatbot

**Estrutura:**
```typescript
{
  id: string;
  userId: string; // Email do usuário
  sessionId: string; // UUID único da sessão
  messages: Array<{
    text: string;
    sender: 'user' | 'bot' | 'system';
    timestamp: number;
    functionCalls?: Array<{
      name: string;
      args: any;
    }>;
    orderNumbers?: string[];
  }>;
  orderNumbers: string[]; // Códigos de pedidos mencionados
  resolved: boolean; // Se a conversa foi resolvida
  feedback?: {
    rating: number; // 1-5
    comment?: string;
    timestamp: number;
  };
  attempts: number; // Contador de tentativas sem resolução
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Índices Recomendados:**
- `userId` + `createdAt` (composite) - para buscar histórico do usuário
- `userId` (ascending) - para buscar todas as conversas do usuário
- `createdAt` (descending) - para ordenação por data
- `sessionId` (ascending) - para buscar por sessão específica

**Status:** ✅ Collection existe e está em uso

---

### 5. `authCodes`

**Descrição:** Códigos de autenticação temporários (4 dígitos)

**Estrutura:**
```typescript
{
  id: string;
  email: string;
  code: string; // 4 dígitos (1000-9999)
  createdAt: Timestamp;
  expiresAt: Timestamp; // 5 minutos após criação
  used: boolean; // Se já foi usado
}
```

**Índices Recomendados:**
- `email` + `createdAt` (composite) - para buscar códigos do email
- `email` + `used` (composite) - para buscar códigos não usados
- `expiresAt` (ascending) - para limpeza de códigos expirados

**Status:** ✅ Collection existe e está em uso

---

### 6. `apiConfigs`

**Descrição:** Configurações de APIs (Cubbo, etc.)

**Estrutura:**
```typescript
{
  id: string;
  name: string; // Ex: 'cubbo'
  config: {
    store_id?: string;
    client_id?: string;
    client_secret?: string;
    // ... outras configurações
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Índices Recomendados:**
- `name` (ascending) - para buscar por nome

**Status:** ✅ Collection existe e está em uso

---

## 🔍 Índices Compostos Necessários

### Prioridade Alta (Recomendados para Performance)

1. **`faq`**
   - `category` (ascending) + `order` (ascending)
   - **Uso:** Listagem de FAQs por categoria ordenada

2. **`knowledgeBase`**
   - `category` (ascending) + `verified` (ascending) + `createdAt` (descending)
   - **Uso:** Listagem filtrada por categoria e verificação

3. **`conversations`**
   - `userId` (ascending) + `createdAt` (descending)
   - **Uso:** Histórico de conversas do usuário ordenado por data

4. **`authCodes`**
   - `email` (ascending) + `createdAt` (descending)
   - **Uso:** Buscar códigos recentes do email

### Prioridade Média (Opcionais, mas Úteis)

5. **`faq`**
   - `active` (ascending) + `order` (ascending)
   - **Uso:** Listagem apenas de FAQs ativos (se não filtrado em memória)

6. **`knowledgeBase`**
   - `verified` (ascending) + `createdAt` (descending)
   - **Uso:** Listagem apenas de entradas verificadas

7. **`tickets`**
   - `userId` (ascending) + `status` (ascending) + `createdAt` (descending)
   - **Uso:** Tickets do usuário filtrados por status

8. **`authCodes`**
   - `email` (ascending) + `used` (ascending)
   - **Uso:** Buscar códigos não usados do email

## 📝 Como Criar Índices no Firestore

### Via Console Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Selecione o projeto `suporte-7e68b`
3. Vá em **Firestore Database** > **Indexes**
4. Clique em **Create Index**
5. Selecione a collection
6. Adicione os campos na ordem especificada
7. Configure ordem (ascending/descending)
8. Clique em **Create**

### Via Link Direto (Se Firebase sugerir)

Quando uma query requer índice e não existe, o Firebase fornece um link direto para criar. Use esse link para criar rapidamente.

### Via Firebase CLI

```bash
# Instalar Firebase CLI se não tiver
npm install -g firebase-tools

# Fazer login
firebase login

# Criar arquivo firestore.indexes.json
# (estrutura abaixo)

# Deploy dos índices
firebase deploy --only firestore:indexes
```

**Exemplo de `firestore.indexes.json`:**
```json
{
  "indexes": [
    {
      "collectionGroup": "faq",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "order", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "knowledgeBase",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "verified", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "conversations",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "authCodes",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## ⚠️ Notas Importantes

1. **Fallback em Memória:** Os serviços têm fallback em memória se índices não existirem, mas isso pode ser mais lento para grandes volumes de dados.

2. **Criação Automática:** O Firebase pode sugerir criação de índices automaticamente quando uma query falha. Use esses links para criar rapidamente.

3. **Tempo de Criação:** Índices compostos podem levar alguns minutos para serem criados, especialmente em collections grandes.

4. **Custos:** Índices não têm custo adicional direto, mas queries mais rápidas podem reduzir custos de leitura.

## ✅ Checklist de Verificação

- [x] Collection `tickets` existe e está em uso
- [x] Collection `faq` existe e está em uso
- [x] Collection `knowledgeBase` existe e está em uso
- [x] Collection `conversations` existe e está em uso
- [x] Collection `authCodes` existe e está em uso
- [x] Collection `apiConfigs` existe e está em uso
- [ ] Índice `faq`: `category` + `order` criado
- [ ] Índice `knowledgeBase`: `category` + `verified` + `createdAt` criado
- [ ] Índice `conversations`: `userId` + `createdAt` criado
- [ ] Índice `authCodes`: `email` + `createdAt` criado

---

**Última Atualização:** 2025-11-06  
**Status:** ✅ Documentação Completa

