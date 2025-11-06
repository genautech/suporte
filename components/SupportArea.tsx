import React, { useState } from 'react';
import { Ticket, CubboOrder } from '../types';
import { TicketDetailModal } from './TicketDetailModal';
import { OrderList } from './OrderList';
import { OrderDetailModal } from './OrderDetailModal';
import { Chatbot } from './Chatbot';
import { FAQArea } from './FAQArea';
import { IntelligentFAQSearch } from './IntelligentFAQSearch';
import { SupportTicketFormAdvanced } from './SupportTicketFormAdvanced';
import { User } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface SupportAreaProps {
  user: User;
  tickets: Ticket[];
  orders: CubboOrder[];
  isLoading: boolean;
  onTicketClick: (ticket: Ticket) => void;
  onReload: () => void;
}

export const SupportArea: React.FC<SupportAreaProps> = ({
  user,
  tickets,
  orders,
  isLoading,
  onTicketClick,
  onReload
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'tickets' | 'chat' | 'faq'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<CubboOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);

  const handleOrderClick = (order: CubboOrder) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
  };

  const handleTicketCreated = (ticketId: string) => {
    setIsTicketFormOpen(false);
    onReload();
    setActiveTab('tickets');
  };

  return (
    <>
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
        <TabsTrigger value="orders">📦 Meus Pedidos</TabsTrigger>
        <TabsTrigger value="tickets">🎫 Chamados</TabsTrigger>
        <TabsTrigger value="faq">❓ FAQ</TabsTrigger>
        <TabsTrigger value="chat">💬 Chat Suporte</TabsTrigger>
      </TabsList>

      <TabsContent value="orders" className="min-h-[400px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">📦</span>
              Meus Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center p-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-muted-foreground font-medium">Buscando seus pedidos...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center p-12">
                <div className="text-7xl mb-4 animate-bounce">📭</div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Nenhum pedido encontrado
                </p>
                <p className="text-sm text-muted-foreground">
                  Seus pedidos aparecerão aqui quando fizer uma compra.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <OrderList orders={orders} onOrderClick={handleOrderClick} />
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tickets" className="min-h-[400px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">🎫</span>
              Meus Chamados de Suporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center p-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-muted-foreground font-medium">Carregando seus chamados...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center p-12">
                <div className="text-7xl mb-4">💬</div>
                <p className="text-lg font-semibold text-foreground mb-2">
                  Você ainda não tem chamados abertos
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Abra um chamado de suporte ou use o chat para ajuda imediata!
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    onClick={() => setIsTicketFormOpen(true)}
                    variant="default"
                  >
                    Abrir Chamado
                  </Button>
                  <Button
                    onClick={() => setActiveTab('chat')}
                    variant="outline"
                  >
                    Ir para Chat
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map(ticket => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onTicketClick(ticket)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-foreground mb-1">{ticket.subject}</h3>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {ticket.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <Badge 
                            variant={
                              ticket.status === 'aberto' ? 'info' :
                              ticket.status === 'em_andamento' ? 'warning' :
                              ticket.status === 'resolvido' ? 'success' :
                              'outline'
                            }
                          >
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          {ticket.priority && (
                            <Badge 
                              variant={
                                ticket.priority === 'alta' ? 'destructive' :
                                ticket.priority === 'media' ? 'warning' :
                                'secondary'
                              }
                            >
                              {ticket.priority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="faq" className="min-h-[600px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <span className="text-2xl mr-2">❓</span>
                  Perguntas Frequentes
                </CardTitle>
                <Button onClick={() => setIsTicketFormOpen(true)}>
                  Abrir Chamado
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <IntelligentFAQSearch onOpenTicket={() => setIsTicketFormOpen(true)} />
            </CardContent>
          </Card>
          
          <FAQArea onOpenTicket={() => setIsTicketFormOpen(true)} />
        </div>
      </TabsContent>

      <TabsContent value="chat" className="min-h-[600px]">
        <Card className="flex flex-col h-full">
          <CardContent className="flex-1 overflow-hidden p-0 h-[600px]">
            <Chatbot
              user={{
                name: user.displayName || '',
                email: user.email || '',
                phone: user.phoneNumber || ''
              }}
              onTicketCreated={onReload}
              inline={true}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>

    <Dialog open={isTicketFormOpen} onOpenChange={setIsTicketFormOpen}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir Chamado de Suporte</DialogTitle>
        </DialogHeader>
        <SupportTicketFormAdvanced
          initialData={{
            name: user.displayName || '',
            email: user.email || '',
            phone: user.phoneNumber || '',
          }}
          onSubmit={handleTicketCreated}
          onClose={() => setIsTicketFormOpen(false)}
        />
      </DialogContent>
    </Dialog>

    <OrderDetailModal
      order={selectedOrder}
      isOpen={isOrderModalOpen}
      onClose={handleCloseOrderModal}
    />
    </>
  );
};

