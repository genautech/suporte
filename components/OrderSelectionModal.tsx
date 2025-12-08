import React, { useState, useEffect } from 'react';
import { CubboOrder } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface OrderSelectionModalProps {
  isOpen: boolean;
  orders: CubboOrder[];
  onSelect: (order: CubboOrder | CubboOrder[]) => void;
  onClose: () => void;
  allowMultiple?: boolean; // Se true, permite seleção múltipla
}

export const OrderSelectionModal: React.FC<OrderSelectionModalProps> = ({
  isOpen,
  orders,
  onSelect,
  onClose,
  allowMultiple = true,
}) => {
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Reset seleção quando modal abre/fecha
  useEffect(() => {
    if (!isOpen) {
      setSelectedOrderIds(new Set());
    }
  }, [isOpen]);

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedOrderIds(new Set(orders.map(o => o.id)));
  };

  const deselectAll = () => {
    setSelectedOrderIds(new Set());
  };

  const handleConfirmSelection = () => {
    if (allowMultiple && selectedOrderIds.size > 0) {
      const selectedOrders = orders.filter(o => selectedOrderIds.has(o.id));
      onSelect(selectedOrders);
    } else if (!allowMultiple && selectedOrderIds.size === 1) {
      const selectedOrder = orders.find(o => selectedOrderIds.has(o.id));
      if (selectedOrder) {
        onSelect(selectedOrder);
      }
    }
    onClose();
  };
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
        year: 'numeric'
      });
    } catch (e) {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]">
        <DialogHeader>
          <DialogTitle>
            {allowMultiple ? 'Selecione os Pedidos' : 'Selecione o Pedido'}
          </DialogTitle>
          <DialogDescription>
            Encontramos {orders.length} pedido(s) associado(s) ao seu email. 
            {allowMultiple 
              ? ' Por favor, selecione quais pedidos deseja consultar (pode selecionar múltiplos):'
              : ' Por favor, selecione qual pedido deseja consultar:'}
          </DialogDescription>
        </DialogHeader>
        
        {allowMultiple && orders.length > 1 && (
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar Todos
            </Button>
            <Button variant="outline" size="sm" onClick={deselectAll}>
              Desselecionar Todos
            </Button>
            {selectedOrderIds.size > 0 && (
              <span className="ml-auto flex items-center text-sm text-muted-foreground">
                {selectedOrderIds.size} selecionado(s)
              </span>
            )}
          </div>
        )}
        
        <div className="space-y-3 mt-4">
          {orders.map((order) => {
            const isSelected = selectedOrderIds.has(order.id);
            return (
              <Card
                key={order.id}
                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors border-2 ${
                  isSelected ? 'border-primary bg-primary/5' : 'hover:border-primary'
                }`}
                onClick={() => allowMultiple ? toggleOrderSelection(order.id) : onSelect(order)}
              >
                <div className="flex items-start gap-3">
                  {allowMultiple && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOrderSelection(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">📦 Pedido {order.order_number}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Data: {formatDate(order.created_at)}
                        </p>
                      </div>
                      {getStatusBadge(order.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-3">
                      {order.total_amount !== undefined && (
                        <div>
                          <p className="text-xs text-muted-foreground">Valor Total</p>
                          <p className="font-bold">
                            {order.currency === 'BRL' ? 'R$' : order.currency || 'R$'} {order.total_amount !== undefined ? (typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || '0')).toFixed(2) : '0.00'}
                          </p>
                        </div>
                      )}
                      
                      {order.items && order.items.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground">Produtos</p>
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
                      )}
                    </div>
                  </div>
                </div>
                
                {!allowMultiple && (
                  <div className="mt-3">
                    <Button 
                      className="w-full" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(order);
                      }}
                    >
                      Selecionar este pedido
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
        
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {allowMultiple && (
            <Button 
              onClick={handleConfirmSelection}
              disabled={selectedOrderIds.size === 0}
            >
              Confirmar ({selectedOrderIds.size})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};





