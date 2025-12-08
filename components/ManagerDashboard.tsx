// ManagerDashboard component for company managers
import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
import {
    Ticket,
    CubboOrder,
    NotificationItem,
    ManagerProfile,
    ManagerNotificationPreferences,
    ManagerNotificationChannel,
    ManagerEscalation,
    ManagerEscalationStatus,
} from '../types';
import { supportService } from '../services/supportService';
import { companyService } from '../services/companyService';
import { userService } from '../services/userService';
import { managerProfileService } from '../services/managerProfileService';
import { managerEscalationService } from '../services/managerEscalationService';
import { LogoutIcon } from './Icons';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from './ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { motion } from 'framer-motion';
import { DashboardHeader } from './DashboardHeader';
import { cn } from '../lib/utils';
import { useToast } from './ui/use-toast';
import { OrderCelebration } from './OrderCelebration';
import { deriveAllowedDomains, emailMatchesAllowedDomains } from '../services/domainUtils';
import { OrderDetailModal } from './OrderDetailModal';

// Lazy load components only when needed - using factory functions to avoid hoisting issues
const LazyAdminFAQ = lazy(() => 
    import('./AdminFAQ').then(module => ({ default: module.AdminFAQ }))
);

const LazyAdminKnowledgeBase = lazy(() => 
    import('./AdminKnowledgeBase').then(module => ({ default: module.AdminKnowledgeBase }))
);

type ManagerView = 'dashboard' | 'profile' | 'tickets' | 'orders' | 'escalations' | 'faq' | 'knowledge';
const ORDERS_PAGE_SIZE = 10;

interface ManagerDashboardProps {
    companyId: string;
    onLogout: () => void;
}

// Internal Error Boundary for ManagerDashboard
class ManagerDashboardErrorBoundary extends React.Component<
    { children: React.ReactNode; companyId: string },
    { hasError: boolean; error?: Error }
> {
    constructor(props: { children: React.ReactNode; companyId: string }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('[ManagerDashboard] Erro capturado:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            companyId: this.props.companyId,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        });
        
        // Tentar enviar erro para um serviço de logging se disponível
        if (typeof window !== 'undefined' && (window as any).gtag) {
            try {
                (window as any).gtag('event', 'exception', {
                    description: `ManagerDashboard Error: ${error.message}`,
                    fatal: false
                });
            } catch (e) {
                // Ignorar erros de gtag
            }
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <Card className="p-12 text-center m-4">
                    <CardContent>
                        <h2 className="text-xl font-bold mb-4">Erro ao carregar painel do gestor</h2>
                        <p className="text-muted-foreground mb-4">
                            {this.state.error?.message || 'Ocorreu um erro inesperado.'}
                        </p>
                        <Button onClick={() => window.location.reload()}>
                            Recarregar Página
                        </Button>
                    </CardContent>
                </Card>
            );
        }

        return this.props.children;
    }
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ companyId, onLogout }) => {
    const [view, setView] = useState<ManagerView>('dashboard');
    const { toast } = useToast();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [orders, setOrders] = useState<CubboOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [companyName, setCompanyName] = useState<string>('');
    const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
    const [companyStats, setCompanyStats] = useState<{
        completedTickets: number;
        totalOrders: number;
        shippedOrders: number;
    } | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [pendingTicketFocus, setPendingTicketFocus] = useState<string | null>(null);
    const [orderFilters, setOrderFilters] = useState<{ status: string; search: string }>({
        status: 'all',
        search: '',
    });
    const [orderSearchInput, setOrderSearchInput] = useState(orderFilters.search);
    const orderSearchDebounce = useRef<number | null>(null);
    const [ordersPage, setOrdersPage] = useState<number>(1);
    const [ordersTotal, setOrdersTotal] = useState<number>(0);
    const [managerProfile, setManagerProfile] = useState<ManagerProfile | null>(null);
    const [profileForm, setProfileForm] = useState<{
        name: string;
        email: string;
        timezone?: string;
        notificationPreferences: ManagerNotificationPreferences;
    } | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState<boolean>(true);
    const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
    const [profileFeedback, setProfileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [escalations, setEscalations] = useState<ManagerEscalation[]>([]);
    const [escalationsFilters, setEscalationsFilters] = useState<{ status: ManagerEscalationStatus | 'todos'; search: string }>({
        status: 'todos',
        search: '',
    });
    const [isLoadingEscalations, setIsLoadingEscalations] = useState<boolean>(false);
    const [escalationsError, setEscalationsError] = useState<string | null>(null);
    const [isEscalationModalOpen, setIsEscalationModalOpen] = useState(false);
    const [selectedOrderForEscalation, setSelectedOrderForEscalation] = useState<CubboOrder | null>(null);
    const [escalationMessage, setEscalationMessage] = useState('');
    const [isSubmittingEscalation, setIsSubmittingEscalation] = useState(false);
    const [escalationFeedback, setEscalationFeedback] = useState<string | null>(null);
    const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<CubboOrder | null>(null);
    
    useEffect(() => {
        let isMounted = true;
        console.log('[ManagerDashboard] useEffect disparado - view:', view, 'companyId:', companyId);

        const loadCompanyMetadata = async () => {
            try {
                const company = await companyService.getCompany(companyId);
                if (!isMounted) {
                    return;
                }

                const name = company?.name || 'Suporte Yoobe';
                setCompanyName(name);

                if (name.toLowerCase().includes('yampi')) {
                    console.log('[ManagerDashboard] Empresa Yampi detectada - companyId:', companyId, 'nome:', name);
                }

                const derivedDomains = deriveAllowedDomains(company);
                setAllowedDomains(derivedDomains);
                console.log('[ManagerDashboard] Domínios permitidos definidos:', derivedDomains);
            } catch (error) {
                console.error('[ManagerDashboard] Erro ao carregar dados da empresa:', error);
                if (!isMounted) {
                    return;
                }
                setCompanyName('Suporte Yoobe');
                const fallbackDomains = deriveAllowedDomains(null);
                setAllowedDomains(fallbackDomains);
            }
        };

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

        loadCompanyMetadata();
        loadStats();

        return () => {
            isMounted = false;
        };
    }, [companyId]);

    useEffect(() => {
        let isMounted = true;
        setIsProfileLoading(true);
        managerProfileService
            .getProfile(companyId)
            .then((profile) => {
                if (!isMounted) return;
                setManagerProfile(profile);
                setProfileForm({
                    name: profile.name,
                    email: profile.email,
                    timezone: profile.timezone,
                    notificationPreferences: {
                        ...profile.notificationPreferences,
                        channels: [...profile.notificationPreferences.channels],
                    },
                });
            })
            .catch((error) => {
                console.error('[ManagerDashboard] Erro ao carregar perfil do gestor:', error);
            })
            .finally(() => {
                if (isMounted) {
                    setIsProfileLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [companyId]);

    useEffect(() => {
        return () => {
            if (orderSearchDebounce.current) {
                window.clearTimeout(orderSearchDebounce.current);
            }
        };
    }, []);
    
    const loadTickets = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log('[ManagerDashboard] loadTickets - companyId recebido:', companyId);
            
            // Buscar todos os tickets
            const allTickets = await supportService.getTickets(false, { companyId });
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

    const formatEscalationStatus = (status: ManagerEscalationStatus) => {
        switch (status) {
            case 'aberto':
                return 'Em análise';
            case 'em_andamento':
                return 'Em andamento';
            case 'resolvido':
                return 'Resolvido';
            case 'cancelado':
                return 'Cancelado';
            default:
                return status;
        }
    };

    const getEscalationBadgeVariant = (status: ManagerEscalationStatus) => {
        switch (status) {
            case 'resolvido':
                return 'success';
            case 'em_andamento':
                return 'secondary';
            case 'cancelado':
                return 'destructive';
            default:
                return 'warning';
        }
    };

    const updateProfileField = (field: 'name' | 'email' | 'timezone', value: string) => {
        setProfileForm((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                [field]: value,
            };
        });
    };

    const togglePreference = (key: 'newOrders' | 'escalations' | 'celebrationFeed') => {
        setProfileForm((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                notificationPreferences: {
                    ...prev.notificationPreferences,
                    [key]: !prev.notificationPreferences[key],
                },
            };
        });
    };

    const toggleChannel = (channel: ManagerNotificationChannel) => {
        setProfileForm((prev) => {
            if (!prev) return prev;
            const currentChannels = prev.notificationPreferences.channels || [];
            const hasChannel = currentChannels.includes(channel);
            return {
                ...prev,
                notificationPreferences: {
                    ...prev.notificationPreferences,
                    channels: hasChannel
                        ? currentChannels.filter((c) => c !== channel)
                        : [...currentChannels, channel],
                },
            };
        });
    };

    const handleOrderStatusChange = (value: string) => {
        setOrdersPage(1);
        setOrderFilters((prev) => ({
            ...prev,
            status: value,
        }));
    };

    const handleOrderSearchInput = (value: string) => {
        setOrderSearchInput(value);
        if (orderSearchDebounce.current) {
            window.clearTimeout(orderSearchDebounce.current);
        }
        orderSearchDebounce.current = window.setTimeout(() => {
            setOrdersPage(1);
            setOrderFilters((prev) => ({
                ...prev,
                search: value.trim(),
            }));
        }, 500);
    };

    const clearOrderFilters = () => {
        if (orderSearchDebounce.current) {
            window.clearTimeout(orderSearchDebounce.current);
        }
        setOrderSearchInput('');
        setOrderFilters({ status: 'all', search: '' });
        setOrdersPage(1);
    };

    const openEscalationModal = (order: CubboOrder) => {
        setSelectedOrderForEscalation(order);
        setEscalationMessage('');
        setEscalationFeedback(null);
        setIsEscalationModalOpen(true);
    };

    const closeEscalationModal = () => {
        setIsEscalationModalOpen(false);
        setEscalationMessage('');
        setEscalationFeedback(null);
        setSelectedOrderForEscalation(null);
    };

    const openOrderDetailModal = useCallback((order: CubboOrder) => {
        setSelectedOrderDetail(order);
        setIsOrderDetailOpen(true);
    }, []);

    const closeOrderDetailModal = useCallback(() => {
        setIsOrderDetailOpen(false);
        setSelectedOrderDetail(null);
    }, []);

    const handleEscalationSubmit = async () => {
        if (!selectedOrderForEscalation) return;
        if (!managerProfile?.email) {
            setEscalationFeedback('Atualize o email no perfil do gestor antes de abrir um chamado.');
            return;
        }
        if (!escalationMessage.trim()) {
            setEscalationFeedback('Descreva rapidamente o motivo da solicitação.');
            return;
        }

        setIsSubmittingEscalation(true);
        setEscalationFeedback(null);
        try {
            await managerEscalationService.createEscalation({
                companyId,
                orderNumber: selectedOrderForEscalation.order_number || selectedOrderForEscalation.id || 'pedido',
                orderId: selectedOrderForEscalation.id,
                description: escalationMessage.trim(),
                managerEmail: managerProfile.email,
                managerName: managerProfile.name || 'Gestor',
                subject: `Gestor • Pedido ${selectedOrderForEscalation.order_number || selectedOrderForEscalation.id}`,
            });
            toast({
                title: 'Chamado enviado com prioridade',
                description: 'Nossa equipe já recebeu sua solicitação.',
            });
            closeEscalationModal();
            loadEscalations();
        } catch (error) {
            console.error('[ManagerDashboard] Erro ao criar chamado do gestor:', error);
            setEscalationFeedback('Não foi possível abrir o chamado. Tente novamente em instantes.');
        } finally {
            setIsSubmittingEscalation(false);
        }
    };

    const loadOrders = useCallback(async () => {
        console.log('[ManagerDashboard] loadOrders iniciado - companyId:', companyId, 'filters:', orderFilters, 'page:', ordersPage);
        setIsLoading(true);
        setOrdersError(null);
        try {
            const startTime = Date.now();
            const domainFilter = allowedDomains.length > 0 ? allowedDomains : undefined;
            const response = await supportService.getCompanyOrders(companyId, {
                status: orderFilters.status === 'all' ? undefined : orderFilters.status,
                search: orderFilters.search || undefined,
                page: ordersPage,
                pageSize: ORDERS_PAGE_SIZE,
                allowedCustomerDomains: domainFilter,
            });
            const duration = Date.now() - startTime;
            console.log('[ManagerDashboard] getCompanyOrders concluído:', {
                ordersCount: response.items.length,
                total: response.total,
                duration: `${duration}ms`,
                companyId,
                timestamp: new Date().toISOString(),
                allowedDomains: domainFilter,
            });

            if (domainFilter && domainFilter.length > 0) {
                const invalidOrders = response.items.filter(order =>
                    !emailMatchesAllowedDomains(
                        order.customer_email || order.shipping_email,
                        domainFilter
                    )
                );
                if (invalidOrders.length > 0) {
                    console.warn('[ManagerDashboard] Pedidos descartados por domínio inválido após resposta do serviço', {
                        invalidCount: invalidOrders.length,
                        allowedDomains: domainFilter,
                        sample: invalidOrders.slice(0, 3).map(order => ({
                            orderId: order.id,
                            customerEmail: order.customer_email,
                            shippingEmail: order.shipping_email,
                        })),
                    });
                }
            }
            
            setOrders(response.items);
            setOrdersTotal(response.total);
            setOrdersError(null);
        } catch (error: any) {
            const errorMessage = error?.message || 'Erro desconhecido ao carregar pedidos';
            console.error('[ManagerDashboard] Erro ao carregar pedidos:', {
                error: errorMessage,
                stack: error?.stack,
                companyId,
                timestamp: new Date().toISOString()
            });
            setOrders([]);
            setOrdersTotal(0);
            setOrdersError(errorMessage);
        } finally {
            setIsLoading(false);
            console.log('[ManagerDashboard] loadOrders finalizado');
        }
    }, [companyId, orderFilters, ordersPage, allowedDomains]);

    const loadEscalations = useCallback(async () => {
        setIsLoadingEscalations(true);
        setEscalationsError(null);
        try {
            const { items } = await managerEscalationService.listEscalations({
                companyId,
                status: escalationsFilters.status,
                search: escalationsFilters.search.trim() || undefined,
            });
            setEscalations(items);
        } catch (error: any) {
            console.error('[ManagerDashboard] Erro ao carregar chamados do gestor:', error);
            setEscalationsError(error?.message || 'Não foi possível carregar os chamados agora.');
        } finally {
            setIsLoadingEscalations(false);
        }
    }, [companyId, escalationsFilters]);

    const handleProfileSave = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!profileForm) return;
        setIsSavingProfile(true);
        setProfileFeedback(null);
        try {
            const updateResult = await managerProfileService.upsertProfile(companyId, {
                name: profileForm.name.trim(),
                email: profileForm.email.trim(),
                timezone: profileForm.timezone?.trim() || undefined,
                notificationPreferences: profileForm.notificationPreferences,
            });
            setProfileFeedback({
                type: 'success',
                message: updateResult.emailChanged
                    ? 'Perfil atualizado. Use o novo email para entrar novamente.'
                    : 'Perfil atualizado com sucesso.',
            });
            setManagerProfile((prev) => ({
                id: prev?.id || companyId,
                companyId,
                name: profileForm.name.trim(),
                email: updateResult.currentEmail,
                notificationPreferences: {
                    ...profileForm.notificationPreferences,
                    channels: [...profileForm.notificationPreferences.channels],
                },
                createdAt: prev?.createdAt || Date.now(),
                updatedAt: Date.now(),
                timezone: profileForm.timezone?.trim() || undefined,
                lastCelebrationSeenAt: prev?.lastCelebrationSeenAt,
            }));
            if (updateResult.emailChanged) {
                toast({
                    title: 'Email atualizado',
                    description: 'Sua sessão atual pode perder acesso. Entre novamente usando o novo email.',
                });
            }
        } catch (error) {
            console.error('[ManagerDashboard] Erro ao salvar perfil do gestor:', error);
            setProfileFeedback({
                type: 'error',
                message: 'Não foi possível atualizar o perfil. Tente novamente em instantes.',
            });
        } finally {
            setIsSavingProfile(false);
        }
    };

    useEffect(() => {
        if (view === 'tickets') {
            loadTickets();
        } else if (view === 'orders') {
            loadOrders();
        } else if (view === 'escalations') {
            loadEscalations();
        } else if (view === 'dashboard') {
            loadTickets();
            loadOrders();
            loadEscalations();
        }
    }, [view, loadTickets, loadOrders, loadEscalations]);

    const renderView = () => {
        switch (view) {
            case 'dashboard': {
                const latestOrder = orders[0];
                const totalOrdersCount = ordersTotal || companyStats?.totalOrders || orders.length;
                const resolvedTickets = companyStats?.completedTickets ?? 0;
                const openTickets = tickets.filter(ticket => ticket.status !== 'fechado' && ticket.status !== 'resolvido').length;
                const escalationsOpen = escalations.filter(escalation => escalation.status === 'aberto' || escalation.status === 'em_andamento').length;
                const latestOrders = orders.slice(0, 5);
                const showCelebrationWidget = orders.length > 0;

                if (isLoading && orders.length === 0 && tickets.length === 0 && escalations.length === 0) {
                    return (
                        <Card className="p-10 text-center">
                            <CardContent>
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="mt-4 text-muted-foreground font-medium">Preparando seu dashboard...</p>
                            </CardContent>
                        </Card>
                    );
                }

                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-gray-900">Dashboard do Gestor</h1>
                            <p className="text-sm text-muted-foreground">
                                Acompanhe os pedidos mais recentes, chamados em andamento e celebrações da sua loja.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">Pedidos monitorados</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{totalOrdersCount}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Últimas sincronizações Cubbo
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">Chamados ativos</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{openTickets}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {resolvedTickets} já resolvidos
                                    </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm text-muted-foreground">Escalações prioritárias</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{escalationsOpen}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Em acompanhamento pelo suporte
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        {showCelebrationWidget && <OrderCelebration orders={orders.slice(0, 3)} />}

                        <Card>
                            <CardHeader>
                                <CardTitle>Últimos pedidos</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {latestOrders.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                        Ainda não temos pedidos recentes para exibir. Assim que novos pedidos chegarem, você verá um resumo aqui.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {latestOrders.map((order) => (
                                            <div key={order.id || order.order_number} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border border-border/60 p-3">
                                                <div>
                                                    <p className="font-semibold text-sm">
                                                        {order.order_number || order.id}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.customer_name || 'Cliente'} • {formatDateTime(order.created_at)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                    <Badge variant={getStatusBadgeVariant(order.status)}>
                                                        {formatOrderStatus(order.status)}
                                                    </Badge>
                                                    <Button size="sm" variant="outline" onClick={() => setView('orders')}>
                                                        Ver detalhes
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="default" onClick={() => setView('orders')}>
                                Ir para pedidos
                            </Button>
                            <Button variant="outline" onClick={() => setView('escalations')}>
                                Chamados do gestor
                            </Button>
                            <Button variant="ghost" onClick={() => setView('tickets')}>
                                Chamados de suporte
                            </Button>
                        </div>
                    </div>
                );
            }
            case 'profile':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-1">
                            <h1 className="text-2xl font-bold text-gray-900">Perfil do Gestor</h1>
                            <p className="text-sm text-muted-foreground">
                                Gerencie seus dados de contato e como deseja ser notificado.
                            </p>
                            {managerProfile && (
                                <span className="text-xs text-muted-foreground">
                                    Última atualização em {formatDateTime(managerProfile.updatedAt)}
                                </span>
                            )}
                        </div>
                        <Card>
                            <CardContent className="pt-6">
                                {isProfileLoading ? (
                                    <div className="space-y-4">
                                        <div className="h-12 rounded-lg bg-muted animate-pulse" />
                                        <div className="h-32 rounded-lg bg-muted animate-pulse" />
                                        <div className="h-10 w-40 rounded-full bg-muted animate-pulse" />
                                    </div>
                                ) : !profileForm ? (
                                    <div className="text-center text-sm text-muted-foreground">
                                        Não foi possível carregar o perfil do gestor.
                                    </div>
                                ) : (
                                    <form className="space-y-6" onSubmit={handleProfileSave}>
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label htmlFor="manager-name">Nome do gestor</Label>
                                                <Input
                                                    id="manager-name"
                                                    value={profileForm.name}
                                                    onChange={(event) => updateProfileField('name', event.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="manager-email">Email principal</Label>
                                                <Input
                                                    id="manager-email"
                                                    type="email"
                                                    value={profileForm.email}
                                                    onChange={(event) => updateProfileField('email', event.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="manager-timezone">Fuso horário (opcional)</Label>
                                            <Input
                                                id="manager-timezone"
                                                placeholder="Ex: America/Sao_Paulo"
                                                value={profileForm.timezone || ''}
                                                onChange={(event) => updateProfileField('timezone', event.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <h2 className="text-lg font-semibold">Preferências de notificação</h2>
                                                <p className="text-sm text-muted-foreground">
                                                    Escolha quais alertas deseja receber no manager.
                                                </p>
                                            </div>
                                            <div className="grid gap-3">
                                                {[
                                                    {
                                                        key: 'newOrders',
                                                        title: 'Novos pedidos',
                                                        description: 'Receber alertas quando um novo pedido chegar pela Cubbo.',
                                                    },
                                                    {
                                                        key: 'escalations',
                                                        title: 'Chamados priorizados',
                                                        description: 'Ser avisado quando houver atualização em um chamado de gestor.',
                                                    },
                                                    {
                                                        key: 'celebrationFeed',
                                                        title: 'Área de celebração',
                                                        description: 'Mostrar destaque animado quando chegar um novo pedido.',
                                                    },
                                                ].map((item) => (
                                                    <div
                                                        key={item.key}
                                                        className="flex items-start justify-between rounded-xl border border-border/70 px-4 py-3"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-medium">{item.title}</p>
                                                            <p className="text-xs text-muted-foreground">{item.description}</p>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            className="h-4 w-4 accent-primary mt-1"
                                                            checked={Boolean(
                                                                profileForm.notificationPreferences[item.key as 'newOrders' | 'escalations' | 'celebrationFeed']
                                                            )}
                                                            onChange={() =>
                                                                togglePreference(item.key as 'newOrders' | 'escalations' | 'celebrationFeed')
                                                            }
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-semibold">Canais</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { id: 'in_app', label: 'Notificações no painel' },
                                                    { id: 'email', label: 'Email' },
                                                ].map((channel) => {
                                                    const channels = profileForm.notificationPreferences.channels || [];
                                                    const active = channels.includes(channel.id as ManagerNotificationChannel);
                                                    return (
                                                        <Button
                                                            key={channel.id}
                                                            type="button"
                                                            variant={active ? 'default' : 'outline'}
                                                            onClick={() => toggleChannel(channel.id as ManagerNotificationChannel)}
                                                        >
                                                            {channel.label}
                                                        </Button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        {profileFeedback && (
                                            <p
                                                className={cn(
                                                    'text-sm',
                                                    profileFeedback.type === 'success' ? 'text-green-600' : 'text-destructive'
                                                )}
                                            >
                                                {profileFeedback.message}
                                            </p>
                                        )}
                                        <div className="flex justify-end">
                                            <Button type="submit" disabled={isSavingProfile}>
                                                {isSavingProfile ? 'Salvando...' : 'Salvar alterações'}
                                            </Button>
                                        </div>
                                    </form>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                );
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
                                                <tr
                                                    key={ticket.id}
                                                    className={cn(
                                                        pendingTicketFocus === ticket.id &&
                                                            'bg-primary/5 ring-1 ring-primary/30'
                                                    )}
                                                >
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
            case 'orders': {
                const totalOrderPages = Math.max(1, Math.ceil(Math.max(ordersTotal, 1) / ORDERS_PAGE_SIZE));
                const ordersRangeStart = ordersTotal === 0 ? 0 : (ordersPage - 1) * ORDERS_PAGE_SIZE + 1;
                const ordersRangeEnd = ordersTotal === 0 ? 0 : Math.min(ordersTotal, ordersPage * ORDERS_PAGE_SIZE);
                const filtersAreDefault = orderFilters.status === 'all' && !orderFilters.search;
                return (
                    <div>
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
                            <div className="space-y-1">
                                <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
                                <p className="text-sm text-gray-600">
                                    Pedidos que chegaram via Cubbo e estão relacionados à empresa {companyName}.
                                </p>
                                {!managerProfile?.email && (
                                    <p className="text-xs text-destructive">
                                        Atualize o email no menu Perfil para abrir chamados diretamente pelos pedidos.
                                    </p>
                                )}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                <Select value={orderFilters.status} onValueChange={handleOrderStatusChange}>
                                    <SelectTrigger className="w-full sm:w-44">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos os status</SelectItem>
                                        <SelectItem value="pending">Pendente</SelectItem>
                                        <SelectItem value="processing">Processando</SelectItem>
                                        <SelectItem value="shipped">Enviado</SelectItem>
                                        <SelectItem value="delivered">Entregue</SelectItem>
                                        <SelectItem value="cancelled">Cancelado</SelectItem>
                                        <SelectItem value="refunded">Reembolsado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    className="w-full sm:w-64"
                                    placeholder="Buscar por pedido, cliente ou email"
                                    value={orderSearchInput}
                                    onChange={(event) => handleOrderSearchInput(event.target.value)}
                                />
                                <Button variant="ghost" onClick={clearOrderFilters} disabled={filtersAreDefault}>
                                    Limpar
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={loadOrders}
                                    disabled={isLoading}
                                >
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        {ordersPage === 1 && (
                            <OrderCelebration orders={orders.slice(0, 3)} />
                        )}

                        {ordersError ? (
                            <Card className="p-12 text-center border-destructive">
                                <CardContent>
                                    <p className="text-destructive font-medium mb-2">
                                        Erro ao carregar pedidos
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        {ordersError}
                                    </p>
                                    <Button onClick={loadOrders} variant="outline">
                                        Tentar Novamente
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : isLoading ? (
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
                            <>
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
                                                <th>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map(order => {
                                                const isCurrentSubmitting =
                                                    isSubmittingEscalation &&
                                                    selectedOrderForEscalation?.id === order.id;
                                                const disableEscalation =
                                                    isCurrentSubmitting || !managerProfile?.email;
                                                return (
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
                                                        <td>
                                                            <div className="flex flex-col gap-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="secondary"
                                                                    onClick={() => openOrderDetailModal(order)}
                                                                >
                                                                    Ver detalhes
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => openEscalationModal(order)}
                                                                    disabled={disableEscalation}
                                                                    title={
                                                                        managerProfile?.email
                                                                            ? 'Abrir chamado direto com o suporte'
                                                                            : 'Atualize seu email no perfil para abrir chamados'
                                                                    }
                                                                >
                                                                    {isCurrentSubmitting ? 'Enviando...' : 'Abrir chamado'}
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                                {ordersTotal > 0 && (
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">
                                                Mostrando {ordersRangeStart}-{ordersRangeEnd} de {ordersTotal} pedidos
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Página {ordersPage} de {totalOrderPages}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <Button
                                                variant="outline"
                                                onClick={() => setOrdersPage(1)}
                                                disabled={ordersPage === 1 || isLoading}
                                            >
                                                Primeira
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setOrdersPage((prev) => Math.max(1, prev - 1))}
                                                disabled={ordersPage === 1 || isLoading}
                                            >
                                                Anterior
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setOrdersPage((prev) => prev + 1)}
                                                disabled={ordersPage >= totalOrderPages || isLoading}
                                            >
                                                Próxima
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setOrdersPage(totalOrderPages)}
                                                disabled={ordersPage >= totalOrderPages || isLoading}
                                            >
                                                Última
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                );
            }
            case 'escalations':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 mb-1">Chamados do Gestor</h1>
                                <p className="text-sm text-gray-600">
                                    Acompanhe chamados de alta prioridade abertos diretamente pelo manager.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                                <Select
                                    value={escalationsFilters.status}
                                    onValueChange={(value) =>
                                        setEscalationsFilters((prev) => ({
                                            ...prev,
                                            status: value as ManagerEscalationStatus | 'todos',
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full md:w-48">
                                        <SelectValue placeholder="Filtrar status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos os status</SelectItem>
                                        <SelectItem value="aberto">Em análise</SelectItem>
                                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                                        <SelectItem value="resolvido">Resolvido</SelectItem>
                                        <SelectItem value="cancelado">Cancelado</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    placeholder="Buscar pedido ou assunto"
                                    value={escalationsFilters.search}
                                    onChange={(event) =>
                                        setEscalationsFilters((prev) => ({
                                            ...prev,
                                            search: event.target.value,
                                        }))
                                    }
                                    className="w-full md:w-64"
                                />
                                <Button variant="outline" onClick={() => loadEscalations()} disabled={isLoadingEscalations}>
                                    Atualizar
                                </Button>
                            </div>
                        </div>

                        {escalationsError ? (
                            <Card className="p-12 text-center border-destructive">
                                <CardContent className="space-y-3">
                                    <p className="text-destructive font-medium">Erro ao carregar chamados</p>
                                    <p className="text-sm text-muted-foreground">{escalationsError}</p>
                                    <Button variant="outline" onClick={() => loadEscalations()}>
                                        Tentar novamente
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : isLoadingEscalations ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <span className="loading loading-spinner loading-lg text-primary"></span>
                                    <p className="mt-4 text-muted-foreground font-medium">Carregando chamados do gestor...</p>
                                </CardContent>
                            </Card>
                        ) : escalations.length === 0 ? (
                            <Card className="p-12 text-center">
                                <CardContent>
                                    <p className="text-muted-foreground mb-2">Nenhum chamado do gestor encontrado.</p>
                                    <p className="text-xs text-muted-foreground">
                                        Quando você escalar um pedido, ele aparecerá aqui para acompanhamento.
                                    </p>
                                </CardContent>
                            </Card>
                        ) : (
                            <Card className="overflow-x-auto">
                                <table className="table-standard">
                                    <thead>
                                        <tr>
                                            <th>Pedido</th>
                                            <th>Assunto</th>
                                            <th>Status</th>
                                            <th>Atualização</th>
                                            <th>Resumo</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {escalations.map((escalation) => (
                                            <tr key={escalation.id}>
                                                <td className="font-semibold">
                                                    {escalation.orderNumber}
                                                    <p className="text-xs text-muted-foreground">
                                                        Criado em {formatDateTime(escalation.createdAt)}
                                                    </p>
                                                </td>
                                                <td className="text-sm">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-medium">{escalation.subject}</span>
                                                        <span className="text-xs text-muted-foreground">
                                                            Por {escalation.managerEmail}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="flex flex-col gap-1">
                                                        <Badge variant={getEscalationBadgeVariant(escalation.status)}>
                                                            {formatEscalationStatus(escalation.status)}
                                                        </Badge>
                                                        <Badge variant="destructive" className="w-fit text-[10px] uppercase tracking-wide">
                                                            Prioridade alta
                                                        </Badge>
                                                    </div>
                                                </td>
                                                <td className="text-sm text-gray-600">
                                                    {formatDateTime(escalation.updatedAt)}
                                                    {escalation.lastAdminSummary && (
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Último retorno: {escalation.lastAdminSummary}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="text-sm text-gray-600 max-w-xs">
                                                    <p className="line-clamp-3">{escalation.description}</p>
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
                return (
                    <Suspense fallback={
                        <Card className="p-12 text-center">
                            <CardContent>
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="mt-4 text-muted-foreground font-medium">Carregando FAQ...</p>
                            </CardContent>
                        </Card>
                    }>
                        <LazyAdminFAQ companyId={companyId} />
                    </Suspense>
                );
            case 'knowledge':
                return (
                    <Suspense fallback={
                        <Card className="p-12 text-center">
                            <CardContent>
                                <span className="loading loading-spinner loading-lg text-primary"></span>
                                <p className="mt-4 text-muted-foreground font-medium">Carregando Base de Conhecimento...</p>
                            </CardContent>
                        </Card>
                    }>
                        <LazyAdminKnowledgeBase companyId={companyId} />
                    </Suspense>
                );
            default:
                return null;
        }
    };

    const handleNotificationSelect = useCallback(
        (notification: NotificationItem) => {
            if (notification.type === 'ticket') {
                setView('tickets');
                setPendingTicketFocus(notification.entityId);
                return;
            }
            if (notification.type === 'manager') {
                const category = notification.meta?.category;
                if (category === 'escalation_atualizada') {
                    setView('escalations');
                    return;
                }
                setView('orders');
                return;
            }
            setView('orders');
        },
        []
    );

    useEffect(() => {
        if (!pendingTicketFocus || view !== 'tickets') return;
        const timeout = setTimeout(() => setPendingTicketFocus(null), 4000);
        return () => clearTimeout(timeout);
    }, [pendingTicketFocus, view]);

    return (
        <ManagerDashboardErrorBoundary companyId={companyId}>
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
                        onClick={() => setView('dashboard')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'dashboard' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>📊</span>
                        Dashboard
                    </motion.a>
                    <motion.a 
                        onClick={() => setView('profile')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'profile' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>👤</span>
                        Perfil do Gestor
                    </motion.a>
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
                        onClick={() => setView('escalations')} 
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                            view === 'escalations' 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        }`}
                    >
                        <span>🚨</span>
                        Chamados do Gestor
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
            <main className="flex-1 overflow-y-auto">
                <DashboardHeader
                    title={`Painel do Gestor • ${companyName || 'Empresa'}`}
                    subtitle="Atualize seu perfil e monitore pedidos e chamados prioritários"
                    onNotificationSelect={handleNotificationSelect}
                    className="px-8"
                />
                <div className="p-6 lg:p-8">
                    {renderView()}
                </div>
            </main>

            {selectedOrderForEscalation && (
                <Dialog
                    open={isEscalationModalOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeEscalationModal();
                        } else {
                            setIsEscalationModalOpen(true);
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-xl">
                        <DialogHeader>
                            <DialogTitle>
                                Chamado prioritário • {selectedOrderForEscalation.order_number || selectedOrderForEscalation.id}
                            </DialogTitle>
                            <DialogDescription>
                                Descreva rapidamente o que precisa ser tratado neste pedido.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="rounded-lg border border-border/70 p-4 text-sm space-y-1">
                                <p>
                                    <strong>Cliente:</strong> {selectedOrderForEscalation.customer_name || 'Cliente'}
                                </p>
                                <p>
                                    <strong>Status:</strong> {formatOrderStatus(selectedOrderForEscalation.status)}
                                </p>
                                {(selectedOrderForEscalation.customer_email || selectedOrderForEscalation.customer_phone) && (
                                    <p className="text-muted-foreground">
                                        {selectedOrderForEscalation.customer_email || selectedOrderForEscalation.customer_phone}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="escalation-message">Mensagem para o suporte</Label>
                                <Textarea
                                    id="escalation-message"
                                    rows={4}
                                    placeholder="Ex.: Cliente precisa confirmar alteração de endereço..."
                                    value={escalationMessage}
                                    onChange={(event) => setEscalationMessage(event.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este chamado será marcado automaticamente como prioridade alta para nossa equipe.
                                </p>
                            </div>
                            {escalationFeedback && (
                                <p className="text-sm text-destructive">{escalationFeedback}</p>
                            )}
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" disabled={isSubmittingEscalation} onClick={closeEscalationModal}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleEscalationSubmit}
                                    disabled={isSubmittingEscalation || !escalationMessage.trim()}
                                >
                                    {isSubmittingEscalation ? 'Enviando...' : 'Enviar chamado'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            <OrderDetailModal
                order={selectedOrderDetail}
                isOpen={isOrderDetailOpen && !!selectedOrderDetail}
                onClose={closeOrderDetailModal}
            />

            </div>
        </ManagerDashboardErrorBoundary>
    );
};

// Export with explicit function to avoid hoisting issues
const ManagerDashboardWrapper = ManagerDashboard;
export default ManagerDashboardWrapper;

