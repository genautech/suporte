import React, { useState, useEffect } from 'react';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { supportService } from '../services/supportService';
import { companyService } from '../services/companyService';
import { KnowledgeBaseEntry, Ticket } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
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
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export const AdminKnowledgeBase: React.FC<{ companyId?: string }> = ({ companyId }) => {
  const [entries, setEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<KnowledgeBaseEntry[]>([]);
  const [ticketsWithoutEntry, setTicketsWithoutEntry] = useState<Ticket[]>([]);
  const [ticketLookup, setTicketLookup] = useState<Record<string, Ticket>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    verified: false,
  });
  const [selectedSuggestionTicket, setSelectedSuggestionTicket] = useState<Ticket | null>(null);
  const [isTicketDialogOpen, setIsTicketDialogOpen] = useState(false);
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});
  const suggestionCount = pendingEntries.length + ticketsWithoutEntry.length;

  useEffect(() => {
    loadEntries();
    loadSuggestions();
  }, [selectedFilter, selectedCategory, companyId]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const filters: { verified?: boolean; category?: string; companyId?: string } = {};
      if (selectedFilter === 'verified') filters.verified = true;
      if (selectedFilter === 'unverified') filters.verified = false;
      if (selectedCategory !== 'all') filters.category = selectedCategory;
      if (companyId) filters.companyId = companyId;

      const allEntries = await knowledgeBaseService.getKnowledgeBaseEntries(filters);
      setEntries(allEntries);
    } catch (error) {
      console.error('Error loading knowledge base entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const [tickets, entries, company] = await Promise.all([
        supportService.getTickets(),
        knowledgeBaseService.getKnowledgeBaseEntries(
          companyId ? { companyId } : undefined
        ),
        companyId ? companyService.getCompany(companyId) : Promise.resolve(null),
      ]);

      const resolvedTickets = tickets.filter(t => t.status === 'resolvido');
      let scopedTickets = resolvedTickets;
      const normalizedDomains = (company?.domains || []).map(domain => domain.toLowerCase());

      if (companyId) {
        scopedTickets = resolvedTickets.filter(ticket => {
          if (ticket.companyId && ticket.companyId === companyId) {
            return true;
          }
          if (normalizedDomains.length > 0 && ticket.email) {
            const emailLower = ticket.email.toLowerCase();
            return normalizedDomains.some(domain => emailLower.includes(domain));
          }
          return false;
        });
      }

      const ticketEntries = entries.filter(entry => entry.source === 'ticket');
      const unverifiedEntries = ticketEntries.filter(entry => !entry.verified);
      const scopedEntries = companyId
        ? unverifiedEntries.filter(entry =>
            !entry.companyId || entry.companyId === companyId || entry.companyId === 'general'
          )
        : unverifiedEntries;
      setPendingEntries(scopedEntries);

      const ticketsById: Record<string, Ticket> = {};
      scopedTickets.forEach(ticket => {
        ticketsById[ticket.id] = ticket;
      });

      scopedEntries.forEach(entry => {
        (entry.relatedTickets || []).forEach(ticketId => {
          if (!ticketsById[ticketId]) {
            const relatedTicket = tickets.find(t => t.id === ticketId);
            if (relatedTicket) {
              ticketsById[ticketId] = relatedTicket;
            }
          }
        });
      });
      setTicketLookup(ticketsById);

      const ticketsWithEntry = new Set<string>();
      ticketEntries.forEach(entry => {
        (entry.relatedTickets || []).forEach(ticketId => ticketsWithEntry.add(ticketId));
      });

      const remainingTickets = scopedTickets.filter(ticket => !ticketsWithEntry.has(ticket.id));
      setTicketsWithoutEntry(remainingTickets.slice(0, 10));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setPendingEntries([]);
      setTicketsWithoutEntry([]);
      setTicketLookup({});
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleCreateFromTicket = async (ticketId: string) => {
    try {
      const entryId = await knowledgeBaseService.suggestFromTicket(ticketId);
      if (entryId) {
        alert('Entrada de conhecimento criada com sucesso! Revise e verifique antes de ativar.');
        loadEntries();
        loadSuggestions();
      }
    } catch (error) {
      console.error('Error creating knowledge entry from ticket:', error);
      alert('Erro ao criar entrada de conhecimento');
    }
  };

  const handleOpenTicket = async (ticketId: string) => {
    if (!ticketId) return;
    const cachedTicket = ticketLookup[ticketId];
    if (cachedTicket) {
      setSelectedSuggestionTicket(cachedTicket);
      setIsTicketDialogOpen(true);
      return;
    }

    try {
      const fetched = await supportService.getTicketById(ticketId);
      if (fetched) {
        setSelectedSuggestionTicket(fetched);
        setIsTicketDialogOpen(true);
      } else {
        alert('Ticket não encontrado.');
      }
    } catch (error) {
      console.error('Error opening ticket:', error);
      alert('Erro ao abrir ticket.');
    }
  };

  const toggleEntryContent = (entryId: string) => {
    if (!entryId) return;
    setExpandedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId],
    }));
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setFormData({
      title: '',
      content: '',
      category: '',
      tags: '',
      verified: false,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setFormData({
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: (entry.tags || []).join(', '),
      verified: entry.verified,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada da base de conhecimento?')) return;
    
    try {
      await knowledgeBaseService.deleteKnowledgeEntry(id);
      loadEntries();
    } catch (error) {
      console.error('Error deleting knowledge entry:', error);
      alert('Erro ao excluir entrada');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await knowledgeBaseService.verifyKnowledgeEntry(id);
      
      // Quando uma entrada é verificada, ela deve incrementar o aprendizado geral
      // Importar e chamar o serviço de aprendizado automático
      try {
        const { autoLearningService } = await import('../services/autoLearningService');
        await autoLearningService.learnFromKnowledgeBase(id);
        console.log('[AdminKnowledgeBase] Entrada verificada e aprendizado atualizado:', id);
      } catch (learningError) {
        console.error('[AdminKnowledgeBase] Erro ao atualizar aprendizado (não crítico):', learningError);
        // Não bloquear a verificação se o aprendizado falhar
      }
      
      loadEntries();
      loadSuggestions();
      alert('Entrada verificada com sucesso! Ela agora está disponível no treinamento da IA.');
    } catch (error) {
      console.error('Error verifying knowledge entry:', error);
      alert('Erro ao verificar entrada');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      if (editingEntry?.id) {
        await knowledgeBaseService.updateKnowledgeEntry(editingEntry.id, {
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags,
          verified: formData.verified,
        });
      } else {
        await knowledgeBaseService.createKnowledgeEntry({
          title: formData.title,
          content: formData.content,
          category: formData.category,
          tags,
          source: 'manual',
          verified: formData.verified,
          relatedTickets: [],
        });
      }
      
      setIsDialogOpen(false);
      loadEntries();
    } catch (error) {
      console.error('Error saving knowledge entry:', error);
      alert('Erro ao salvar entrada');
    }
  };

  const categories = Array.from(new Set(entries.map(e => e.category)));

  const filteredEntries = searchQuery.trim()
    ? entries.filter(e => 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : entries;

  return (
    <div className="space-y-6">
      <Tabs defaultValue="entries" className="space-y-6">
        <TabsList>
          <TabsTrigger value="entries">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="suggestions">
            Sugestões de Tickets ({suggestionCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Base de Conhecimento</CardTitle>
                <Button onClick={handleCreate}>
                  + Nova Entrada
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtros */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Buscar na base de conhecimento..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={selectedFilter}
                  onValueChange={(value) => setSelectedFilter(value as typeof selectedFilter)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="verified">Verificadas</SelectItem>
                    <SelectItem value="unverified">Não Verificadas</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[10000]">
                    <SelectItem value="all">Todas Categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lista de entradas */}
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma entrada encontrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredEntries.map((entry) => (
                    <Card key={entry.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={entry.verified ? 'default' : 'secondary'}>
                                {entry.verified ? '✓ Verificada' : 'Não Verificada'}
                              </Badge>
                              <Badge variant="outline">{entry.source}</Badge>
                              {entry.category && (
                                <Badge variant="outline">{entry.category}</Badge>
                              )}
                            </div>
                            <h3 className="font-semibold mb-1">{entry.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {entry.content}
                            </p>
                            {entry.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entry.tags.map((tag, i) => (
                                  <Badge variant="secondary" className="text-xs" key={i}>
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {entry.relatedTickets && entry.relatedTickets.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-2">
                                Relacionado a {entry.relatedTickets.length} ticket(s)
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 shrink-0">
                            {!entry.verified && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleVerify(entry.id!)}
                              >
                                Verificar
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(entry.id!)}
                            >
                              Excluir
                            </Button>
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

        <TabsContent value="suggestions">
          <Card>
            <CardHeader>
              <CardTitle>Sugestões de Conhecimento a partir de Tickets Resolvidos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {isLoadingSuggestions ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <>
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">Entradas geradas a partir de chamados resolvidos</h4>
                      <Badge variant="outline">{pendingEntries.length}</Badge>
                    </div>
                    {pendingEntries.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Nenhuma entrada aguardando verificação no momento.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingEntries.map((entry) => {
                          const entryId = entry.id || entry.title;
                          const isExpanded = expandedEntries[entryId];
                          const hasTicket = (entry.relatedTickets || []).length > 0;
                          const entryTags = entry.tags || [];

                          return (
                            <Card key={entryId}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Badge variant="secondary">Não verificada</Badge>
                                      {entry.category && <Badge variant="outline">{entry.category}</Badge>}
                                      <Badge variant="outline">Fonte: {entry.source}</Badge>
                                    </div>
                                    <h3 className="font-semibold mb-1">{entry.title}</h3>
                                    <p
                                      className={`text-sm text-muted-foreground whitespace-pre-wrap ${
                                        isExpanded ? '' : 'line-clamp-3'
                                      }`}
                                    >
                                      {entry.content}
                                    </p>
                                    {entryTags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {entryTags.map((tag, index) => (
                                          <Badge key={index} variant="secondary" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {entry.relatedTickets && entry.relatedTickets.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-3">
                                        {entry.relatedTickets.map((ticketId) => (
                                          <Button
                                            key={ticketId}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenTicket(ticketId)}
                                          >
                                            Abrir ticket #{ticketId.substring(0, 6)}
                                          </Button>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-2 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleEntryContent(entryId)}
                                    >
                                      {isExpanded ? 'Ocultar conteúdo' : 'Ver conteúdo'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => entry.relatedTickets?.[0] && handleOpenTicket(entry.relatedTickets[0])}
                                      disabled={!hasTicket}
                                    >
                                      Abrir ticket
                                    </Button>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      onClick={() => entry.id && handleVerify(entry.id)}
                                    >
                                      Verificar
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-base">Tickets resolvidos sem entrada na Base</h4>
                      <Badge variant="outline">{ticketsWithoutEntry.length}</Badge>
                    </div>
                    {ticketsWithoutEntry.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Todos os tickets resolvidos mapeados possuem uma sugestão.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {ticketsWithoutEntry.map((ticket) => (
                          <Card key={ticket.id}>
                            <CardContent className="p-4">
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex-1">
                                  <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                    {ticket.description}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <Badge variant="outline">Ticket #{ticket.id.substring(0, 6)}</Badge>
                                    <Badge variant="success">Resolvido</Badge>
                                    {ticket.orderNumber && (
                                      <Badge variant="outline">Pedido {ticket.orderNumber}</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" onClick={() => handleOpenTicket(ticket.id)}>
                                    Ver ticket
                                  </Button>
                                  <Button onClick={() => handleCreateFromTicket(ticket.id)}>
                                    Criar Entrada
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Editar Entrada' : 'Nova Entrada'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">
                Conteúdo <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="ex: cancelamento, troca"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="ex: pedido, produto, defeito"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="verified"
                checked={formData.verified}
                onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="verified">Verificado</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingEntry ? 'Salvar Alterações' : 'Criar Entrada'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isTicketDialogOpen}
        onOpenChange={(open) => {
          setIsTicketDialogOpen(open);
          if (!open) {
            setSelectedSuggestionTicket(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedSuggestionTicket
                ? `Chamado #${selectedSuggestionTicket.id.substring(0, 6)}`
                : 'Carregando ticket'}
            </DialogTitle>
          </DialogHeader>
          {selectedSuggestionTicket ? (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <p>
                  <strong>Status:</strong> {selectedSuggestionTicket.status}
                </p>
                <p>
                  <strong>Prioridade:</strong> {selectedSuggestionTicket.priority}
                </p>
                <p>
                  <strong>Cliente:</strong> {selectedSuggestionTicket.name}
                </p>
                <p>
                  <strong>Email:</strong> {selectedSuggestionTicket.email}
                </p>
                {selectedSuggestionTicket.orderNumber && (
                  <p>
                    <strong>Pedido:</strong> {selectedSuggestionTicket.orderNumber}
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {selectedSuggestionTicket.description}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Buscando informações do ticket...</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

