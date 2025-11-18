// ManagerDashboard component for company managers
import React, { useState, useEffect, useCallback } from 'react';
import { Ticket, SupportUser, CubboOrder } from '../types';
import { supportService } from '../services/supportService';
import { companyService } from '../services/companyService';
import { conversationService } from '../services/conversationService';
import { userService } from '../services/userService';
import { Conversation, MessageSender } from '../types';
import { LogoutIcon } from './Icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { motion } from 'framer-motion';

// Dynamic component loaders to avoid initialization order issues
const DynamicAdminFAQ: React.FC<{ companyId?: string }> = ({ companyId }) => {
    const [Component, setComponent] = useState<React.ComponentType<{ companyId?: string }> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        import('./AdminFAQ')
            .then(module => {
                setComponent(() => module.AdminFAQ);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('[ManagerDashboard] Erro ao carregar AdminFAQ:', error);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <Card className="p-12 text-center">
                <CardContent>
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-muted-foreground font-medium">Carregando FAQ...</p>
                </CardContent>
            </Card>
        );
    }

    if (!Component) {
        return (
            <Card className="p-12 text-center">
                <CardContent>
                    <p className="text-muted-foreground">Erro ao carregar FAQ.</p>
                </CardContent>
            </Card>
        );
    }

    return <Component companyId={companyId} />;
};

const DynamicAdminKnowledgeBase: React.FC<{ companyId?: string }> = ({ companyId }) => {
    const [Component, setComponent] = useState<React.ComponentType<{ companyId?: string }> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        import('./AdminKnowledgeBase')
            .then(module => {
                setComponent(() => module.AdminKnowledgeBase);
                setIsLoading(false);
            })
            .catch(error => {
                console.error('[ManagerDashboard] Erro ao carregar AdminKnowledgeBase:', error);
                setIsLoading(false);
            });
    }, []);

    if (isLoading) {
        return (
            <Card className="p-12 text-center">
                <CardContent>
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                    <p className="mt-4 text-muted-foreground font-medium">Carregando Base de Conhecimento...</p>
                </CardContent>
            </Card>
        );
    }

    if (!Component) {
        return (
            <Card className="p-12 text-center">
                <CardContent>
                    <p className="text-muted-foreground">Erro ao carregar Base de Conhecimento.</p>
                </CardContent>
            </Card>
        );
    }

    return <Component companyId={companyId} />;
};

type ManagerView = 'tickets' | 'orders' | 'faq' | 'knowledge' | 'interactions' | 'users';

interface ManagerDashboardProps {
    companyId: string;
    onLogout: () => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ companyId, onLogout }) => {
    const [view, setView] = useState<ManagerView>('tickets');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [users, setUsers] = useState<SupportUser[]>([]);
    const [orders, setOrders] = useState<CubboOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [companyName, setCompanyName] = useState<string>('');
    const [companyStats, setCompanyStats] = useState<{
        completedTickets: number;
        totalOrders: number;
        shippedOrders: number;
    } | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    
    useEffect(() => {
        // Carregar nome da empresa
        companyService.getCompanyName(companyId).then((name) => {
            console.log('[ManagerDashboard] Nome da empresa carregado:', name, 'para companyId:', companyId);
            setCompanyName(name);
            
            // Verificar se é Yampi (case-insensitive) e adicionar logs adicionais
            if (name && name.toLowerCase().includes('yampi')) {
                console.log('[ManagerDashboard] Empresa Yampi detectada - companyId:', companyId, 'nome:', name);
            }
        }).catch((error) => {
            console.error('[ManagerDashboard] Erro ao carregar nome da empresa:', error);
        });
        
        // Carregar estatísticas da empresa
        const loadStats = async () => {
            setIsLoadingStats(true);
            try {
                const stats = await supportService.getCompanyStats(companyId);
                setCompanyStats(stats);
            } catch (error) {
                console.error('[ManagerDashboard] Erro ao carregar estatísticas:', error);
            } finally {
                setIsLoadingStats(false);
            }
        };
        loadStats();
    }, [companyId]);
    
    const loadTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('[ManagerDashboard] loadTickets - companyId recebido:', companyId);
            
            // Buscar todos os tickets
            const allTickets = await supportService.getTickets(false);
            console.log('[ManagerDashboard] loadTickets - Total de tickets encontrados:', allTickets.length);
            
            // Buscar usuários da empresa para incluir tickets deles
            const companyUsers = await userService.getUsersByCompany(companyId);
            console.log('[ManagerDashboard] loadTickets - Total de usuários da empresa encontrados:', companyUsers.length);
            console.log('[ManagerDashboard] loadTickets - Detalhes dos usuários:', companyUsers.map(u => ({
                email: u.email,
                assignedCompanyId: u.assignedCompanyId,
                autoDetectedCompanyId: u.autoDetectedCompanyId
            })));
            
            const companyUserEmails = new Set(companyUsers.map(u => u.email.toLowerCase()));
            console.log('[ManagerDashboard] loadTickets - Emails dos usuários da empresa:', Array.from(companyUserEmails));
            
            // Filtrar tickets que:
            // 1. Têm companyId === companyId, OU
            // 2. Têm email que corresponde a um usuário atribuído à empresa
            const companyTickets = allTickets.filter(t => {
                const ticketCompanyId = t.companyId;
                const ticketEmail = t.email?.toLowerCase();
                
                const matchesCompanyId = ticketCompanyId === companyId;
                const matchesUserEmail = ticketEmail && companyUserEmails.has(ticketEmail);
                
                const shouldInclude = matchesCompanyId || matchesUserEmail;
                
                if (shouldInclude) {
                    console.log('[ManagerDashboard] loadTickets - Ticket incluído:', {
                        id: t.id,
                        email: t.email,
                        companyId: t.companyId,
                        orderNumber: t.orderNumber,
                        matchesCompanyId,
                        matchesUserEmail
                    });
                } else {
                    // Log apenas para tickets que não foram incluídos (para debug)
                    if (ticketEmail && !companyUserEmails.has(ticketEmail) && ticketCompanyId !== companyId) {
                        console.log('[ManagerDashboard] loadTickets - Ticket EXCLUÍDO:', {
                            id: t.id,
                            email: t.email,
                            companyId: t.companyId,
                            motivo: 'Email não corresponde a usuário da empresa e companyId não corresponde'
                        });
                    }
                }
                
                return shouldInclude;
            });
            
            console.log('[ManagerDashboard] loadTickets - Total de tickets filtrados:', companyTickets.length);
            setTickets(companyTickets);
        } catch (error) {
            console.error('[ManagerDashboard] Erro ao carregar tickets:', error);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    const loadConversations = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('[ManagerDashboard] loadConversations - companyId recebido:', companyId);
            
            const companyConversations = await conversationService.getConversationsByCompany(companyId);
            console.log('[ManagerDashboard] loadConversations - Total de conversas encontradas:', companyConversations.length);
            console.log('[ManagerDashboard] loadConversations - Detalhes das conversas:', companyConversations.map(c => ({
                id: c.id,
                userId: c.userId,
                companyId: c.companyId,
                assignedCompanyId: c.assignedCompanyId,
                messagesCount: c.messages.length,
                resolved: c.resolved
            })));
            
            setConversations(companyConversations);
        } catch (error) {
            console.error('[ManagerDashboard] Erro ao carregar conversas:', error);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    const loadUsers = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('[ManagerDashboard] loadUsers - companyId recebido:', companyId);
            
            const companyUsers = await userService.getUsersByCompany(companyId);
            console.log('[ManagerDashboard] loadUsers - Total de usuários encontrados:', companyUsers.length);
            console.log('[ManagerDashboard] loadUsers - Detalhes dos usuários:', companyUsers.map(u => ({
                email: u.email,
                firstName: u.firstName,
                lastName: u.lastName,
                assignedCompanyId: u.assignedCompanyId,
                autoDetectedCompanyId: u.autoDetectedCompanyId,
                totalLogins: u.totalLogins,
                totalConversations: u.totalConversations,
                totalTickets: u.totalTickets
            })));
            
            setUsers(companyUsers);
        } catch (error) {
            console.error('[ManagerDashboard] Erro ao carregar usuários:', error);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        if (view === 'tickets') {
            loadTickets();
        } else if (view === 'orders') {
            loadOrders();
        } else if (view === 'interactions') {
            loadConversations();
        } else if (view === 'users') {
            loadUsers();
        }
    }, [view, loadTickets, loadOrders, loadConversations, loadUsers]);

    const formatOrderStatus = (status?: string) => {
        switch ((status || '').toLowerCase()) {
            case 'pending':
                return 'Pendente';
            case 'processing':
                return 'Processando';
            case 'shipped':
                return 'Enviado';
            case 'delivered':
                return 'Entregue';
            case 'cancelled':
                return 'Cancelado';
            case 'refunded':
                return 'Reembolsado';
            default:
                return status || 'Desconhecido';
        }
    };

    const getStatusBadgeVariant = (status?: string) => {
        switch ((status || '').toLowerCase()) {
            case 'delivered':
                return 'success';
            case 'shipped':
                return 'secondary';
            case 'pending':
            case 'processing':
                return 'warning';
            case 'cancelled':
            case 'refunded':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    const formatCurrency = (value?: number, currency: string = 'BRL') => {
        if (value === undefined || value === null) return '-';
        try {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: currency || 'BRL',
                minimumFractionDigits: 2,
            }).format(value);
        } catch {
            return `R$ ${value.toFixed(2)}`;
        }
    };

    const parseDateValue = (value?: string | number | Date | null) => {
        if (value === undefined || value === null) return null;
        const date = value instanceof Date ? value : new Date(value);
        if (isNaN(date.getTime())) return null;
        return date;
    };

    const formatDateOnly = (value?: string | number | Date | null) => {
        const date = parseDateValue(value);
        if (!date) return '-';
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatDateTime = (value?: string | number | Date | null) => {
        const date = parseDateValue(value);
        if (!date) return '-';
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const loadOrders = useCallback(async () => {
        setIsLoading(true);
        try {
            const companyOrders = await supportService.getCompanyOrders(companyId);
            setOrders(companyOrders);
        } catch (error) {
            console.error('[ManagerDashboard] Erro ao carregar pedidos:', error);
        } finally {
            setIsLoading(false);
        }
    }, [companyId]);

    const renderView = () => {
        switch (view) {
            case 'tickets':
                return (
                    <div>
                        {/* Cards de Estatísticas */}
                        {companyStats && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Concluídos</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{companyStats.completedTickets}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Resolvidos e fechados
                                        </p>
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Realizados</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold">{companyStats.totalOrders}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Total de pedidos relacionados
                                        </p>
                                    </CardContent>
                                </Card>
                                
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos Enviados</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-3xl font-bold text-green-600">{companyStats.shippedOrders}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Enviados e entregues
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                        
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Chamados de Suporte</h1>
                                <p className="text-sm text-gray-600">Chamados da empresa {companyName}</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando chamados...</p>
                                </CardContent>
                            </Card>
                        ) : tickets.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground mb-2">Nenhum chamado encontrado para esta empresa.</p>
                                    <p className="text-xs text-muted-foreground">
                                        Verifique se os chamados foram atribuídos corretamente à empresa ou se os usuários relacionados estão atribuídos à empresa.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">
                                        {tickets.length === 1 ? '1 chamado encontrado' : `${tickets.length} chamados encontrados`}
                                    </p>
                                </div>
                                <Card className="overflow-x-auto">
                                    <table className="table-standard">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Assunto</th>
                                                <th>Status</th>
                                                <th>Prioridade</th>
                                                <th>Data</th>
                                                <th>Pedido</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tickets.map(ticket => (
                                                <tr key={ticket.id}>
                                                    <td className="font-medium">
                                                        {ticket.name || 'N/A'}
                                                        <br/>
                                                        <span className="text-xs text-gray-500">{ticket.email}</span>
                                                    </td>
                                                    <td className="font-semibold">{ticket.subject}</td>
                                                    <td>
                                                        <Badge variant="secondary">
                                                            {ticket.status.replace('_', ' ')}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <Badge 
                                                            variant={
                                                                ticket.priority === 'alta' ? 'destructive' :
                                                                ticket.priority === 'media' ? 'warning' :
                                                                'secondary'
                                                            }
                                                        >
                                                            {ticket.priority}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-sm text-gray-600">
                                                        {formatDateOnly(ticket.createdAt)}
                                                    </td>
                                                    <td className="text-sm text-gray-600">
                                                        {ticket.orderNumber || '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            </div>
                        )}
                    </div>
                );
            case 'orders':
                return (
                    <div>
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Pedidos</h1>
                                <p className="text-sm text-gray-600">
                                    Pedidos relacionados à empresa {companyName}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={loadOrders}
                                    disabled={isLoading}
                                >
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">
                                        Carregando pedidos...
                                    </p>
                                </CardContent>
                            </Card>
                        ) : orders.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground mb-2">
                                        Nenhum pedido encontrado para esta empresa.
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Verifique se os usuários associados estão corretos ou tente novamente
                                        após novas vendas.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="overflow-x-auto">
                                <table className="table-standard">
                                    <thead>
                                        <tr>
                                            <th>Pedido</th>
                                            <th>Status</th>
                                            <th>Cliente</th>
                                            <th>Email</th>
                                            <th>Data</th>
                                            <th>Valor</th>
                                            <th>Rastreio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(order => (
                                            <tr key={order.id || order.order_number}>
                                                <td className="font-semibold">
                                                    {order.order_number || order.id || 'Sem número'}
                                                    {order.items_summary && order.items_summary.length > 0 && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            {order.items_summary.join(' • ')}
                                                        </p>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge variant={getStatusBadgeVariant(order.status)}>
                                                        {formatOrderStatus(order.status)}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">
                                                            {order.customer_name || 'Cliente'}
                                                        </span>
                                                        {order.customer_phone && (
                                                            <span className="text-xs text-gray-500">
                                                                {order.customer_phone}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="text-sm text-gray-600">
                                                    {order.customer_email || order.shipping_email || '-'}
                                                </td>
                                                <td className="text-sm text-gray-600">
                                                    {formatDateTime(order.created_at)}
                                                </td>
                                                <td className="text-sm">
                                                    {formatCurrency(order.total_amount, order.currency)}
                                                </td>
                                                <td className="text-sm text-gray-600">
                                                    {order.shipping_information?.tracking_number ? (
                                                        <div className="flex flex-col gap-1">
                                                            <span>{order.shipping_information.tracking_number}</span>
                                                            {order.shipping_information.tracking_url && (
                                                                <a
                                                                    href={order.shipping_information.tracking_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-primary underline text-xs"
                                                                >
                                                                    Acompanhar
                                                                </a>
                                                            )}
                                                            {order.shipping_information.courier && (
                                                                <span className="text-xs text-muted-foreground">
                                                                    {order.shipping_information.courier}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        '-'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </div>
                );
            case 'faq':
                return <DynamicAdminFAQ companyId={companyId} />;
            case 'knowledge':
                return <DynamicAdminKnowledgeBase companyId={companyId} />;
            case 'interactions':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Interações via Chat</h1>
                                <p className="text-sm text-gray-600">Conversas dos clientes da empresa {companyName}</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando interações...</p>
                                </CardContent>
                            </Card>
                        ) : conversations.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground mb-2">Nenhuma interação encontrada para esta empresa.</p>
                                    <p className="text-xs text-muted-foreground">
                                        Verifique se as conversas foram atribuídas corretamente à empresa ou se os usuários relacionados estão atribuídos à empresa.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-muted-foreground">
                                        {conversations.length === 1 ? '1 interação encontrada' : `${conversations.length} interações encontradas`}
                                    </p>
                                </div>
                                <Card className="overflow-x-auto">
                                    <table className="table-standard">
                                        <thead>
                                            <tr>
                                                <th>Cliente</th>
                                                <th>Mensagens</th>
                                                <th>Status</th>
                                                <th>Pedidos</th>
                                                <th>Data</th>
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {conversations.map(conv => (
                                                <tr key={conv.id}>
                                                    <td className="font-medium">{conv.userId}</td>
                                                    <td>{conv.messages.length}</td>
                                                    <td>
                                                        <Badge variant={conv.resolved ? 'success' : 'warning'}>
                                                            {conv.resolved ? 'Resolvida' : 'Aberta'}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-sm text-gray-600">
                                                        {conv.orderNumbers && conv.orderNumbers.length > 0 
                                                            ? conv.orderNumbers.join(', ') 
                                                            : '-'}
                                                    </td>
                                                    <td className="text-sm text-gray-600">
                                                        {formatDateOnly(conv.createdAt)}
                                                    </td>
                                                    <td>
                                                        <Button 
                                                            onClick={() => {
                                                                setSelectedConversation(conv);
                                                                setIsDetailModalOpen(true);
                                                            }} 
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            Ver Detalhes
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </Card>
                            </div>
                        )}
                    </div>
                );
            case 'users':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Usuários da Empresa</h1>
                                <p className="text-sm text-gray-600">Usuários atribuídos à empresa {companyName}</p>
                            </div>
                        </div>

                        {isLoading ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando usuários...</p>
                                </CardContent>
                            </Card>
                        ) : users.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground">Nenhum usuário encontrado para esta empresa.</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="overflow-x-auto">
                                <table className="table-standard">
                                    <thead>
                                        <tr>
                                            <th>Email</th>
                                            <th>Nome</th>
                                            <th>Total Logins</th>
                                            <th>Total Conversas</th>
                                            <th>Total Tickets</th>
                                            <th>Último Acesso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((user) => (
                                            <tr key={user.id || user.email}>
                                                <td className="font-medium">{user.email}</td>
                                                <td>{user.firstName || ''} {user.lastName || ''}</td>
                                                <td>{user.totalLogins || 0}</td>
                                                <td>{user.totalConversations || 0}</td>
                                                <td>{user.totalTickets || 0}</td>
                                                <td className="text-sm text-gray-600">
                                                    {formatDateOnly(user.lastAccessAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
            {/* Sidebar */}
            <motion.aside 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-64 bg-background/80 backdrop-blur-md border-r border-border min-h-screen flex flex-col shadow-lg"
            >
                <div className="p-6 border-b border-border">
                    <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent flex items-center mb-1">
                        <span className="text-2xl mr-2">🏢</span>
                        {companyName}
                    </h2>
                    <p className="text-xs text-muted-foreground">Painel do Gestor</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <motion.a 
                        onClick={() => setView('tickets')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'tickets' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>🎫</span>
                        Chamados
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('orders')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'orders' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>📦</span>
                        Pedidos
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('faq')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'faq' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>❓</span>
                        FAQ
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('knowledge')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'knowledge' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>📚</span>
                        Base de Conhecimento
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('interactions')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'interactions' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>💬</span>
                        Interações
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('users')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'users' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>👥</span>
                        Usuários
                    </motion.a>
                </nav>
                <div className="p-4 border-t border-border">
                    <Button
                        onClick={onLogout}
                        variant="outline"
                        className="w-full"
                    >
                        <LogoutIcon className="w-4 h-4 mr-2" />
                        Sair
                    </Button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {renderView()}
            </main>

            {/* Modal de Detalhes da Conversa */}
            {selectedConversation && isDetailModalOpen && (
                <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
                    <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalhes da Interação</DialogTitle>
                            <DialogDescription>
                                Cliente: {selectedConversation.userId} | 
                                Criada em: {formatDateTime(selectedConversation.createdAt)}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                            {/* Informações da Conversa */}
                            <div className="flex gap-2 flex-wrap">
                                <Badge variant={selectedConversation.resolved ? 'success' : 'warning'}>
                                    {selectedConversation.resolved ? 'Resolvida' : 'Aberta'}
                                </Badge>
                                {selectedConversation.orderNumbers && selectedConversation.orderNumbers.length > 0 && (
                                    <Badge>
                                        Pedidos: {selectedConversation.orderNumbers.join(', ')}
                                    </Badge>
                                )}
                            </div>

                            {/* Mensagens */}
                            <div className="space-y-2">
                                <h3 className="font-semibold">Mensagens ({selectedConversation.messages.length})</h3>
                                <div className="border rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                                    {selectedConversation.messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-3 rounded-lg ${
                                                msg.sender === MessageSender.USER
                                                    ? 'bg-primary/10 ml-8'
                                                    : 'bg-muted mr-8'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold text-sm">
                                                    {msg.sender === MessageSender.USER ? '👤 Cliente' : '🤖 Bot'}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {formatDateTime(msg.timestamp)}
                                                </span>
                                            </div>
                                            <p className="text-sm">{msg.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Insights se disponível */}
                            {selectedConversation.aiInsights && (
                                <div className="border rounded-lg p-4 bg-muted/50">
                                    <h3 className="font-semibold mb-2">Insights do Gemini AI</h3>
                                    <div className="space-y-2 text-sm">
                                        {selectedConversation.aiInsights.sentiment && (
                                            <p><strong>Sentimento:</strong> {selectedConversation.aiInsights.sentiment}</p>
                                        )}
                                        {selectedConversation.aiInsights.problemType && (
                                            <p><strong>Tipo de Problema:</strong> {selectedConversation.aiInsights.problemType}</p>
                                        )}
                                        {selectedConversation.aiInsights.resolution && (
                                            <p><strong>Resolução:</strong> {selectedConversation.aiInsights.resolution}</p>
                                        )}
                                        {selectedConversation.aiInsights.summary && (
                                            <p><strong>Resumo:</strong> {selectedConversation.aiInsights.summary}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default ManagerDashboard;

