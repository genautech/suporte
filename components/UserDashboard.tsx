import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { Ticket, CubboOrder, NotificationItem } from '../types';
import { supportService } from '../services/supportService';
import { companyService } from '../services/companyService';
import { userService } from '../services/userService';
import { SupportArea, SupportTab } from './SupportArea';
import { TicketDetailModal } from './TicketDetailModal';
import { ProfileModal } from './ProfileModal';
import { Chatbot } from './Chatbot';
import { LogoutIcon, UserIcon } from './Icons';
import { auth } from '../firebase';
import { storeContext } from '../lib/storeContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { DashboardHeader } from './DashboardHeader';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  adminMode?: boolean;
  onSwitchToAdmin?: () => void;
  adminSelectedCompanyId?: string; // CompanyId selecionado pelo admin para visualização
  realClientEmail?: string; // Email real do cliente (quando admin está visualizando)
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout, adminMode = false, onSwitchToAdmin, adminSelectedCompanyId, realClientEmail }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<CubboOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(user);
  const [companyId, setCompanyId] = useState<string>('general');
  const [companyName, setCompanyName] = useState<string>('Suporte Yoobe');
  const [storeUrl, setStoreUrl] = useState<string | null>(null);
  const [detectedCompanyId, setDetectedCompanyId] = useState<string | null>(null);
  const [companyContextResolved, setCompanyContextResolved] = useState(false);
  const [supportTab, setSupportTab] = useState<SupportTab>('chat');

  const loadData = useCallback(async () => {
    // Usar email real se fornecido (modo admin visualizando cliente), senão usar email do user
    const emailToUse = realClientEmail || user?.email;
    const phoneToUse = user?.phoneNumber;
    
    console.log('[UserDashboard] loadData iniciado:', {
      emailToUse,
      phoneToUse,
      realClientEmail,
      userEmail: user?.email,
      timestamp: new Date().toISOString()
    });
    
    if (emailToUse || phoneToUse) {
      setIsLoading(true);
      try {
        console.log('[UserDashboard] Buscando tickets e pedidos...');
        const startTime = Date.now();
        
        const [userTickets, userOrders] = await Promise.all([
          supportService.getTicketsByUser({
            email: emailToUse,
            phone: phoneToUse,
          }),
          supportService.findOrdersByCustomer(
            {
              email: emailToUse,
              phone: phoneToUse
            },
            { limit: 10, companyId: detectedCompanyId || companyId, useCache: true }
          )
        ]);
        
        const duration = Date.now() - startTime;
        console.log('[UserDashboard] Dados carregados:', {
          ticketsCount: userTickets.length,
          ordersCount: userOrders.length,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        if (userOrders.length > 0) {
          console.log('[UserDashboard] Primeiros pedidos:', userOrders.slice(0, 3).map(o => ({
            id: o.id,
            order_number: o.order_number,
            status: o.status,
            total_amount: o.total_amount
          })));
        } else {
          console.warn('[UserDashboard] Nenhum pedido encontrado para:', emailToUse || phoneToUse);
        }
        
        setTickets(userTickets);
        setOrders(userOrders);
      } catch (error: any) {
        console.error('[UserDashboard] Erro ao carregar dados:', {
          error: error?.message || 'Erro desconhecido',
          stack: error?.stack,
          emailToUse,
          phoneToUse,
          timestamp: new Date().toISOString()
        });
        setTickets([]);
        setOrders([]);
      } finally {
        setIsLoading(false);
        console.log('[UserDashboard] loadData finalizado');
      }
    } else {
      console.warn('[UserDashboard] Nenhum email ou telefone disponível para buscar dados');
    }
  }, [user, realClientEmail, companyId, detectedCompanyId]);

  useEffect(() => {
    setProfileUser(user);
    if (!user.email) {
      setIsProfileModalOpen(true);
    }
    loadData();
  }, [user, loadData]);

  useEffect(() => {
    let isMounted = true;
    const resolveCompany = async () => {
      storeContext.detectAndStoreContext();
      setCompanyContextResolved(false);

      if (adminSelectedCompanyId) {
        setCompanyId(adminSelectedCompanyId);
        setDetectedCompanyId(adminSelectedCompanyId);
        if (adminSelectedCompanyId !== 'general') {
          const name = await companyService.getCompanyName(adminSelectedCompanyId);
          if (isMounted) {
            setCompanyName(name);
          }
        } else if (isMounted) {
          setCompanyName('Suporte Yoobe');
        }
        if (isMounted) setCompanyContextResolved(true);
        return;
      }

      const storedCompanyId = storeContext.getStoredCompanyId();
      const storedStoreUrl = storeContext.getStoredStoreUrl();
      let companyIdFromStore = storedCompanyId || null;

      if (!companyIdFromStore && storedStoreUrl) {
        companyIdFromStore = await companyService.getCompanyByStoreUrl(storedStoreUrl);
        if (companyIdFromStore) {
          storeContext.setStoredCompanyId(companyIdFromStore);
        }
      }

      if (companyIdFromStore) {
        setCompanyId(companyIdFromStore);
        setDetectedCompanyId(companyIdFromStore);
        if (companyIdFromStore !== 'general') {
          const name = await companyService.getCompanyName(companyIdFromStore);
          if (isMounted) {
            setCompanyName(name);
          }
        } else if (isMounted) {
          setCompanyName('Suporte Yoobe');
        }
        if (isMounted) setCompanyContextResolved(true);
        return;
      }

      if (user.email) {
        const emailCompanyId = await companyService.getCompanyFromEmail(user.email);
        setCompanyId(emailCompanyId);
        setDetectedCompanyId(emailCompanyId !== 'general' ? emailCompanyId : null);
        if (emailCompanyId && emailCompanyId !== 'general') {
          const name = await companyService.getCompanyName(emailCompanyId);
          if (isMounted) {
            setCompanyName(name);
          }
        } else if (isMounted) {
          setCompanyName('Suporte Yoobe');
        }
        if (isMounted) setCompanyContextResolved(true);
        return;
      }

      setCompanyId('general');
      setDetectedCompanyId(null);
      setCompanyName('Suporte Yoobe');
      if (isMounted) setCompanyContextResolved(true);
    };

    resolveCompany();

    return () => {
      isMounted = false;
    };
  }, [user.email, adminSelectedCompanyId]);

  useEffect(() => {
    if (!user.email || !companyContextResolved) {
      return;
    }

    const nameParts = user.displayName?.split(' ') || [];
    const firstName = nameParts[0]?.trim() || undefined;
    const lastName = nameParts.slice(1).join(' ').trim() || undefined;

    userService.recordLogin(user.email, {
      firstName,
      lastName,
      phone: user.phoneNumber || undefined,
      companyIdOverride: detectedCompanyId || undefined,
    }).catch(error => {
      console.error('[UserDashboard] Erro ao registrar login:', error);
    });
  }, [user, detectedCompanyId, companyContextResolved]);

  useEffect(() => {
    if (!user.email || !companyContextResolved) {
      setStoreUrl(null);
      return;
    }

    userService.getUserStoreUrl(user.email)
      .then((url) => setStoreUrl(url))
      .catch((error) => {
        console.error('[UserDashboard] Erro ao buscar storeUrl:', error);
        setStoreUrl(null);
      });
  }, [user.email, companyContextResolved]);

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const handleProfileUpdate = () => {
      if (auth.currentUser) {
          setProfileUser(auth.currentUser);
      }
      loadData(); // Reload data in case email was added
  };

  const getStatusColor = (status: Ticket['status']) => {
    switch (status) {
      case 'aberto': return 'badge-info';
      case 'em_andamento': return 'badge-warning';
      case 'resolvido': return 'badge-success';
      case 'fechado': return 'badge-ghost';
      default: return '';
    }
  };

  const handleNotificationSelect = useCallback(async (notification: NotificationItem) => {
    if (notification.type === 'ticket') {
      setSupportTab('tickets');
      const existing = tickets.find((ticket) => ticket.id === notification.entityId);
      if (existing) {
        setSelectedTicket(existing);
        setIsDetailModalOpen(true);
        return;
      }
      try {
        const fetched = await supportService.getTicketById(notification.entityId);
        if (fetched) {
          setSelectedTicket(fetched);
          setIsDetailModalOpen(true);
        }
      } catch (error) {
        console.error('[UserDashboard] Erro ao abrir ticket da notificação:', error);
      }
    } else {
      setSupportTab('chat');
      if (typeof document !== 'undefined') {
        document.getElementById('support-chat-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [tickets]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <DashboardHeader
          title={companyName}
          subtitle={
            adminMode
              ? 'Modo admin - visualizando como cliente'
              : 'Central de suporte completo'
          }
          leading={<span className="text-3xl">🛍️</span>}
          onNotificationSelect={handleNotificationSelect}
          showNotifications={!!user.email}
          actions={
            storeUrl ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(storeUrl, '_blank')}
                className="flex items-center gap-2"
              >
                <span>🛍️</span>
                <span className="hidden sm:inline">Voltar para a Loja</span>
                <span className="sm:hidden">Loja</span>
              </Button>
            ) : undefined
          }
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white shadow-lg">
                  <UserIcon className="w-5 h-5" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {adminMode && onSwitchToAdmin && (
                <DropdownMenuItem
                  onClick={onSwitchToAdmin}
                  className="text-primary focus:text-primary"
                >
                  <span className="mr-2">⚡</span>
                  Voltar ao Admin
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                <UserIcon className="w-4 h-4 mr-2" />
                Perfil
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogoutIcon className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DashboardHeader>
      </motion.div>

        <main className="container-standard py-8">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
              Bem-vindo(a), {profileUser.displayName || profileUser.email || 'Cliente'}!
            </h1>
            <p className="text-muted-foreground text-lg">
              {adminMode ? 'Visualização como Cliente' : 'Central de Suporte Completa'}
            </p>
            {adminMode && (
              <div className="mt-3">
                <Badge variant="info" className="text-sm">
                  Modo Admin - Visualizando como Cliente
                </Badge>
              </div>
            )}
          </motion.div>
          
          <SupportArea
            user={user}
            tickets={tickets}
            orders={orders}
            isLoading={isLoading}
            onTicketClick={handleViewTicket}
            onReload={loadData}
            companyId={companyId}
            adminMode={adminMode}
            activeTab={supportTab}
            onTabChange={setSupportTab}
          />
        </main>
      </div>
      
      {selectedTicket && (
        <TicketDetailModal 
            ticket={selectedTicket} 
            isOpen={isDetailModalOpen} 
            onClose={() => setIsDetailModalOpen(false)} 
            userType="user"
            onUpdate={() => { setIsDetailModalOpen(false); loadData(); }}
        />
      )}

      <ProfileModal 
        user={profileUser}
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onUpdate={handleProfileUpdate}
      />
      
      {/* Chat flutuante - sempre disponível */}
      {user.email && user.email.trim() && !adminMode && (
        <Chatbot
          user={{
            name: user.displayName || '',
            email: user.email.trim(),
            phone: user.phoneNumber || ''
          }}
          companyId={companyId}
          onTicketCreated={loadData}
          inline={false}
        />
      )}
    </>
  );
};

export default UserDashboard;