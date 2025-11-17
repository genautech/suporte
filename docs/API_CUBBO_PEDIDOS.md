# 📦 Documentação: API Cubbo - Buscar Pedidos com Diferentes Status

**Data:** 2025-01-XX  
**Versão:** 1.0  
**Para:** Desenvolvedor Frontend - Tela "Meus Pedidos"

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Autenticação](#autenticação)
3. [Endpoints Disponíveis](#endpoints-disponíveis)
4. [Estrutura de Dados](#estrutura-de-dados)
5. [Como Buscar Pedidos](#como-buscar-pedidos)
6. [Filtrar Pedidos por Status](#filtrar-pedidos-por-status)
7. [Exemplos Práticos](#exemplos-práticos)
8. [Status Disponíveis](#status-disponíveis)
9. [Tratamento de Erros](#tratamento-de-erros)
10. [Boas Práticas](#boas-práticas)

---

## 🎯 Visão Geral

A API da Cubbo permite buscar pedidos de e-commerce através de um proxy seguro hospedado no Google Cloud Run. Todos os pedidos retornados incluem um campo `status` que indica o estado atual do pedido.

**URL do Proxy:** `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`

**Base URL da API Cubbo:** `https://api.cubbo.com/v1`

**⚠️ IMPORTANTE:** 
- Todas as requisições devem passar pelo proxy (não chamar a API diretamente)
- O parâmetro `store_id` é **OBRIGATÓRIO** em todas as requisições de pedidos
- A autenticação é gerenciada automaticamente pelo proxy

---

## 🔐 Autenticação

A autenticação é feita automaticamente pelo proxy. Você **não precisa** gerenciar tokens manualmente.

O proxy usa OAuth 2.0 Client Credentials para obter um token de acesso da API Cubbo. O token é válido por 24 horas (86400 segundos).

**Fluxo:**
1. Frontend faz requisição para o proxy
2. Proxy obtém token automaticamente (se necessário)
3. Proxy adiciona header `Authorization: Bearer {token}` na requisição para a API Cubbo
4. Proxy retorna resposta ao frontend

---

## 📡 Endpoints Disponíveis

### 1. Buscar Pedidos por Email do Cliente

**Endpoint:** `GET /api/orders`

**Query Parameters:**
- `store_id` (obrigatório) - ID da loja na Cubbo
- `shipping_email` (opcional) - Email do cliente para buscar pedidos
- `customer_phone` (opcional) - Telefone do cliente para buscar pedidos
- `per_page` (opcional) - Número de resultados por página (padrão: 100)
- `page` (opcional) - Número da página (padrão: 1)
- `sort` (opcional) - Ordenação: `asc` ou `desc` (padrão: `desc`)
- `sort_by` (opcional) - Campo para ordenação: `created_at`, `updated_at`, etc. (padrão: `created_at`)

**Exemplo de Requisição:**
```javascript
const proxyUrl = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';
const storeId = 'seu-store-id-aqui';
const customerEmail = 'cliente@exemplo.com';

const url = `${proxyUrl}/api/orders?store_id=${storeId}&shipping_email=${customerEmail}&per_page=100&page=1&sort=desc&sort_by=created_at`;

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

**Resposta:**
```json
{
  "orders": [
    {
      "id": "12345",
      "order_number": "LP-12345",
      "status": "shipped",
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-16T14:20:00Z",
      "shipped_at": "2025-01-16T10:00:00Z",
      "delivered_at": null,
      "customer_email": "cliente@exemplo.com",
      "shipping_email": "cliente@exemplo.com",
      "customer_phone": "+5511999999999",
      "total_amount": 299.90,
      "currency": "BRL",
      "payment_method": "credit_card",
      "items": [
        {
          "sku": "PROD-001",
          "name": "Produto Exemplo",
          "quantity": 2,
          "price": 149.95,
          "total": 299.90
        }
      ],
      "items_summary": ["2x Produto Exemplo"],
      "shipping_address": {
        "street": "Rua Exemplo",
        "street_number": "123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01234-567",
        "country": "Brasil"
      },
      "shipping_information": {
        "tracking_url": "https://rastreio.transportadora.com/ABC123",
        "tracking_number": "ABC123456789",
        "courier": "Transportadora Exemplo",
        "estimated_time_arrival": "3-5 dias úteis"
      }
    }
  ]
}
```

### 2. Buscar Pedidos por Telefone do Cliente

**Endpoint:** `GET /api/orders`

**Query Parameters:**
- `store_id` (obrigatório) - ID da loja na Cubbo
- `customer_phone` (obrigatório) - Telefone do cliente (apenas números, sem formatação)
- `per_page`, `page`, `sort`, `sort_by` (opcionais) - Mesmos parâmetros de paginação

**Exemplo de Requisição:**
```javascript
const customerPhone = '11999999999'; // Apenas números, sem formatação
const url = `${proxyUrl}/api/orders?store_id=${storeId}&customer_phone=${customerPhone}`;

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

### 3. Buscar Pedido Específico por Número do Pedido

**Endpoint:** `GET /api/orders`

**Query Parameters:**
- `store_id` (obrigatório) - ID da loja na Cubbo
- `order_number` (obrigatório) - Número do pedido (ex: "LP-12345", "R123456")

**⚠️ IMPORTANTE:** 
- Use `order_number` como **query parameter**, NÃO como path parameter
- O código do pedido deve ser usado **EXATAMENTE** como fornecido (com hífens, duplicações, etc.)
- A resposta sempre retorna `{ orders: [...] }` mesmo para busca individual
- Pegue o primeiro item: `orders[0]`

**Exemplo de Requisição:**
```javascript
const orderNumber = 'LP-12345';
const url = `${proxyUrl}/api/orders?store_id=${storeId}&order_number=${encodeURIComponent(orderNumber)}`;

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
const order = data.orders[0]; // Pegar o primeiro pedido da lista
```

---

## 📊 Estrutura de Dados

### Objeto Order (CubboOrder)

```typescript
interface CubboOrder {
  // Identificação
  id: string;                    // ID único do pedido na Cubbo
  order_number: string;          // Número do pedido (ex: "LP-12345", "R123456")
  
  // Status e Datas
  status: string;               // Status do pedido (ver seção "Status Disponíveis")
  created_at: string;           // Data de criação (ISO 8601)
  updated_at?: string;          // Data de última atualização (ISO 8601)
  shipped_at?: string;          // Data de envio (quando status = "shipped")
  delivered_at?: string;         // Data de entrega (quando status = "delivered")
  
  // Cliente
  customer_email?: string;       // Email do cliente
  shipping_email?: string;      // Email de entrega (usado na busca)
  customer_phone?: string;       // Telefone do cliente
  
  // Produtos
  items?: OrderItem[];           // Array detalhado de itens do pedido
  items_summary?: string[];      // Resumo dos produtos (ex: ["2x Produto A", "1x Produto B"])
  
  // Valores
  total_amount?: number;          // Valor total do pedido
  currency?: string;             // Moeda (ex: "BRL", "USD")
  payment_method?: string;       // Método de pagamento
  
  // Endereço de Entrega
  shipping_address?: {
    street: string;
    street_number?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    complement?: string;
    reference?: string;
  };
  
  // Local de Coleta (Click and Collect)
  pickup_location?: {
    service_name: string;
    description?: string;
    source?: string;
    distance?: string;
    service_code?: string;
  };
  
  // Endereço de Cobrança
  billing_address?: ShippingAddress;
  
  // Informações de Envio
  shipping_information?: {
    tracking_url?: string;       // URL de rastreio
    tracking_number?: string;   // Código de rastreio
    courier?: string;            // Nome da transportadora
    email?: string;              // Email de entrega
    estimated_time_arrival?: string; // Tempo estimado de entrega
  };
  
  // Comprovante de Recebimento
  receipt_url?: string;          // URL do comprovante
  receipt_image?: string;        // Imagem/base64 do comprovante
}

interface OrderItem {
  sku: string;                   // SKU do produto
  name: string;                  // Nome do produto
  quantity: number;              // Quantidade
  price?: number;                // Preço unitário
  total?: number;                // Preço total (price * quantity)
}
```

---

## 🔍 Como Buscar Pedidos

### Buscar Todos os Pedidos de um Cliente

```javascript
async function buscarPedidosDoCliente(email, storeId) {
  const proxyUrl = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';
  
  // Construir URL com parâmetros
  const queryParams = new URLSearchParams({
    store_id: storeId,
    shipping_email: email,
    per_page: '100',        // Máximo de pedidos por página
    page: '1',              // Primeira página
    sort: 'desc',            // Mais recentes primeiro
    sort_by: 'created_at'    // Ordenar por data de criação
  });
  
  const url = `${proxyUrl}/api/orders?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar pedidos: ${response.status}`);
    }
    
    const data = await response.json();
    
    // A API sempre retorna { orders: [...] }
    const orders = data.orders || [];
    
    return orders;
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    throw error;
  }
}

// Uso
const pedidos = await buscarPedidosDoCliente('cliente@exemplo.com', 'seu-store-id');
console.log(`Encontrados ${pedidos.length} pedidos`);
```

### Buscar Pedido Específico

```javascript
async function buscarPedidoPorNumero(orderNumber, storeId) {
  const proxyUrl = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';
  
  const queryParams = new URLSearchParams({
    store_id: storeId,
    order_number: orderNumber  // Usar exatamente como fornecido
  });
  
  const url = `${proxyUrl}/api/orders?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 404) {
      return null; // Pedido não encontrado
    }
    
    if (!response.ok) {
      throw new Error(`Erro ao buscar pedido: ${response.status}`);
    }
    
    const data = await response.json();
    
    // A API sempre retorna { orders: [...] } mesmo para busca individual
    // Pegar o primeiro pedido da lista
    return data.orders && data.orders.length > 0 ? data.orders[0] : null;
  } catch (error) {
    console.error('Erro ao buscar pedido:', error);
    throw error;
  }
}

// Uso
const pedido = await buscarPedidoPorNumero('LP-12345', 'seu-store-id');
if (pedido) {
  console.log(`Pedido encontrado: ${pedido.order_number} - Status: ${pedido.status}`);
} else {
  console.log('Pedido não encontrado');
}
```

---

## 🎨 Filtrar Pedidos por Status

**⚠️ IMPORTANTE:** A API da Cubbo **não possui** um parâmetro de query para filtrar pedidos por status diretamente. Você precisa:

1. Buscar todos os pedidos do cliente
2. Filtrar os pedidos no frontend pelo campo `status`

### Função de Filtro por Status

```javascript
/**
 * Filtra pedidos por status
 * @param {Array} orders - Array de pedidos
 * @param {string|string[]} statusFilter - Status desejado ou array de status
 * @returns {Array} - Array de pedidos filtrados
 */
function filtrarPedidosPorStatus(orders, statusFilter) {
  if (!orders || !Array.isArray(orders)) {
    return [];
  }
  
  // Se statusFilter é um array, filtrar por múltiplos status
  if (Array.isArray(statusFilter)) {
    return orders.filter(order => 
      statusFilter.includes(order.status?.toLowerCase())
    );
  }
  
  // Se statusFilter é uma string, filtrar por um único status
  return orders.filter(order => 
    order.status?.toLowerCase() === statusFilter.toLowerCase()
  );
}

// Exemplos de uso:

// Filtrar apenas pedidos pendentes
const pedidosPendentes = filtrarPedidosPorStatus(pedidos, 'pending');

// Filtrar pedidos enviados ou entregues
const pedidosEnviadosOuEntregues = filtrarPedidosPorStatus(pedidos, ['shipped', 'delivered']);

// Filtrar pedidos ativos (não cancelados nem reembolsados)
const pedidosAtivos = filtrarPedidosPorStatus(pedidos, [
  'pending',
  'processing',
  'shipped',
  'delivered'
]);
```

### Função Completa: Buscar e Filtrar Pedidos

```javascript
/**
 * Busca pedidos do cliente e filtra por status
 * @param {string} email - Email do cliente
 * @param {string} storeId - ID da loja
 * @param {string|string[]} statusFilter - Status para filtrar (opcional)
 * @returns {Promise<Array>} - Array de pedidos filtrados
 */
async function buscarPedidosFiltrados(email, storeId, statusFilter = null) {
  try {
    // 1. Buscar todos os pedidos do cliente
    const todosPedidos = await buscarPedidosDoCliente(email, storeId);
    
    // 2. Se statusFilter foi fornecido, filtrar
    if (statusFilter) {
      return filtrarPedidosPorStatus(todosPedidos, statusFilter);
    }
    
    // 3. Se não há filtro, retornar todos
    return todosPedidos;
  } catch (error) {
    console.error('Erro ao buscar pedidos filtrados:', error);
    throw error;
  }
}

// Uso:
const pedidosPendentes = await buscarPedidosFiltrados(
  'cliente@exemplo.com',
  'seu-store-id',
  'pending'
);

const pedidosEnviados = await buscarPedidosFiltrados(
  'cliente@exemplo.com',
  'seu-store-id',
  ['shipped', 'delivered']
);
```

### Agrupar Pedidos por Status

```javascript
/**
 * Agrupa pedidos por status
 * @param {Array} orders - Array de pedidos
 * @returns {Object} - Objeto com pedidos agrupados por status
 */
function agruparPedidosPorStatus(orders) {
  if (!orders || !Array.isArray(orders)) {
    return {};
  }
  
  return orders.reduce((grupos, order) => {
    const status = order.status?.toLowerCase() || 'unknown';
    
    if (!grupos[status]) {
      grupos[status] = [];
    }
    
    grupos[status].push(order);
    
    return grupos;
  }, {});
}

// Uso:
const pedidosAgrupados = agruparPedidosPorStatus(pedidos);

console.log('Pendentes:', pedidosAgrupados.pending?.length || 0);
console.log('Processando:', pedidosAgrupados.processing?.length || 0);
console.log('Enviados:', pedidosAgrupados.shipped?.length || 0);
console.log('Entregues:', pedidosAgrupados.delivered?.length || 0);
console.log('Cancelados:', pedidosAgrupados.cancelled?.length || 0);
console.log('Reembolsados:', pedidosAgrupados.refunded?.length || 0);
```

---

## 📋 Status Disponíveis

A API Cubbo retorna os seguintes status de pedidos:

| Status | Descrição | Badge Sugerido |
|--------|-----------|----------------|
| `pending` | Pedido pendente (aguardando pagamento/confirmação) | ⚠️ Amarelo/Warning |
| `processing` | Pedido em processamento (sendo preparado) | 🔵 Azul/Info |
| `shipped` | Pedido enviado (em trânsito) | ⚪ Cinza/Default |
| `delivered` | Pedido entregue | ✅ Verde/Success |
| `cancelled` | Pedido cancelado | ❌ Vermelho/Destructive |
| `refunded` | Pedido reembolsado | ⚪ Cinza claro/Secondary |

### Mapeamento de Status para Exibição

```javascript
const STATUS_MAP = {
  'pending': {
    label: 'Pendente',
    color: 'warning',
    icon: '⏳'
  },
  'processing': {
    label: 'Processando',
    color: 'info',
    icon: '🔄'
  },
  'shipped': {
    label: 'Enviado',
    color: 'default',
    icon: '🚚'
  },
  'delivered': {
    label: 'Entregue',
    color: 'success',
    icon: '✅'
  },
  'cancelled': {
    label: 'Cancelado',
    color: 'destructive',
    icon: '❌'
  },
  'refunded': {
    label: 'Reembolsado',
    color: 'secondary',
    icon: '💰'
  }
};

function getStatusInfo(status) {
  const normalizedStatus = status?.toLowerCase() || 'unknown';
  return STATUS_MAP[normalizedStatus] || {
    label: status || 'Desconhecido',
    color: 'outline',
    icon: '❓'
  };
}

// Uso:
const statusInfo = getStatusInfo(pedido.status);
console.log(`${statusInfo.icon} ${statusInfo.label}`); // ⏳ Pendente
```

---

## 💻 Exemplos Práticos

### Exemplo 1: Componente React - Listar Pedidos por Status

```tsx
import React, { useState, useEffect } from 'react';

interface Order {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  total_amount?: number;
  currency?: string;
  items_summary?: string[];
}

const MeusPedidos: React.FC = () => {
  const [pedidos, setPedidos] = useState<Order[]>([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState<Order[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const STORE_ID = 'seu-store-id-aqui'; // Obter do contexto/configuração
  const USER_EMAIL = 'cliente@exemplo.com'; // Obter do contexto de autenticação

  useEffect(() => {
    buscarPedidos();
  }, []);

  useEffect(() => {
    // Filtrar pedidos quando statusFiltro mudar
    if (statusFiltro) {
      const filtrados = filtrarPedidosPorStatus(pedidos, statusFiltro);
      setPedidosFiltrados(filtrados);
    } else {
      setPedidosFiltrados(pedidos);
    }
  }, [statusFiltro, pedidos]);

  const buscarPedidos = async () => {
    setLoading(true);
    setError(null);

    try {
      const proxyUrl = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';
      const queryParams = new URLSearchParams({
        store_id: STORE_ID,
        shipping_email: USER_EMAIL,
        per_page: '100',
        page: '1',
        sort: 'desc',
        sort_by: 'created_at'
      });

      const response = await fetch(`${proxyUrl}/api/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pedidos: ${response.status}`);
      }

      const data = await response.json();
      const orders = data.orders || [];
      setPedidos(orders);
      setPedidosFiltrados(orders);
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err.message || 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const filtrarPedidosPorStatus = (orders: Order[], statusFilter: string | null): Order[] => {
    if (!statusFilter) return orders;
    return orders.filter(order => order.status?.toLowerCase() === statusFilter.toLowerCase());
  };

  const getStatusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': 'Pendente',
      'processing': 'Processando',
      'shipped': 'Enviado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado',
      'refunded': 'Reembolsado'
    };
    return statusMap[status?.toLowerCase()] || status;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string = 'BRL'): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  if (loading) {
    return <div>Carregando pedidos...</div>;
  }

  if (error) {
    return <div>Erro: {error}</div>;
  }

  return (
    <div>
      <h1>Meus Pedidos</h1>
      
      {/* Filtros por Status */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setStatusFiltro(null)}>
          Todos ({pedidos.length})
        </button>
        <button onClick={() => setStatusFiltro('pending')}>
          Pendentes ({filtrarPedidosPorStatus(pedidos, 'pending').length})
        </button>
        <button onClick={() => setStatusFiltro('processing')}>
          Processando ({filtrarPedidosPorStatus(pedidos, 'processing').length})
        </button>
        <button onClick={() => setStatusFiltro('shipped')}>
          Enviados ({filtrarPedidosPorStatus(pedidos, 'shipped').length})
        </button>
        <button onClick={() => setStatusFiltro('delivered')}>
          Entregues ({filtrarPedidosPorStatus(pedidos, 'delivered').length})
        </button>
        <button onClick={() => setStatusFiltro('cancelled')}>
          Cancelados ({filtrarPedidosPorStatus(pedidos, 'cancelled').length})
        </button>
      </div>

      {/* Lista de Pedidos */}
      {pedidosFiltrados.length === 0 ? (
        <div>Nenhum pedido encontrado</div>
      ) : (
        <div>
          {pedidosFiltrados.map((pedido) => (
            <div key={pedido.id} style={{ border: '1px solid #ccc', padding: '15px', marginBottom: '10px' }}>
              <h3>Pedido {pedido.order_number}</h3>
              <p>Status: {getStatusLabel(pedido.status)}</p>
              <p>Data: {formatDate(pedido.created_at)}</p>
              {pedido.total_amount && (
                <p>Total: {formatCurrency(pedido.total_amount, pedido.currency)}</p>
              )}
              {pedido.items_summary && pedido.items_summary.length > 0 && (
                <p>Produtos: {pedido.items_summary.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MeusPedidos;
```

### Exemplo 2: Hook Customizado para Buscar Pedidos

```typescript
import { useState, useEffect } from 'react';

interface UsePedidosOptions {
  email: string;
  storeId: string;
  statusFilter?: string | string[];
}

interface UsePedidosReturn {
  pedidos: CubboOrder[];
  pedidosFiltrados: CubboOrder[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function usePedidos({ email, storeId, statusFilter }: UsePedidosOptions): UsePedidosReturn {
  const [pedidos, setPedidos] = useState<CubboOrder[]>([]);
  const [pedidosFiltrados, setPedidosFiltrados] = useState<CubboOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buscarPedidos = async () => {
    if (!email || !storeId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const proxyUrl = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';
      const queryParams = new URLSearchParams({
        store_id: storeId,
        shipping_email: email,
        per_page: '100',
        page: '1',
        sort: 'desc',
        sort_by: 'created_at'
      });

      const response = await fetch(`${proxyUrl}/api/orders?${queryParams.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ao buscar pedidos: ${response.status}`);
      }

      const data = await response.json();
      const orders = data.orders || [];
      setPedidos(orders);

      // Aplicar filtro se fornecido
      if (statusFilter) {
        const filtrados = filtrarPedidosPorStatus(orders, statusFilter);
        setPedidosFiltrados(filtrados);
      } else {
        setPedidosFiltrados(orders);
      }
    } catch (err: any) {
      console.error('Erro ao buscar pedidos:', err);
      setError(err.message || 'Erro ao carregar pedidos');
      setPedidos([]);
      setPedidosFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    buscarPedidos();
  }, [email, storeId]);

  useEffect(() => {
    // Reaplicar filtro quando statusFilter mudar
    if (statusFilter) {
      const filtrados = filtrarPedidosPorStatus(pedidos, statusFilter);
      setPedidosFiltrados(filtrados);
    } else {
      setPedidosFiltrados(pedidos);
    }
  }, [statusFilter, pedidos]);

  return {
    pedidos,
    pedidosFiltrados,
    loading,
    error,
    refetch: buscarPedidos
  };
}

// Uso:
const { pedidosFiltrados, loading, error, refetch } = usePedidos({
  email: 'cliente@exemplo.com',
  storeId: 'seu-store-id',
  statusFilter: 'pending' // ou ['pending', 'processing']
});
```

### Exemplo 3: Função Utilitária Completa

```typescript
// utils/cubboApi.ts

const PROXY_URL = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';

export interface CubboOrder {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  updated_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  customer_email?: string;
  shipping_email?: string;
  customer_phone?: string;
  total_amount?: number;
  currency?: string;
  payment_method?: string;
  items?: Array<{
    sku: string;
    name: string;
    quantity: number;
    price?: number;
    total?: number;
  }>;
  items_summary?: string[];
  shipping_address?: {
    street: string;
    street_number?: string;
    neighborhood?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
    complement?: string;
    reference?: string;
  };
  shipping_information?: {
    tracking_url?: string;
    tracking_number?: string;
    courier?: string;
    email?: string;
    estimated_time_arrival?: string;
  };
}

export interface BuscarPedidosOptions {
  email?: string;
  phone?: string;
  orderNumber?: string;
  storeId: string;
  statusFilter?: string | string[];
  perPage?: number;
  page?: number;
  sort?: 'asc' | 'desc';
  sortBy?: string;
}

/**
 * Busca pedidos da API Cubbo
 */
export async function buscarPedidos(options: BuscarPedidosOptions): Promise<CubboOrder[]> {
  const {
    email,
    phone,
    orderNumber,
    storeId,
    perPage = 100,
    page = 1,
    sort = 'desc',
    sortBy = 'created_at'
  } = options;

  if (!storeId) {
    throw new Error('store_id é obrigatório');
  }

  if (!email && !phone && !orderNumber) {
    throw new Error('É necessário fornecer email, telefone ou número do pedido');
  }

  const queryParams = new URLSearchParams({
    store_id: storeId
  });

  if (email) {
    queryParams.append('shipping_email', email);
  } else if (phone) {
    queryParams.append('customer_phone', phone.replace(/\D/g, '')); // Apenas números
  } else if (orderNumber) {
    queryParams.append('order_number', orderNumber);
  }

  if (!orderNumber) {
    // Parâmetros de paginação apenas para listagem (não para busca individual)
    queryParams.append('per_page', perPage.toString());
    queryParams.append('page', page.toString());
    queryParams.append('sort', sort);
    queryParams.append('sort_by', sortBy);
  }

  const url = `${PROXY_URL}/api/orders?${queryParams.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      return []; // Nenhum pedido encontrado
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      throw new Error(`Erro ao buscar pedidos: ${response.status} - ${errorData.error || errorText}`);
    }

    const data = await response.json();
    const orders = data.orders || [];

    // Se foi busca individual por order_number, retornar apenas o primeiro
    if (orderNumber && orders.length > 0) {
      return [orders[0]];
    }

    // Aplicar filtro de status se fornecido
    if (options.statusFilter) {
      return filtrarPedidosPorStatus(orders, options.statusFilter);
    }

    return orders;
  } catch (error: any) {
    console.error('Erro ao buscar pedidos:', error);
    throw error;
  }
}

/**
 * Filtra pedidos por status
 */
export function filtrarPedidosPorStatus(
  orders: CubboOrder[],
  statusFilter: string | string[]
): CubboOrder[] {
  if (!orders || !Array.isArray(orders)) {
    return [];
  }

  if (Array.isArray(statusFilter)) {
    return orders.filter(order =>
      statusFilter.includes(order.status?.toLowerCase())
    );
  }

  return orders.filter(order =>
    order.status?.toLowerCase() === statusFilter.toLowerCase()
  );
}

/**
 * Agrupa pedidos por status
 */
export function agruparPedidosPorStatus(orders: CubboOrder[]): Record<string, CubboOrder[]> {
  if (!orders || !Array.isArray(orders)) {
    return {};
  }

  return orders.reduce((grupos, order) => {
    const status = order.status?.toLowerCase() || 'unknown';
    if (!grupos[status]) {
      grupos[status] = [];
    }
    grupos[status].push(order);
    return grupos;
  }, {} as Record<string, CubboOrder[]>);
}

/**
 * Obtém informações formatadas de status
 */
export function getStatusInfo(status: string) {
  const statusMap: Record<string, { label: string; color: string; icon: string }> = {
    'pending': {
      label: 'Pendente',
      color: 'warning',
      icon: '⏳'
    },
    'processing': {
      label: 'Processando',
      color: 'info',
      icon: '🔄'
    },
    'shipped': {
      label: 'Enviado',
      color: 'default',
      icon: '🚚'
    },
    'delivered': {
      label: 'Entregue',
      color: 'success',
      icon: '✅'
    },
    'cancelled': {
      label: 'Cancelado',
      color: 'destructive',
      icon: '❌'
    },
    'refunded': {
      label: 'Reembolsado',
      color: 'secondary',
      icon: '💰'
    }
  };

  const normalizedStatus = status?.toLowerCase() || 'unknown';
  return statusMap[normalizedStatus] || {
    label: status || 'Desconhecido',
    color: 'outline',
    icon: '❓'
  };
}
```

---

## ⚠️ Tratamento de Erros

### Erros Comuns e Soluções

#### 1. Erro 400 - Bad Request
**Causa:** Parâmetros inválidos ou `store_id` faltando  
**Solução:** Verificar se `store_id` está sendo enviado e se está correto

```javascript
if (!storeId || storeId.trim() === '') {
  throw new Error('store_id é obrigatório');
}
```

#### 2. Erro 401 - Unauthorized
**Causa:** Token de autenticação inválido ou expirado  
**Solução:** O proxy gerencia automaticamente, mas pode indicar problema nas credenciais

```javascript
if (response.status === 401) {
  // Tentar novamente após alguns segundos
  await new Promise(resolve => setTimeout(resolve, 2000));
  return buscarPedidos(); // Retry
}
```

#### 3. Erro 404 - Not Found
**Causa:** Pedido não encontrado ou email sem pedidos  
**Solução:** Tratar como caso válido (retornar array vazio)

```javascript
if (response.status === 404) {
  return []; // Nenhum pedido encontrado
}
```

#### 4. Erro 500 - Internal Server Error
**Causa:** Erro no proxy ou na API Cubbo  
**Solução:** Logar erro e informar usuário

```javascript
if (response.status >= 500) {
  console.error('Erro no servidor:', await response.text());
  throw new Error('Erro temporário no servidor. Tente novamente em alguns instantes.');
}
```

#### 5. Erro de Rede/CORS
**Causa:** Problema de conexão ou CORS  
**Solução:** Verificar se está usando o proxy correto

```javascript
try {
  const response = await fetch(url);
} catch (error) {
  if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
    throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
  }
  throw error;
}
```

### Função de Tratamento de Erros Completa

```typescript
async function buscarPedidosComRetry(
  email: string,
  storeId: string,
  maxRetries: number = 3
): Promise<CubboOrder[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await buscarPedidos({ email, storeId });
    } catch (error: any) {
      lastError = error;
      
      // Se for erro 404, não tentar novamente
      if (error.message?.includes('404')) {
        return [];
      }
      
      // Se for erro 401, aguardar antes de tentar novamente
      if (error.message?.includes('401') && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      
      // Se for erro 500, aguardar antes de tentar novamente
      if (error.message?.includes('500') && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      
      // Outros erros: não tentar novamente
      throw error;
    }
  }

  throw lastError || new Error('Erro ao buscar pedidos após múltiplas tentativas');
}
```

---

## ✅ Boas Práticas

### 1. Cache de Pedidos
Evite fazer múltiplas requisições desnecessárias:

```typescript
const CACHE_DURATION = 60000; // 1 minuto
let pedidosCache: { data: CubboOrder[]; timestamp: number } | null = null;

async function buscarPedidosComCache(email: string, storeId: string): Promise<CubboOrder[]> {
  const now = Date.now();
  
  // Se cache existe e ainda é válido, retornar cache
  if (pedidosCache && (now - pedidosCache.timestamp) < CACHE_DURATION) {
    return pedidosCache.data;
  }
  
  // Buscar novos pedidos
  const pedidos = await buscarPedidos({ email, storeId });
  
  // Atualizar cache
  pedidosCache = {
    data: pedidos,
    timestamp: now
  };
  
  return pedidos;
}
```

### 2. Paginação
Para muitos pedidos, implemente paginação:

```typescript
async function buscarPedidosPaginados(
  email: string,
  storeId: string,
  page: number = 1,
  perPage: number = 20
): Promise<{ orders: CubboOrder[]; total: number; page: number; perPage: number }> {
  const orders = await buscarPedidos({
    email,
    storeId,
    page,
    perPage
  });
  
  // Nota: A API pode não retornar total, então você pode precisar
  // fazer uma requisição adicional ou estimar baseado no tamanho da resposta
  return {
    orders,
    total: orders.length, // Aproximação
    page,
    perPage
  };
}
```

### 3. Loading States
Sempre forneça feedback visual durante carregamento:

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function buscarPedidos() {
  setLoading(true);
  setError(null);
  
  try {
    const pedidos = await buscarPedidos({ email, storeId });
    setPedidos(pedidos);
  } catch (err: any) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
```

### 4. Validação de Dados
Sempre valide os dados recebidos:

```typescript
function validarPedido(order: any): order is CubboOrder {
  return (
    order &&
    typeof order.id === 'string' &&
    typeof order.order_number === 'string' &&
    typeof order.status === 'string' &&
    typeof order.created_at === 'string'
  );
}

const pedidos = data.orders.filter(validarPedido);
```

### 5. Tratamento de Status Desconhecidos
Sempre trate casos onde o status pode ser desconhecido:

```typescript
function getStatusLabel(status: string | undefined): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pendente',
    'processing': 'Processando',
    'shipped': 'Enviado',
    'delivered': 'Entregue',
    'cancelled': 'Cancelado',
    'refunded': 'Reembolsado'
  };
  
  return statusMap[status?.toLowerCase() || ''] || status || 'Desconhecido';
}
```

---

## 📝 Resumo Rápido

### Checklist para Implementar "Meus Pedidos"

- [ ] Obter `store_id` da configuração/contexto
- [ ] Obter email do cliente logado
- [ ] Fazer requisição para `/api/orders` com `store_id` e `shipping_email`
- [ ] Processar resposta `{ orders: [...] }`
- [ ] Filtrar pedidos por status no frontend (se necessário)
- [ ] Exibir pedidos agrupados por status ou em tabs
- [ ] Tratar erros (404, 500, rede)
- [ ] Adicionar loading states
- [ ] Implementar cache (opcional)
- [ ] Formatar datas e valores monetários
- [ ] Adicionar links de rastreio quando disponíveis

### URLs Importantes

- **Proxy URL:** `https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app`
- **Documentação Cubbo:** `https://developers.cubbo.com/`
- **Endpoint de Pedidos:** `GET /api/orders`

### Parâmetros Obrigatórios

- `store_id` - **SEMPRE obrigatório** em todas as requisições
- `shipping_email` OU `customer_phone` OU `order_number` - Pelo menos um deve ser fornecido

---

## 🆘 Suporte

Se encontrar problemas:

1. Verifique se o `store_id` está configurado corretamente
2. Verifique se está usando o proxy correto
3. Verifique os logs do console para erros específicos
4. Verifique se o email/telefone do cliente está correto
5. Verifique se há pedidos associados ao cliente na Cubbo

---

**Última Atualização:** 2025-01-XX  
**Versão:** 1.0






