import React, { useState } from 'react';
import { Ticket, CubboOrder } from '../types';
import { TicketDetailModal } from './TicketDetailModal';
import { OrderList } from './OrderList';
import { OrderDetailModal } from './OrderDetailModal';
import { Chatbot } from './Chatbot';
import { FAQArea } from './FAQArea';
import { IntelligentFAQSearch } from './IntelligentFAQSearch';
import { AdminFAQ } from './AdminFAQ';
import { SupportTicketFormAdvanced } from './SupportTicketFormAdvanced';
import { User } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { SupportNoticeBanner } from './SupportNoticeBanner';

export type SupportTab = 'orders' | 'tickets' | 'chat' | 'faq' | 'manage-faq';

interface SupportAreaProps {
  user: User;
  tickets: Ticket[];
  orders: CubboOrder[];
  isLoading: boolean;
  onTicketClick: (ticket: Ticket) => void;
  onReload: () => void;
  companyId?: string; // ID da empresa do usuário
  adminMode?: boolean; // Se true, mostra opções de admin (ex: gerenciar FAQ)
  activeTab?: SupportTab;
  onTabChange?: (tab: SupportTab) => void;
}

export const SupportArea: React.FC<SupportAreaProps> = ({
  user,
  tickets,
  orders,
  isLoading,
  onTicketClick,
  onReload,
  companyId,
  adminMode = false,
  activeTab,
  onTabChange,
}) => {
  const [internalTab, setInternalTab] = useState<SupportTab>('chat');
  const [selectedOrder, setSelectedOrder] = useState<CubboOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isTicketFormOpen, setIsTicketFormOpen] = useState(false);
  const [ticketOrderContext, setTicketOrderContext] = useState<CubboOrder | null>(null);

  const currentTab = activeTab ?? internalTab;

  const handleTabChange = (value: SupportTab) => {
    if (onTabChange) {
      onTabChange(value);
    } else {
      setInternalTab(value);
    }
  };

  const handleOrderClick = (order: CubboOrder) => {
    setSelectedOrder(order);
    setIsOrderModalOpen(true);
  };
  
  const handleOpenTicketWithOrder = (order: CubboOrder) => {
    setTicketOrderContext(order);
    setIsTicketFormOpen(true);
  };

  const handleCloseOrderModal = () => {
    setIsOrderModalOpen(false);
    setSelectedOrder(null);
  };

  const handleTicketCreated = (ticketId: string) => {
    setIsTicketFormOpen(false);
    setTicketOrderContext(null);
    onReload();
    handleTabChange('tickets');
  };

  return (
    <>
    <SupportNoticeBanner
      companyId={companyId}
      location="support"
      withNotificationShortcut
      className="mb-4"
    />
    <Tabs
      value={currentTab}
      onValueChange={(value) => handleTabChange(value as SupportTab)}
      className="space-y-4 md:space-y-6"
    >
      <TabsList className={`flex w-full overflow-x-auto ${adminMode ? 'flex-wrap sm:flex-nowrap' : 'flex-wrap sm:flex-nowrap'} gap-1 md:gap-2 pb-1`}>
        <TabsTrigger value="orders" className="text-xs md:text-sm px-2 md:px-4 py-2 md:py-2.5 min-h-[44px] flex-shrink-0">📦 <span className="hidden sm:inline">Meus </span>Pedidos</TabsTrigger>
        <TabsTrigger value="tickets" className="text-xs md:text-sm px-2 md:px-4 py-2 md:py-2.5 min-h-[44px] flex-shrink-0">🎫 Chamados</TabsTrigger>
        <TabsTrigger value="faq" className="text-xs md:text-sm px-2 md:px-4 py-2 md:py-2.5 min-h-[44px] flex-shrink-0">❓ FAQ</TabsTrigger>
        <TabsTrigger value="chat" className="text-xs md:text-sm px-2 md:px-4 py-2 md:py-2.5 min-h-[44px] flex-shrink-0">💬 <span className="hidden sm:inline">Chat </span>Suporte</TabsTrigger>
        {adminMode && (
          <TabsTrigger value="manage-faq" className="text-xs md:text-sm px-2 md:px-4 py-2 md:py-2.5 min-h-[44px] flex-shrink-0">⚙️ <span className="hidden sm:inline">Gerenciar </span>FAQ</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="orders" className="min-h-[300px] md:min-h-[400px]">
        <div className="space-y-4 md:space-y-6">
          {/* FAQ Highlights - Seção destacada */}
          <Card className="bg-gradient-to-br from-primary/5 via-background to-secondary/5 border-primary/20">
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <span className="text-xl md:text-2xl mr-2">❓</span>
                  <span className="hidden sm:inline">Perguntas </span>Frequentes
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabChange('faq')}
                    className="min-h-[44px] text-sm"
                  >
                    Ver Todas
                  </Button>
                  <Button 
                    onClick={() => setIsTicketFormOpen(true)}
                    size="sm"
                    className="min-h-[44px] text-sm"
                  >
                    Abrir Chamado
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <IntelligentFAQSearch onOpenTicket={() => setIsTicketFormOpen(true)} companyId={companyId} />
            </CardContent>
          </Card>

          {/* Pedidos */}
          <Card>
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <span className="text-xl md:text-2xl mr-2">📦</span>
                Meus Pedidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              {isLoading ? (
                <div className="text-center p-8 md:p-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <p className="mt-4 text-muted-foreground font-medium text-sm md:text-base">Buscando seus pedidos...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center p-8 md:p-12">
                  <div className="text-5xl md:text-7xl mb-4 animate-bounce">📭</div>
                  <p className="text-base md:text-lg font-semibold text-foreground mb-2">
                    Nenhum pedido encontrado
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Seus pedidos aparecerão aqui quando fizer uma compra.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 md:space-y-4">
                  <OrderList orders={orders} onOrderClick={handleOrderClick} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="tickets" className="min-h-[300px] md:min-h-[400px]">
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center text-lg md:text-xl">
              <span className="text-xl md:text-2xl mr-2">🎫</span>
              <span className="hidden sm:inline">Meus </span>Chamados<span className="hidden sm:inline"> de Suporte</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            {isLoading ? (
              <div className="text-center p-8 md:p-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-muted-foreground font-medium text-sm md:text-base">Carregando seus chamados...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center p-8 md:p-12">
                <div className="text-5xl md:text-7xl mb-4">💬</div>
                <p className="text-base md:text-lg font-semibold text-foreground mb-2">
                  Você ainda não tem chamados abertos
                </p>
                <p className="text-xs md:text-sm text-muted-foreground mb-6">
                  Abra um chamado de suporte ou use o chat para ajuda imediata!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => setIsTicketFormOpen(true)}
                    variant="default"
                    className="min-h-[44px] text-sm md:text-base"
                  >
                    Abrir Chamado
                  </Button>
                  <Button
                    onClick={() => handleTabChange('chat')}
                    variant="outline"
                    className="min-h-[44px] text-sm md:text-base"
                  >
                    Ir para Chat
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {tickets.map(ticket => (
                  <Card
                    key={ticket.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onTicketClick(ticket)}
                  >
                    <CardContent className="p-4 md:pt-6">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base md:text-lg text-foreground mb-1 break-words">{ticket.subject}</h3>
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 break-words">
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

      <TabsContent value="faq" className="min-h-[400px] md:min-h-[600px]">
        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <span className="text-xl md:text-2xl mr-2">❓</span>
                  <span className="hidden sm:inline">Perguntas </span>Frequentes
                </CardTitle>
                <Button 
                  onClick={() => setIsTicketFormOpen(true)}
                  className="min-h-[44px] text-sm md:text-base w-full sm:w-auto"
                >
                  Abrir Chamado
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <IntelligentFAQSearch onOpenTicket={() => setIsTicketFormOpen(true)} companyId={companyId} />
            </CardContent>
          </Card>
          
          <FAQArea onOpenTicket={() => setIsTicketFormOpen(true)} companyId={companyId} />
        </div>
      </TabsContent>

      <TabsContent value="chat" className="min-h-[500px] md:min-h-[600px]" id="support-chat-section">
        <Card className="flex flex-col h-full">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <span className="text-xl md:text-2xl mr-2">💬</span>
                Chat de Suporte
              </CardTitle>
              <Button 
                onClick={() => setIsTicketFormOpen(true)}
                className="min-h-[44px] text-sm md:text-base w-full sm:w-auto"
              >
                Abrir Chamado
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0 h-[500px] md:h-[600px]">
            {/* Garantir que email seja válido antes de passar para Chatbot */}
            {user.email && user.email.trim() ? (
              <Chatbot
                user={{
                  name: user.displayName || '',
                  email: user.email.trim(),
                  phone: user.phoneNumber || ''
                }}
                companyId={companyId}
                onTicketCreated={onReload}
                inline={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Por favor, configure seu email no perfil para usar o chat.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {adminMode && (
        <TabsContent value="manage-faq" className="min-h-[400px] md:min-h-[600px]">
          <AdminFAQ companyId={companyId} />
        </TabsContent>
      )}
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
            orderNumber: ticketOrderContext?.order_number || '',
          }}
          orderContext={ticketOrderContext || undefined}
          onSubmit={handleTicketCreated}
          onClose={() => {
            setIsTicketFormOpen(false);
            setTicketOrderContext(null);
          }}
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

