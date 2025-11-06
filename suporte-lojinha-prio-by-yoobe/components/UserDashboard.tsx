import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Ticket, CubboOrder } from '../types';
import { supportService } from '../services/supportService';
import { Chatbot } from './Chatbot';
import { TicketDetailModal } from './TicketDetailModal';
import { ProfileModal } from './ProfileModal';
import { LogoutIcon, UserIcon } from './Icons';
import { auth } from '../firebase';

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [orders, setOrders] = useState<CubboOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(user);

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
      <div className="min-h-screen bg-base-200">
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="navbar container mx-auto">
            <div className="flex-1">
              <a className="btn btn-ghost text-xl">Suporte Lojinha Prio</a>
            </div>
            <div className="flex-none gap-2">
              <div className="dropdown dropdown-end">
                <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
                  <div className="w-10 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                    <span className="flex items-center justify-center h-full w-full"><UserIcon className="w-6 h-6"/></span>
                  </div>
                </label>
                <ul tabIndex={0} className="mt-3 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                  <li><a onClick={() => setIsProfileModalOpen(true)}>Perfil</a></li>
                  <li><a onClick={onLogout}><LogoutIcon className="w-4 h-4" />Sair</a></li>
                </ul>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Bem-vindo(a), {profileUser.displayName || 'Cliente'}!</h1>
            <p className="text-lg text-gray-600 mt-2">Acompanhe seus pedidos e chamados de suporte.</p>
          </div>
          
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Orders List */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                 <h2 className="text-2xl font-semibold mb-4">Meus Pedidos</h2>
                  {isLoading ? (
                      <div className="text-center p-8">Buscando seus pedidos...</div>
                  ) : orders.length === 0 ? (
                      <div className="text-center p-8 text-gray-500">
                        <p>Nenhum pedido encontrado para este e-mail/telefone.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {orders.map(order => (
                              <div key={order.id} className="border rounded-lg p-4">
                                  <div className="flex justify-between items-start">
                                      <div>
                                          <p className="font-bold">Pedido #{order.order_number}</p>
                                          <p className="text-sm text-gray-500">{(order.items_summary || []).join(', ')}</p>
                                      </div>
                                      <span className="badge badge-outline">{order.status}</span>
                                  </div>
                                  <div className="text-right mt-2">
                                      {order.shipping_information.tracking_url ? (
                                           <a href={order.shipping_information.tracking_url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-primary">Rastrear</a>
                                      ) : (
                                          <span className="text-xs text-gray-400">Rastreio não disponível</span>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Tickets List */}
              <div className="bg-white p-6 rounded-lg shadow-md">
                 <h2 className="text-2xl font-semibold mb-4">Meus Chamados</h2>
                  {isLoading ? (
                      <div className="text-center p-8">Carregando seus chamados...</div>
                  ) : tickets.length === 0 ? (
                      <div className="text-center p-8 text-gray-500">
                        <p>Você ainda não tem nenhum chamado aberto.</p>
                        <p>Use o chat no canto da tela para falar com nosso assistente!</p>
                      </div>
                  ) : (
                      <div className="overflow-x-auto">
                          <table className="table w-full">
                              <thead><tr><th>ID</th><th>Assunto</th><th>Status</th><th>Ações</th></tr></thead>
                              <tbody>
                                  {tickets.map(ticket => (
                                      <tr key={ticket.id} className="hover">
                                          <td>#{ticket.id.substring(0, 6)}</td>
                                          <td>{ticket.subject}</td>
                                          <td><span className={`badge ${getStatusColor(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span></td>
                                          <td>
                                              <button onClick={() => handleViewTicket(ticket)} className="btn btn-xs btn-outline">Ver Detalhes</button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  )}
              </div>
           </div>
        </main>
      </div>

      <Chatbot 
        user={{
            name: profileUser.displayName || '',
            email: profileUser.email || '',
            phone: profileUser.phoneNumber || ''
        }}
        onTicketCreated={loadData}
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