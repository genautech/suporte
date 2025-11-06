# Correção - Erro store_id obrigatório na API Cubbo

## Problema

Ao buscar pedidos na API Cubbo, ocorria o erro:
```
API da Cubbo retornou status 422: Parameter store_id is required
```

## Causa

A API da Cubbo requer o parâmetro `store_id` em todas as requisições de pedidos, mas o código não estava enviando este parâmetro.

## Correções Implementadas

### 1. Tipo ApiConfig Atualizado

**Arquivo:** `types.ts`

Adicionado campo `storeId` ao tipo `ApiConfig`:
```typescript
export interface ApiConfig {
  // ... outros campos
  storeId?: string; // ID da loja na Cubbo (obrigatório para algumas APIs)
}
```

### 2. Requisições Atualizadas

**Arquivo:** `services/supportService.ts`

#### `trackOrder()`
- ✅ Adiciona `store_id` como query parameter se estiver configurado
- ✅ Valida se `store_id` está configurado antes de fazer a requisição
- ✅ Retorna erro específico se `store_id` não estiver configurado

#### `findOrdersByCustomer()`
- ✅ Adiciona `store_id` aos query parameters
- ✅ Valida se `store_id` está configurado antes de fazer a requisição
- ✅ Retorna array vazio silenciosamente se não estiver configurado

### 3. Interface Administrativa Atualizada

**Arquivo:** `components/AdminTraining.tsx`

- ✅ Adicionado campo `Store ID` no formulário de configuração da API
- ✅ Campo com placeholder explicativo
- ✅ Texto de ajuda explicando a necessidade do Store ID

## Como Configurar o Store ID

### 1. Acessar Painel Admin

1. Faça login como administrador
2. Vá em **Treinamento** > **Configurações de API**
3. Clique em **Editar** na configuração da Cubbo

### 2. Adicionar Store ID

1. No formulário, encontre o campo **Store ID (ID da Loja)**
2. Digite o ID da sua loja na Cubbo
3. Clique em **Salvar**

### 3. Onde Encontrar o Store ID

O Store ID pode ser encontrado:
- No painel administrativo da Cubbo
- Na documentação da API Cubbo
- Entrando em contato com o suporte da Cubbo

## Estrutura das Requisições Atualizadas

### Antes (❌ Erro 422):
```
GET /api/orders/123
```

### Agora (✅ Funciona):
```
GET /api/orders/123?store_id=SEU_STORE_ID
```

## Validações Implementadas

### `trackOrder()`
- ✅ Verifica se configuração existe
- ✅ Verifica se `store_id` está configurado
- ✅ Retorna erro específico se faltar

### `findOrdersByCustomer()`
- ✅ Verifica se configuração existe
- ✅ Verifica se `store_id` está configurado
- ✅ Retorna array vazio se faltar (não quebra o fluxo)

## Logs Adicionados

Os logs agora mostram:
- URL completa da requisição (incluindo `store_id`)
- Valor do `store_id` usado
- Ajuda na depuração de problemas

## Próximos Passos

1. ✅ Configure o `store_id` no painel administrativo
2. ✅ Teste buscar um pedido por ID
3. ✅ Teste buscar pedidos por email/telefone
4. ✅ Verifique se os erros 422 desapareceram

## Nota Importante

O `store_id` é específico de cada loja na Cubbo. Se você tem múltiplas lojas, cada uma terá seu próprio `store_id` e você precisará configurar corretamente qual usar.



