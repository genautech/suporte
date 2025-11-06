import React from 'react';
import { CubboOrder } from '../types';

interface OrderListProps {
  orders: CubboOrder[];
  onOrderClick?: (order: CubboOrder) => void;
}

export const OrderList: React.FC<OrderListProps> = ({ orders, onOrderClick }) => {
  if (orders.length === 0) {
    return (
      <div className="alert alert-info">
        <span>Nenhum pedido encontrado.</span>
      </div>
    );
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Data não disponível';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('[OrderList] Erro ao formatar data:', dateString, e);
      return 'Data não disponível';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; class: string }> = {
      'pending': { text: 'Pendente', class: 'badge-warning' },
      'processing': { text: 'Processando', class: 'badge-info' },
      'shipped': { text: 'Enviado', class: 'badge-primary' },
      'delivered': { text: 'Entregue', class: 'badge-success' },
      'cancelled': { text: 'Cancelado', class: 'badge-error' },
      'refunded': { text: 'Reembolsado', class: 'badge-neutral' }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { text: status, class: 'badge-neutral' };
    return <span className={`badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className={`card bg-base-100 shadow-md ${onOrderClick ? 'cursor-pointer hover:bg-accent/50 transition-colors' : ''}`}
          onClick={() => onOrderClick?.(order)}
        >
          <div className="card-body p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="card-title text-lg">📦 Pedido {order.order_number}</h3>
              {getStatusBadge(order.status)}
            </div>
            
            <div className="text-sm space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-muted-foreground text-xs">Data do Pedido</p>
                  <p className="font-medium">{formatDate(order.created_at)}</p>
                </div>
                
                {order.total_amount !== undefined && (
                  <div>
                    <p className="text-muted-foreground text-xs">Valor Total</p>
                        <p className="font-bold">
                          {order.currency === 'BRL' ? 'R$' : order.currency || 'R$'} {order.total_amount !== undefined ? (typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || '0')).toFixed(2) : '0.00'}
                        </p>
                  </div>
                )}
              </div>
              
              {/* Resumo de produtos */}
              {order.items && order.items.length > 0 ? (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Produtos</p>
                  <p className="text-sm">
                    {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}
                    {order.items_summary && order.items_summary.length > 0 && (
                      <span className="text-muted-foreground ml-2">
                        • {order.items_summary.slice(0, 2).join(', ')}
                        {order.items_summary.length > 2 && '...'}
                      </span>
                    )}
                  </p>
                </div>
              ) : order.items_summary && order.items_summary.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Produtos</p>
                  <p className="text-sm">
                    {order.items_summary.slice(0, 3).join(', ')}
                    {order.items_summary.length > 3 && '...'}
                  </p>
                </div>
              )}
              
              {onOrderClick && (
                <p className="text-xs text-primary mt-2 font-medium">Clique para ver detalhes completos →</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};



