import React, { useState } from 'react';
import { CubboOrder } from '../types';
import { supportService } from '../services/supportService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { OrderDetailModal } from './OrderDetailModal';

export const AdminOrders: React.FC = () => {
  const [searchType, setSearchType] = useState<'customer' | 'order'>('customer');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [orders, setOrders] = useState<CubboOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CubboOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const handleOrderClick = (order: CubboOrder) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
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
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.warn('[AdminOrders] Erro ao formatar data:', dateString, e);
      return 'Data não disponível';
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { text: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
      'pending': { text: 'Pendente', variant: 'warning' },
      'processing': { text: 'Processando', variant: 'info' },
      'shipped': { text: 'Enviado', variant: 'default' },
      'delivered': { text: 'Entregue', variant: 'success' },
      'cancelled': { text: 'Cancelado', variant: 'destructive' },
      'refunded': { text: 'Reembolsado', variant: 'secondary' }
    };
    
    const statusInfo = statusMap[status.toLowerCase()] || { text: status, variant: 'outline' as const };
    return <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>;
  };

  const handleSearch = async () => {
    setIsLoading(true);
    setError(null);
    setOrders([]);

    try {
      if (searchType === 'customer') {
        if (!email && !phone) {
          setError('Por favor, informe o email ou telefone do cliente.');
          setIsLoading(false);
          return;
        }

        const foundOrders = await supportService.findOrdersByCustomer({
          email: email || null,
          phone: phone || null
        });

        if (foundOrders.length === 0) {
          setError('Nenhum pedido encontrado para este cliente.');
        } else {
          setOrders(foundOrders);
        }
      } else {
        if (!orderId.trim()) {
          setError('Por favor, informe o número ou ID do pedido.');
          setIsLoading(false);
          return;
        }

        // Limpar código do pedido removendo caracteres especiais (#, espaços extras, etc.)
        const cleanOrderId = orderId.trim().replace(/^#+/, '').trim();
        
        if (!cleanOrderId) {
          setError('Por favor, informe um código de pedido válido.');
          setIsLoading(false);
          return;
        }

        // Admin busca pedido diretamente pelo código sem validação de email
        // Usa getOrderDetails que busca apenas pelo ID sem validações extras
        try {
          const order = await supportService.getOrderDetails(cleanOrderId);
          
          if (order) {
            setOrders([order]);
          } else {
            setError(`Pedido "${cleanOrderId}" não encontrado. Verifique se o código do pedido está correto e se o Store ID está configurado corretamente.`);
          }
        } catch (orderError: any) {
          console.error('[AdminOrders] Erro ao buscar pedido:', orderError);
          setError(`Erro ao buscar pedido: ${orderError.message || 'Erro desconhecido'}`);
        }
      }
    } catch (err: any) {
      console.error('Error searching orders:', err);
      const errorMessage = err.message || String(err);
      
      // Mensagens de erro mais específicas
      if (errorMessage.includes('CORS') || errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        setError('Erro de conexão: Não foi possível conectar à API da Cubbo. Isso pode ser um problema de CORS. Verifique se a API está configurada corretamente ou se é necessário usar um proxy.');
      } else if (errorMessage.includes('Erro de Autenticação') || errorMessage.includes('token')) {
        setError('Erro de autenticação: Não foi possível autenticar com a API da Cubbo. Verifique as credenciais no painel de configuração.');
      } else if (errorMessage.includes('Erro de Configuração')) {
        setError('A API de pedidos não está configurada. Configure a URL da API Cubbo no painel de administração.');
      } else {
        setError(errorMessage || 'Erro ao buscar pedidos. Verifique a conexão com a API Cubbo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setEmail('');
    setPhone('');
    setOrderId('');
    setOrders([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">Buscar Pedidos Cubbo</h2>
          <p className="text-sm text-muted-foreground">Pesquise pedidos por cliente ou código</p>
        </div>
      </div>

      {/* Formulário de Busca */}
      <Card>
        <CardHeader>
          <Tabs value={searchType} onValueChange={(v) => {
            const newType = v as 'customer' | 'order';
            setSearchType(newType);
            if (newType === 'customer') {
              setOrderId('');
            } else {
              setEmail('');
              setPhone('');
            }
            setOrders([]);
            setError(null);
          }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customer">Buscar por Cliente</TabsTrigger>
              <TabsTrigger value="order">Buscar por Pedido</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {searchType === 'customer' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Cliente</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="cliente@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-muted-foreground">OU</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone do Cliente</Label>
                <Input
                  id="phone"
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="orderId">Número ou ID do Pedido</Label>
              <Input
                id="orderId"
                type="text"
                placeholder="LP-12345 ou ID do pedido"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-md">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <Button 
              variant="outline"
              onClick={handleClear} 
              disabled={isLoading}
            >
              Limpar
            </Button>
            <Button 
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner loading-sm mr-2"></span>
                  Buscando...
                </>
              ) : (
                'Buscar'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      {orders.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">
              {orders.length === 1 ? '1 pedido encontrado' : `${orders.length} pedidos encontrados`}
            </h3>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="shadow-lg cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleOrderClick(order)}
              >
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">📦 Pedido {order.order_number}</h3>
                      <p className="text-sm text-muted-foreground">ID: {order.id}</p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-semibold mb-1">📅 Data do Pedido</p>
                      <p className="text-sm">{formatDate(order.created_at)}</p>
                    </div>

                    {order.updated_at && (
                      <div>
                        <p className="text-sm font-semibold mb-1">🔄 Última Atualização</p>
                        <p className="text-sm">{formatDate(order.updated_at)}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm font-semibold mb-1">📊 Status</p>
                      <p className="text-sm">{order.status}</p>
                    </div>

                    {order.total_amount !== undefined && (
                      <div>
                        <p className="text-sm font-semibold mb-1">💰 Valor Total</p>
                        <p className="text-sm font-bold">
                          {order.currency === 'BRL' ? 'R$' : order.currency || 'R$'} {order.total_amount !== undefined ? (typeof order.total_amount === 'number' ? order.total_amount : parseFloat(order.total_amount || '0')).toFixed(2) : '0.00'}
                        </p>
                      </div>
                    )}

                    {order.payment_method && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-semibold mb-1">💳 Método de Pagamento</p>
                        <p className="text-sm">{order.payment_method}</p>
                      </div>
                    )}

                    {/* Produtos detalhados */}
                    {order.items && order.items.length > 0 ? (
                      <div className="md:col-span-2 border-t pt-4">
                        <p className="text-sm font-semibold mb-2">🛍️ Produtos Detalhados</p>
                        <div className="overflow-x-auto">
                          <table className="table table-xs">
                            <thead>
                              <tr>
                                <th>SKU</th>
                                <th>Nome</th>
                                <th>Quantidade</th>
                                <th>Preço Unit.</th>
                                <th>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {order.items.map((item, index) => (
                                <tr key={index}>
                                  <td className="font-mono text-xs">{item.sku}</td>
                                  <td>{item.name || '-'}</td>
                                  <td>{item.quantity}</td>
                                  <td>{item.price !== undefined ? `R$ ${(typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')).toFixed(2)}` : '-'}</td>
                                  <td>{item.total !== undefined ? `R$ ${(typeof item.total === 'number' ? item.total : parseFloat(item.total || '0')).toFixed(2)}` : item.price !== undefined ? `R$ ${((typeof item.price === 'number' ? item.price : parseFloat(item.price || '0')) * item.quantity).toFixed(2)}` : '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : order.items_summary && order.items_summary.length > 0 && (
                      <div className="md:col-span-2">
                        <p className="text-sm font-semibold mb-1">🛍️ Produtos</p>
                        <ul className="list-disc list-inside text-sm">
                          {order.items_summary.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Local de coleta ou endereço de entrega */}
                    {order.pickup_location ? (
                      <div className="md:col-span-2 border-t pt-4 bg-blue-50 p-3 rounded">
                        <p className="text-sm font-semibold mb-2">📍 Local de Coleta (Click and Collect)</p>
                        <p className="text-sm font-semibold">{order.pickup_location.service_name}</p>
                        <p className="text-sm">{order.pickup_location.description || order.pickup_location.source}</p>
                        {order.pickup_location.distance && (
                          <p className="text-xs text-gray-600 mt-1">Distância: {order.pickup_location.distance}</p>
                        )}
                        {order.pickup_location.service_code && (
                          <p className="text-xs text-gray-600 mt-1">Código: {order.pickup_location.service_code}</p>
                        )}
                      </div>
                    ) : order.shipping_address && (
                      <div className="md:col-span-2 border-t pt-4 bg-gray-50 p-3 rounded">
                        <p className="text-sm font-semibold mb-2">🏠 Endereço de Entrega</p>
                        <div className="text-sm space-y-1">
                          {order.shipping_address.street && (
                            <p>
                              {order.shipping_address.street}
                              {order.shipping_address.street_number && `, ${order.shipping_address.street_number}`}
                            </p>
                          )}
                          {order.shipping_address.neighborhood && (
                            <p>{order.shipping_address.neighborhood}</p>
                          )}
                          {(order.shipping_address.city || order.shipping_address.state) && (
                            <p>{[order.shipping_address.city, order.shipping_address.state].filter(Boolean).join(' - ')}</p>
                          )}
                          {order.shipping_address.zip_code && (
                            <p>CEP: {order.shipping_address.zip_code}</p>
                          )}
                          {order.shipping_address.country && (
                            <p>{order.shipping_address.country}</p>
                          )}
                          {order.shipping_address.complement && (
                            <p className="text-xs text-gray-600">Complemento: {order.shipping_address.complement}</p>
                          )}
                          {order.shipping_address.reference && (
                            <p className="text-xs text-gray-600">Referência: {order.shipping_address.reference}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Endereço de cobrança (se diferente) */}
                    {order.billing_address && order.billing_address !== order.shipping_address && (
                      <div className="md:col-span-2 border-t pt-4 bg-yellow-50 p-3 rounded">
                        <p className="text-sm font-semibold mb-2">🧾 Endereço de Cobrança</p>
                        <div className="text-sm space-y-1">
                          {order.billing_address.street && (
                            <p>
                              {order.billing_address.street}
                              {order.billing_address.street_number && `, ${order.billing_address.street_number}`}
                            </p>
                          )}
                          {order.billing_address.neighborhood && (
                            <p>{order.billing_address.neighborhood}</p>
                          )}
                          {(order.billing_address.city || order.billing_address.state) && (
                            <p>{[order.billing_address.city, order.billing_address.state].filter(Boolean).join(' - ')}</p>
                          )}
                          {order.billing_address.zip_code && (
                            <p>CEP: {order.billing_address.zip_code}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {order.shipping_information && (
                      <div className="md:col-span-2 border-t pt-4">
                        <p className="text-sm font-semibold mb-2">🚚 Informações de Envio</p>
                        
                        {order.shipping_information.tracking_url && (
                          <div className="mb-2">
                            <p className="text-sm font-semibold">📍 Link de Rastreio:</p>
                            <a
                              href={order.shipping_information.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link link-primary text-sm break-all"
                            >
                              {order.shipping_information.tracking_url}
                            </a>
                          </div>
                        )}

                        {order.shipping_information.tracking_number && (
                          <div className="mb-2">
                            <p className="text-sm font-semibold">📋 Código de Rastreio:</p>
                            <p className="text-sm font-mono">{order.shipping_information.tracking_number}</p>
                          </div>
                        )}

                        {order.shipping_information.courier && (
                          <div className="mb-2">
                            <p className="text-sm font-semibold">🚚 Transportadora:</p>
                            <p className="text-sm">{order.shipping_information.courier}</p>
                          </div>
                        )}

                        {order.shipping_information.estimated_time_arrival && (
                          <div>
                            <p className="text-sm font-semibold">⏱️ Tempo Estimado de Entrega:</p>
                            <p className="text-sm">{order.shipping_information.estimated_time_arrival}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Informações adicionais do cliente */}
                    {(order.customer_email || order.shipping_email || order.customer_phone) && (
                      <div className="md:col-span-2 border-t pt-4">
                        <p className="text-sm font-semibold mb-2">👤 Informações do Cliente</p>
                        {order.customer_email && (
                          <p className="text-sm">📧 Email: {order.customer_email}</p>
                        )}
                        {order.shipping_email && order.shipping_email !== order.customer_email && (
                          <p className="text-sm">📧 Email de Entrega: {order.shipping_email}</p>
                        )}
                        {order.customer_phone && (
                          <p className="text-sm">📱 Telefone: {order.customer_phone}</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <OrderDetailModal
        order={selectedOrder}
        isOpen={isOrderModalOpen}
        onClose={handleCloseOrderModal}
        isAdmin={true}
        onTicketCreated={() => {
          // Chamado criado com sucesso - será redirecionado para a área de chamados
          console.log('Chamado criado com sucesso!');
          // Opcional: mostrar notificação ou mensagem de sucesso
        }}
      />
    </div>
  );
};

