import React, { useState } from 'react';
import { CubboOrder } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { SupportTicketForm } from './SupportTicketForm';

interface OrderDetailModalProps {
  order: CubboOrder | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onTicketCreated?: () => void;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  isAdmin = false,
  onTicketCreated,
}) => {
  const [showTicketForm, setShowTicketForm] = useState(false);
  
  if (!order) return null;
  
  const handleOpenTicket = () => {
    setShowTicketForm(true);
  };
  
  const handleTicketCreated = (ticketId: string) => {
    setShowTicketForm(false);
    if (onTicketCreated) {
      onTicketCreated();
    }
    // Fechar modal de pedido após criar chamado
    onClose();
  };
  
  const handleCloseTicketForm = () => {
    setShowTicketForm(false);
  };
  
  // Obter email do pedido (prioridade: customer_email > shipping_email)
  const orderEmail = order.customer_email || order.shipping_email || '';
  const orderName = orderEmail.split('@')[0] || 'Cliente'; // Usar parte antes do @ como nome

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
        minute: '2-digit',
      });
    } catch (e) {
      console.warn('[OrderDetailModal] Erro ao formatar data:', dateString, e);
      return 'Data não disponível';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }
    > = {
      pending: { text: 'Pendente', variant: 'warning' },
      processing: { text: 'Processando', variant: 'info' },
      shipped: { text: 'Enviado', variant: 'default' },
      delivered: { text: 'Entregue', variant: 'success' },
      cancelled: { text: 'Cancelado', variant: 'destructive' },
      refunded: { text: 'Reembolsado', variant: 'secondary' },
    };

    const statusInfo =
      statusMap[status.toLowerCase()] || { text: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  // Verificar status para mostrar datas apropriadas
  const isShipped = order.status?.toLowerCase() === 'shipped';
  const isDelivered = order.status?.toLowerCase() === 'delivered';
  // Data de envio
  const shippingDate = order.shipped_at || (isShipped && order.updated_at ? order.updated_at : null);
  // Data de recebimento
  const deliveryDate = order.delivered_at || (isDelivered && order.updated_at ? order.updated_at : null);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto !z-[100]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              📦 Pedido {order.order_number}
            </DialogTitle>
            {getStatusBadge(order.status)}
          </div>
          <DialogDescription>ID: {order.id}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Informações Gerais */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">📋 Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    📅 Data do Pedido
                  </p>
                  <p className="text-sm">{formatDate(order.created_at)}</p>
                </div>

                {order.updated_at && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      🔄 Última Atualização
                    </p>
                    <p className="text-sm">{formatDate(order.updated_at)}</p>
                  </div>
                )}

                {shippingDate && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      📦 Data de Envio
                    </p>
                    <p className="text-sm font-semibold text-blue-600">
                      {formatDate(shippingDate)}
                    </p>
                  </div>
                )}

                {deliveryDate && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      ✅ Data de Recebimento
                    </p>
                    <p className="text-sm font-semibold text-green-600">
                      {formatDate(deliveryDate)}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    📊 Status
                  </p>
                  <p className="text-sm">{order.status}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Produtos */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">🛍️ Produtos</h3>
              {order.items && order.items.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 text-sm font-semibold">SKU</th>
                        <th className="text-left py-2 px-2 text-sm font-semibold">Nome</th>
                        <th className="text-center py-2 px-2 text-sm font-semibold">Qtd</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold">Preço Unit.</th>
                        <th className="text-right py-2 px-2 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-2 px-2 text-xs font-mono">{item.sku || '-'}</td>
                          <td className="py-2 px-2 text-sm">{item.name || '-'}</td>
                          <td className="py-2 px-2 text-sm text-center">{item.quantity}</td>
                          <td className="py-2 px-2 text-sm text-right">
                            {item.price !== undefined
                              ? `${order.currency === 'BRL' ? 'R$' : order.currency || 'R$'} ${(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(2)}`
                              : '-'}
                          </td>
                          <td className="py-2 px-2 text-sm text-right font-semibold">
                            {item.total !== undefined
                              ? `${order.currency === 'BRL' ? 'R$' : order.currency || 'R$'} ${(typeof item.total === 'number' ? item.total : parseFloat(item.total || '0')).toFixed(2)}`
                              : item.price !== undefined
                              ? `${order.currency === 'BRL' ? 'R$' : order.currency || 'R$'} ${((typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')) * item.quantity).toFixed(2)}`
                              : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : order.items_summary && order.items_summary.length > 0 ? (
                <ul className="list-disc list-inside space-y-1">
                  {order.items_summary.map((item, index) => (
                    <li key={index} className="text-sm">{item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Produtos não especificados</p>
              )}
            </CardContent>
          </Card>

          {/* Valores e Pagamento */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">💰 Valores e Pagamento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.total_amount !== undefined && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      Valor Total
                    </p>
                    <p className="text-lg font-bold">
                      {order.currency === 'BRL' ? 'R$' : order.currency || 'R$'}{' '}
                      {order.total_amount !== undefined ? (typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || '0')).toFixed(2) : '0.00'}
                    </p>
                  </div>
                )}

                {order.payment_method && (
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">
                      💳 Método de Pagamento
                    </p>
                    <p className="text-sm">{order.payment_method}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Endereço de Entrega ou Local de Coleta */}
          {order.pickup_location ? (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">
                  📍 Local de Coleta (Click and Collect)
                </h3>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-semibold">{order.pickup_location.service_name}</p>
                  <p className="text-sm">{order.pickup_location.description || order.pickup_location.source}</p>
                  {order.pickup_location.distance && (
                    <p className="text-xs text-muted-foreground">
                      Distância: {order.pickup_location.distance}
                    </p>
                  )}
                  {order.pickup_location.service_code && (
                    <p className="text-xs text-muted-foreground">
                      Código: {order.pickup_location.service_code}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : order.shipping_address ? (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">🏠 Endereço de Entrega</h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-1">
                  {order.shipping_address.street && (
                    <p className="text-sm">
                      {order.shipping_address.street}
                      {order.shipping_address.street_number &&
                        `, ${order.shipping_address.street_number}`}
                    </p>
                  )}
                  {order.shipping_address.neighborhood && (
                    <p className="text-sm">{order.shipping_address.neighborhood}</p>
                  )}
                  {(order.shipping_address.city || order.shipping_address.state) && (
                    <p className="text-sm">
                      {[order.shipping_address.city, order.shipping_address.state]
                        .filter(Boolean)
                        .join(' - ')}
                    </p>
                  )}
                  {order.shipping_address.zip_code && (
                    <p className="text-sm">CEP: {order.shipping_address.zip_code}</p>
                  )}
                  {order.shipping_address.country && (
                    <p className="text-sm">{order.shipping_address.country}</p>
                  )}
                  {order.shipping_address.complement && (
                    <p className="text-xs text-muted-foreground">
                      Complemento: {order.shipping_address.complement}
                    </p>
                  )}
                  {order.shipping_address.reference && (
                    <p className="text-xs text-muted-foreground">
                      Referência: {order.shipping_address.reference}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Endereço de Cobrança (se diferente) */}
          {order.billing_address &&
            JSON.stringify(order.billing_address) !== JSON.stringify(order.shipping_address) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">🧾 Endereço de Cobrança</h3>
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-lg space-y-1">
                    {order.billing_address.street && (
                      <p className="text-sm">
                        {order.billing_address.street}
                        {order.billing_address.street_number &&
                          `, ${order.billing_address.street_number}`}
                      </p>
                    )}
                    {order.billing_address.neighborhood && (
                      <p className="text-sm">{order.billing_address.neighborhood}</p>
                    )}
                    {(order.billing_address.city || order.billing_address.state) && (
                      <p className="text-sm">
                        {[order.billing_address.city, order.billing_address.state]
                          .filter(Boolean)
                          .join(' - ')}
                      </p>
                    )}
                    {order.billing_address.zip_code && (
                      <p className="text-sm">CEP: {order.billing_address.zip_code}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Informações de Envio */}
          {order.shipping_information &&
            (order.shipping_information.tracking_url ||
              order.shipping_information.tracking_number ||
              order.shipping_information.courier ||
              order.shipping_information.estimated_time_arrival) && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4">🚚 Informações de Envio</h3>
                  <div className="space-y-3">
                    {order.shipping_information.courier && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          Transportadora
                        </p>
                        <p className="text-sm">{order.shipping_information.courier}</p>
                      </div>
                    )}

                    {order.shipping_information.tracking_number && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          📋 Código de Rastreio
                        </p>
                        <p className="text-sm font-mono">
                          {order.shipping_information.tracking_number}
                        </p>
                      </div>
                    )}

                    {order.shipping_information.tracking_url && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          📍 Link de Rastreio
                        </p>
                        <a
                          href={order.shipping_information.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline break-all"
                        >
                          {order.shipping_information.tracking_url}
                        </a>
                      </div>
                    )}

                    {order.shipping_information.estimated_time_arrival && (
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-1">
                          ⏱️ Tempo Estimado de Entrega
                        </p>
                        <p className="text-sm">
                          {order.shipping_information.estimated_time_arrival}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

          {/* Informações do Cliente */}
          {(order.customer_email || order.shipping_email || order.customer_phone) && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">👤 Informações do Cliente</h3>
                <div className="space-y-2">
                  {order.customer_email && (
                    <p className="text-sm">
                      <span className="font-semibold text-muted-foreground">📧 Email:</span>{' '}
                      {order.customer_email}
                    </p>
                  )}
                  {order.shipping_email &&
                    order.shipping_email !== order.customer_email && (
                      <p className="text-sm">
                        <span className="font-semibold text-muted-foreground">
                          📧 Email de Entrega:
                        </span>{' '}
                        {order.shipping_email}
                      </p>
                    )}
                  {order.customer_phone && (
                    <p className="text-sm">
                      <span className="font-semibold text-muted-foreground">📱 Telefone:</span>{' '}
                      {order.customer_phone}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comprovante de Recebimento (se disponível) */}
          {order.receipt_url || order.receipt_image ? (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">🧾 Comprovante de Recebimento</h3>
                {order.receipt_url && (
                  <div className="mb-3">
                    <a
                      href={order.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      Ver comprovante
                    </a>
                  </div>
                )}
                {order.receipt_image && (
                  <div>
                    <img
                      src={order.receipt_image}
                      alt="Comprovante de recebimento"
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {/* Botão para Admin abrir chamado */}
          {isAdmin && orderEmail && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">🎫 Ações Administrativas</h3>
                    <p className="text-sm text-muted-foreground">
                      Abrir um chamado de suporte relacionado a este pedido
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenTicket}
                    className="ml-4"
                  >
                    Abrir Chamado
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>

      {/* Modal de Formulário de Chamado */}
      {showTicketForm && (
        <Dialog open={showTicketForm} onOpenChange={setShowTicketForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <SupportTicketForm
              initialData={{
                name: orderName,
                email: orderEmail,
                phone: order.customer_phone || '',
                orderNumber: order.order_number,
              }}
              onSubmit={handleTicketCreated}
              onClose={handleCloseTicketForm}
            />
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
};

