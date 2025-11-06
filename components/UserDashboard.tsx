import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from 'firebase/auth';
import { Ticket, CubboOrder } from '../types';
import { supportService } from '../services/supportService';
import { companyService } from '../services/companyService';
import { Chatbot } from './Chatbot';
import { SupportArea } from './SupportArea';
import { TicketDetailModal } from './TicketDetailModal';
import { ProfileModal } from './ProfileModal';
import { LogoutIcon, UserIcon } from './Icons';
import { auth } from '../firebase';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
  adminMode?: boolean;
  onSwitchToAdmin?: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout, adminMode = false, onSwitchToAdmin }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<CubboOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(user);
  const [companyId, setCompanyId] = useState<string>('general');
  const [companyName, setCompanyName] = useState<string>('Suporte Yoobe');

  const loadData = useCallback(async () => {
    if (user?.email || user?.phoneNumber) {
      setIsLoading(true);
      const userTickets = await supportService.getTicketsByUser({
        email: user.email,
        phone: user.phoneNumber,
      });
      const userOrders = await supportService.findOrdersByCustomer({
        email: user.email,
        phone: user.phoneNumber
      });
      setTickets(userTickets);
      setOrders(userOrders);
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user.displayName || !user.email) {
      setIsProfileModalOpen(true);
    }
    loadData();
    
    // Detectar empresa do usuário
    if (user.email) {
      companyService.getCompanyFromEmail(user.email).then((id) => {
        setCompanyId(id);
        if (id && id !== 'general') {
          companyService.getCompanyName(id).then((name) => {
            setCompanyName(name);
          });
        }
      });
    }
  }, [user, loadData]);

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

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-30 shadow-sm"
        >
          <div className="container-standard">
            <div className="flex items-center justify-between py-4">
              <motion.div 
                className="flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <span className="text-3xl">🛍️</span>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {companyName}
                </span>
              </motion.div>
              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white shadow-lg">
                        <UserIcon className="w-5 h-5"/>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {adminMode && onSwitchToAdmin && (
                      <DropdownMenuItem onClick={onSwitchToAdmin} className="text-primary focus:text-primary">
                        <span className="mr-2">⚡</span>
                        Voltar ao Admin
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                      <UserIcon className="w-4 h-4 mr-2" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
                      <LogoutIcon className="w-4 h-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="container-standard py-8">
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">
              Bem-vindo(a), {profileUser.displayName || 'Cliente'}!
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
          />
        </main>
      </div>

      {/* Chatbot flutuante apenas quando não estiver na aba chat */}
      <Chatbot 
        user={{
            name: profileUser.displayName || '',
            email: profileUser.email || '',
            phone: profileUser.phoneNumber || ''
        }}
        companyId={companyId}
        onTicketCreated={loadData}
        inline={false}
      />
      
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
    </>
  );
};

export default UserDashboard;