# Instruções Completas para Criar Índices Firestore

**Data:** 2025-11-06  
**Status:** ⏳ Aguardando Execução

## Método 1: Usando Firebase CLI (Recomendado)

### Passo 1: Fazer Login no Firebase

Abra o terminal e execute:

```bash
cd /Users/genautech/suporte
firebase login
```

Isso abrirá seu navegador para autenticação. Após fazer login, volte ao terminal.

### Passo 2: Executar Script Automático

```bash
./CRIAR_INDICES_FIRESTORE.sh
```

Ou execute manualmente:

```bash
# Configurar projeto
firebase use suporte-7e68b

# Deploy dos índices
firebase deploy --only firestore:indexes
```

### Passo 3: Verificar Status

Os índices podem levar alguns minutos para serem criados. Você pode acompanhar o progresso em:

https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes

---

## Método 2: Via Console Firebase (Manual)

Se preferir criar manualmente:

### 1. Índice para Collection `faq`

1. Acesse: https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes
2. Clique em **"Create Index"**
3. **Collection ID:** `faq`
4. Adicione campos:
   - `category` (Ascending)
   - `order` (Ascending)
5. Clique em **"Create"**

### 2. Índice para Collection `knowledgeBase`

1. Clique em **"Create Index"**
2. **Collection ID:** `knowledgeBase`
3. Adicione campos:
   - `category` (Ascending)
   - `verified` (Ascending)
   - `createdAt` (Descending)
4. Clique em **"Create"**

### 3. Índice para Collection `conversations`

1. Clique em **"Create Index"**
2. **Collection ID:** `conversations`
3. Adicione campos:
   - `userId` (Ascending)
   - `createdAt` (Descending)
4. Clique em **"Create"**

### 4. Índice para Collection `authCodes`

1. Clique em **"Create Index"**
2. **Collection ID:** `authCodes`
3. Adicione campos:
   - `email` (Ascending)
   - `createdAt` (Descending)
4. Clique em **"Create"**

---

## Índices que Serão Criados

| Collection | Campos | Ordem |
|------------|--------|-------|
| `faq` | `category`, `order` | ASC, ASC |
| `knowledgeBase` | `category`, `verified`, `createdAt` | ASC, ASC, DESC |
| `conversations` | `userId`, `createdAt` | ASC, DESC |
| `authCodes` | `email`, `createdAt` | ASC, DESC |

## Verificação

Após criar os índices, você pode verificar:

1. **No Console Firebase:**
   - Acesse: https://console.firebase.google.com/project/suporte-7e68b/firestore/indexes
   - Todos os 4 índices devem aparecer com status "Enabled"

2. **Testando a Aplicação:**
   - As queries devem ser mais rápidas
   - Não deve aparecer erro de "index required" no console

## Nota Importante

**A aplicação funciona sem os índices** (os serviços têm fallback em memória), mas:
- ⚠️ Pode ser mais lenta para grandes volumes de dados
- ⚠️ Pode consumir mais recursos do Firestore
- ✅ Com índices: queries são otimizadas e mais rápidas

## Troubleshooting

### Erro: "Failed to authenticate"
```bash
firebase login
```

### Erro: "Not in a Firebase app directory"
Certifique-se de estar no diretório `/Users/genautech/suporte` e que o arquivo `firebase.json` existe.

### Erro: "Index already exists"
Isso significa que o índice já foi criado. Você pode verificar no Console Firebase.

---

**Última Atualização:** 2025-11-06

