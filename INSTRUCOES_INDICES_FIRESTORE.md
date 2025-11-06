# Instruções para Criar Índices Firestore

**Data:** 2025-11-06  
**Status:** ⏳ Aguardando Criação Manual

## Índices Necessários

Os seguintes índices devem ser criados no Firebase Console para otimizar as queries das novas features:

### 1. Índice para Collection `faq`

**Campos:**
- `category` (ASCENDING)
- `order` (ASCENDING)

**Como criar:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes
2. Clique em "Create Index"
3. Collection ID: `faq`
4. Adicione campo `category` (Ascending)
5. Adicione campo `order` (Ascending)
6. Clique em "Create"

**Ou use o arquivo:** `firestore.indexes.json` já criado no projeto

### 2. Índice para Collection `knowledgeBase`

**Campos:**
- `category` (ASCENDING)
- `verified` (ASCENDING)
- `createdAt` (DESCENDING)

**Como criar:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes
2. Clique em "Create Index"
3. Collection ID: `knowledgeBase`
4. Adicione campo `category` (Ascending)
5. Adicione campo `verified` (Ascending)
6. Adicione campo `createdAt` (Descending)
7. Clique em "Create"

### 3. Índice para Collection `conversations`

**Campos:**
- `userId` (ASCENDING)
- `createdAt` (DESCENDING)

**Como criar:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes
2. Clique em "Create Index"
3. Collection ID: `conversations`
4. Adicione campo `userId` (Ascending)
5. Adicione campo `createdAt` (Descending)
6. Clique em "Create"

### 4. Índice para Collection `authCodes`

**Campos:**
- `email` (ASCENDING)
- `createdAt` (DESCENDING)

**Como criar:**
1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes
2. Clique em "Create Index"
3. Collection ID: `authCodes`
4. Adicione campo `email` (Ascending)
5. Adicione campo `createdAt` (Descending)
6. Clique em "Create"

## Nota Importante

**Os serviços têm fallback em memória**, então a aplicação funcionará mesmo sem os índices, mas pode ser mais lenta para grandes volumes de dados. Os índices melhoram significativamente a performance.

## Alternativa: Usar Firebase CLI

Se você tiver Firebase CLI instalado:

```bash
# Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# Fazer login
firebase login

# Deploy dos índices
cd /Users/genautech/suporte
firebase deploy --only firestore:indexes --project suporte-7e68b
```

O arquivo `firestore.indexes.json` já está criado no projeto com todos os índices necessários.

---

**Última Atualização:** 2025-11-06

