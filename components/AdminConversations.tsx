// Componente para gerenciar usuários e conversas no painel admin
import React, { useState, useEffect, useCallback } from 'react';
import { Conversation, SupportUser, Company } from '../types';
import { conversationService } from '../services/conversationService';
import { userService } from '../services/userService';
import { companyService } from '../services/companyService';
import { analyzeConversation } from '../services/geminiService';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Label } from './ui/label';
import { MessageSender } from '../types';
import { SupportTicketFormAdvanced } from './SupportTicketFormAdvanced';
import { supportService } from '../services/supportService';

type FilterType = 'all' | 'undefined' | 'company';
type ViewType = 'conversations' | 'users';

export const AdminConversations: React.FC = () => {
  const [view, setView] = useState<ViewType>('conversations');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketInitialData, setTicketInitialData] = useState<{ name: string; email: string; phone?: string; orderNumber?: string } | null>(null);
  const [ticketDefaultSubject, setTicketDefaultSubject] = useState<any>('outro');
  
  // Estatísticas
  const [userStats, setUserStats] = useState({
    totalUsers: 0,
    newUsersLast7Days: 0,
    newUsersLast30Days: 0,
    usersWithConversations: 0,
    usersWithTickets: 0,
  });
  const [conversationStats, setConversationStats] = useState({
    totalConversations: 0,
    resolvedConversations: 0,
    unresolvedConversations: 0,
    conversationsLast7Days: 0,
    conversationsLast30Days: 0,
    undefinedConversations: 0,
  });

  const loadStatistics = useCallback(async () => {
    try {
      const [userStatsData, conversationStatsData] = await Promise.all([
        userService.getStatistics(),
        conversationService.getStatistics(),
      ]);
      setUserStats(userStatsData);
      setConversationStats(conversationStatsData);
    } catch (error) {
      console.error('[AdminConversations] Erro ao carregar estatísticas:', error);
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      let loadedConversations: Conversation[] = [];
      
      if (filterType === 'undefined') {
        loadedConversations = await conversationService.getUndefinedConversations();
      } else if (filterType === 'company' && selectedCompanyId) {
        loadedConversations = await conversationService.getConversationsByCompany(selectedCompanyId);
      } else {
        loadedConversations = await conversationService.getAllConversations(100);
      }
      
      setConversations(loadedConversations);
    } catch (error) {
      console.error('[AdminConversations] Erro ao carregar conversas:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, selectedCompanyId]);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      let loadedUsers: SupportUser[] = [];
      
      if (filterType === 'undefined') {
        loadedUsers = await userService.getUndefinedUsers();
      } else if (filterType === 'company' && selectedCompanyId) {
        loadedUsers = await userService.getUsersByCompany(selectedCompanyId);
      } else {
        loadedUsers = await userService.getAllUsers(100);
      }
      
      setUsers(loadedUsers);
    } catch (error) {
      console.error('[AdminConversations] Erro ao carregar usuários:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filterType, selectedCompanyId]);

  const loadCompanies = useCallback(async () => {
    try {
      const allCompanies = await companyService.getAllCompanies();
      setCompanies(allCompanies);
    } catch (error) {
      console.error('[AdminConversations] Erro ao carregar empresas:', error);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
    loadCompanies();
  }, [loadStatistics, loadCompanies]);

  useEffect(() => {
    if (view === 'conversations') {
      loadConversations();
    } else {
      loadUsers();
    }
  }, [view, loadConversations, loadUsers]);

  const handleViewConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setIsDetailModalOpen(true);
  };

  const handleAssignCompany = async (conversationId: string, companyId: string) => {
    try {
      await conversationService.assignCompanyToConversation(conversationId, companyId);
      await loadConversations();
      setIsAssignModalOpen(false);
      setSelectedConversation(null);
    } catch (error) {
      console.error('[AdminConversations] Erro ao atribuir empresa:', error);
      alert('Erro ao atribuir empresa. Tente novamente.');
    }
  };

  const handleAssignUserCompany = async (email: string, companyId: string) => {
    try {
      await userService.assignCompany(email, companyId);
      await loadUsers();
      alert('Empresa atribuída com sucesso!');
    } catch (error) {
      console.error('[AdminConversations] Erro ao atribuir empresa ao usuário:', error);
      alert('Erro ao atribuir empresa. Tente novamente.');
    }
  };

  const handleAnalyzeConversation = async (conversation: Conversation) => {
    if (!conversation.id) return;
    
    try {
      const insights = await analyzeConversation(conversation);
      if (insights) {
        await conversationService.updateConversation(conversation.id, {
          aiInsights: insights,
        });
        // Recarregar conversa atualizada
        const updated = await conversationService.getConversationById(conversation.id);
        if (updated) {
          setSelectedConversation(updated);
        }
      }
    } catch (error) {
      console.error('[AdminConversations] Erro ao analisar conversa:', error);
      alert('Erro ao analisar conversa. Tente novamente.');
    }
  };

  const getCompanyName = (companyId?: string): string => {
    if (!companyId || companyId === 'general') return 'Indefinido';
    const company = companies.find(c => c.id === companyId);
    return company?.name || companyId;
  };

  const handleOpenTicketFromConversation = async (conv: Conversation) => {
    setTicketInitialData({
      name: conv.userId.split('@')[0], // Nome simples do email
      email: conv.userId,
      phone: undefined, // Não temos telefone na conversa
      orderNumber: conv.orderNumbers && conv.orderNumbers.length > 0 ? conv.orderNumbers[0] : undefined,
    });
    setTicketDefaultSubject('outro'); // Assunto padrão 'outro'
    setSelectedConversation(conv);
    setIsTicketModalOpen(true);
  };

  const handleArchiveConversation = async (conversationId: string) => {
    if (window.confirm('Tem certeza que deseja arquivar esta conversa? Ela não aparecerá mais na lista principal.')) {
      setIsLoading(true);
      try {
        await conversationService.archiveConversation(conversationId);
        alert('Conversa arquivada com sucesso!');
        loadConversations();
        loadStatistics();
      } catch (error) {
        console.error('Erro ao arquivar conversa:', error);
        alert('Erro ao arquivar conversa.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleTicketFormSubmit = async (ticketId: string) => {
    if (selectedConversation?.id) {
      try {
        // Vincular ticket à conversa
        await conversationService.linkTicketToConversation(selectedConversation.id, ticketId);
        alert(`Chamado ${ticketId} criado com sucesso e vinculado à conversa!`);
        setIsTicketModalOpen(false);
        setTicketInitialData(null);
        setTicketDefaultSubject('outro');
        setSelectedConversation(null);
        loadConversations();
        loadStatistics();
      } catch (error) {
        console.error('Erro ao vincular ticket à conversa:', error);
        alert(`Chamado ${ticketId} criado, mas houve erro ao vincular à conversa.`);
      }
    } else {
      alert(`Chamado ${ticketId} criado com sucesso!`);
      setIsTicketModalOpen(false);
      setTicketInitialData(null);
      setTicketDefaultSubject('outro');
      loadStatistics();
    }
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.newUsersLast7Days} novos nos últimos 7 dias
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Conversas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversationStats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {conversationStats.resolvedConversations} resolvidas
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversas Indefinidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{conversationStats.undefinedConversations}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atribuição manual
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Usuários com Interações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.usersWithConversations}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.usersWithTickets} com tickets
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Tabs */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={view === 'conversations' ? 'default' : 'outline'}
            onClick={() => setView('conversations')}
          >
            💬 Conversas
          </Button>
          <Button
            variant={view === 'users' ? 'default' : 'outline'}
            onClick={() => setView('users')}
          >
            👥 Usuários
          </Button>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="undefined">Indefinidas</SelectItem>
              <SelectItem value="company">Por Empresa</SelectItem>
            </SelectContent>
          </Select>
          
          {filterType === 'company' && (
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Selecione empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id || ''}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Lista de Conversas */}
      {view === 'conversations' && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-muted-foreground">Carregando conversas...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">Nenhuma conversa encontrada.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-standard">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>Mensagens</th>
                      <th>Empresa</th>
                      <th>Status</th>
                      <th>Data</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((conv) => (
                      <tr key={conv.id}>
                        <td className="font-medium">
                          {conv.userId}
                        </td>
                        <td>{conv.messages.length}</td>
                        <td>
                          <Badge variant={(!conv.companyId || conv.companyId === 'general') && !conv.assignedCompanyId ? 'destructive' : 'secondary'}>
                            {getCompanyName(conv.assignedCompanyId || conv.companyId)}
                          </Badge>
                        </td>
                        <td>
                          <Badge variant={conv.resolved ? 'success' : 'warning'}>
                            {conv.resolved ? 'Resolvida' : 'Aberta'}
                          </Badge>
                        </td>
                        <td className="text-sm text-gray-600">
                          {new Date(conv.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleViewConversation(conv)}
                              size="sm"
                              variant="outline"
                            >
                              Ver
                            </Button>
                            {((!conv.companyId || conv.companyId === 'general') && !conv.assignedCompanyId) && (
                              <Button
                                onClick={() => {
                                  setSelectedConversation(conv);
                                  setIsAssignModalOpen(true);
                                }}
                                size="sm"
                                variant="default"
                              >
                                Atribuir
                              </Button>
                            )}
                            <Button
                              onClick={() => handleOpenTicketFromConversation(conv)}
                              size="sm"
                              variant="secondary"
                            >
                              Abrir Chamado
                            </Button>
                            <Button
                              onClick={() => handleArchiveConversation(conv.id!)}
                              size="sm"
                              variant="destructive"
                            >
                              Arquivar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de Usuários */}
      {view === 'users' && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center">
                <span className="loading loading-spinner loading-lg text-primary"></span>
                <p className="mt-4 text-muted-foreground">Carregando usuários...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum usuário encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-standard">
                  <thead>
                    <tr>
                      <th>Email</th>
                      <th>Nome</th>
                      <th>Empresa</th>
                      <th>Logins</th>
                      <th>Conversas</th>
                      <th>Tickets</th>
                      <th>Último Acesso</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id || user.email}>
                        <td className="font-medium">{user.email}</td>
                        <td>{user.firstName || ''} {user.lastName || ''}</td>
                        <td>
                          <Badge variant={!user.assignedCompanyId && (!user.autoDetectedCompanyId || user.autoDetectedCompanyId === 'general') ? 'destructive' : 'secondary'}>
                            {getCompanyName(user.assignedCompanyId || user.autoDetectedCompanyId)}
                          </Badge>
                        </td>
                        <td>{user.totalLogins}</td>
                        <td>{user.totalConversations || 0}</td>
                        <td>{user.totalTickets || 0}</td>
                        <td className="text-sm text-gray-600">
                          {new Date(user.lastAccessAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td>
                          {(!user.assignedCompanyId && (!user.autoDetectedCompanyId || user.autoDetectedCompanyId === 'general')) && (
                            <Button
                              onClick={() => {
                                const companyId = prompt('Digite o ID da empresa:');
                                if (companyId) {
                                  handleAssignUserCompany(user.email, companyId);
                                }
                              }}
                              size="sm"
                              variant="default"
                            >
                              Atribuir
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes da Conversa */}
      {selectedConversation && isDetailModalOpen && (
        <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Conversa</DialogTitle>
              <DialogDescription>
                Usuário: {selectedConversation.userId} | 
                Criada em: {new Date(selectedConversation.createdAt).toLocaleString('pt-BR')}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Informações da Conversa */}
              <div className="flex gap-2 flex-wrap">
                <Badge variant={selectedConversation.resolved ? 'success' : 'warning'}>
                  {selectedConversation.resolved ? 'Resolvida' : 'Aberta'}
                </Badge>
                <Badge variant={(!selectedConversation.companyId || selectedConversation.companyId === 'general') && !selectedConversation.assignedCompanyId ? 'destructive' : 'secondary'}>
                  Empresa: {getCompanyName(selectedConversation.assignedCompanyId || selectedConversation.companyId)}
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
                          {msg.sender === MessageSender.USER ? '👤 Usuário' : '🤖 Bot'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insights */}
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
                    {selectedConversation.aiInsights.keywords && selectedConversation.aiInsights.keywords.length > 0 && (
                      <p><strong>Palavras-chave:</strong> {selectedConversation.aiInsights.keywords.join(', ')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Ações */}
              <div className="flex gap-2 flex-wrap">
                {!selectedConversation.aiInsights && (
                  <Button
                    onClick={() => handleAnalyzeConversation(selectedConversation)}
                    variant="outline"
                  >
                    🤖 Analisar com Gemini AI
                  </Button>
                )}
                {((!selectedConversation.companyId || selectedConversation.companyId === 'general') && !selectedConversation.assignedCompanyId) && (
                  <Button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setIsAssignModalOpen(true);
                    }}
                    variant="default"
                  >
                    🏢 Atribuir Empresa
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Atribuição de Empresa */}
      {selectedConversation && isAssignModalOpen && (
        <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Atribuir Empresa à Conversa</DialogTitle>
              <DialogDescription>
                Selecione a empresa para atribuir a esta conversa
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Empresa</Label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={setSelectedCompanyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id || ''}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAssignModalOpen(false);
                    setSelectedConversation(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (selectedConversation.id && selectedCompanyId) {
                      handleAssignCompany(selectedConversation.id, selectedCompanyId);
                    }
                  }}
                  disabled={!selectedCompanyId}
                >
                  Atribuir
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Abertura de Chamado */}
      {isTicketModalOpen && ticketInitialData && (
        <Dialog open={isTicketModalOpen} onOpenChange={setIsTicketModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto z-[100]">
            <DialogHeader>
              <DialogTitle>Abrir Chamado de Suporte</DialogTitle>
            </DialogHeader>
            <SupportTicketFormAdvanced
              initialData={ticketInitialData}
              defaultSubject={ticketDefaultSubject}
              onSubmit={handleTicketFormSubmit}
              onClose={() => {
                setIsTicketModalOpen(false);
                setTicketInitialData(null);
                setTicketDefaultSubject('outro');
                setSelectedConversation(null);
              }}
              skipRequiredValidation={true}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

