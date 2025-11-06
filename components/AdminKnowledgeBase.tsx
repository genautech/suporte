import React, { useState, useEffect } from 'react';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { supportService } from '../services/supportService';
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
  const [suggestions, setSuggestions] = useState<Array<{ ticket: Ticket; entry?: KnowledgeBaseEntry }>>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    try {
      const tickets = await supportService.getTickets();
      const resolvedTickets = tickets.filter(t => t.status === 'resolvido');
      
      const suggestionsList = await Promise.all(
        resolvedTickets.slice(0, 10).map(async (ticket) => {
          // Verificar se já existe entrada para este ticket
          const existingEntries = await knowledgeBaseService.getKnowledgeBaseEntries();
          const existing = existingEntries.find(e => 
            e.relatedTickets?.includes(ticket.id)
          );
          
          return { ticket, entry: existing };
        })
      );
      
      setSuggestions(suggestionsList.filter(s => !s.entry));
    } catch (error) {
      console.error('Error loading suggestions:', error);
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
      tags: entry.tags.join(', '),
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
      loadEntries();
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
            Sugestões de Tickets ({suggestions.length})
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
                  <SelectContent>
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
                  <SelectContent>
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
            <CardContent>
              {suggestions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma sugestão disponível no momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {suggestions.map(({ ticket }) => (
                    <Card key={ticket.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{ticket.subject}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                              {ticket.description}
                            </p>
                            <div className="flex gap-2">
                              <Badge variant="outline">Ticket #{ticket.id.substring(0, 6)}</Badge>
                              <Badge variant="success">Resolvido</Badge>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleCreateFromTicket(ticket.id)}
                          >
                            Criar Entrada
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
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
    </div>
  );
};

