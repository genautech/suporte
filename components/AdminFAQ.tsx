import React, { useState, useEffect } from 'react';
import { faqService } from '../services/faqService';
import { FAQEntry, FAQCategory } from '../types';
import { populateFAQ } from '../scripts/populateFAQ';
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
  DialogDescription,
} from './ui/dialog';
import { faqSeedData } from '../data/faqSeedData';

const categoryLabels: Record<FAQCategory, string> = {
  compra: 'Compras',
  troca: 'Trocas',
  rastreio: 'Rastreios',
  cancelamento: 'Cancelamentos',
  reembolso: 'Reembolsos',
  sla: 'SLAs',
  geral: 'Geral',
};

export const AdminFAQ: React.FC = () => {
  const [faqEntries, setFaqEntries] = useState<FAQEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FAQCategory | 'todos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FAQEntry | null>(null);
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: 'geral' as FAQCategory,
    tags: '',
    order: 0,
    active: true,
  });

  useEffect(() => {
    loadFAQEntries();
  }, [selectedCategory]);

  const loadFAQEntries = async () => {
    setIsLoading(true);
    try {
      const entries = await faqService.getAllFAQEntries();
      const filtered = selectedCategory === 'todos'
        ? entries
        : entries.filter(e => e.category === selectedCategory);
      setFaqEntries(filtered.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading FAQ entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEntry(null);
    setFormData({
      question: '',
      answer: '',
      category: 'geral',
      tags: '',
      order: faqEntries.length,
      active: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (entry: FAQEntry) => {
    setEditingEntry(entry);
    setFormData({
      question: entry.question,
      answer: entry.answer,
      category: entry.category,
      tags: entry.tags.join(', '),
      order: entry.order,
      active: entry.active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta entrada do FAQ?')) return;
    
    try {
      await faqService.deleteFAQEntry(id);
      loadFAQEntries();
    } catch (error) {
      console.error('Error deleting FAQ entry:', error);
      alert('Erro ao excluir entrada do FAQ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const tags = formData.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      if (editingEntry?.id) {
        await faqService.updateFAQEntry(editingEntry.id, {
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          tags,
          order: formData.order,
          active: formData.active,
        });
      } else {
        await faqService.createFAQEntry({
          question: formData.question,
          answer: formData.answer,
          category: formData.category,
          tags,
          order: formData.order,
          active: formData.active,
        });
      }
      
      setIsDialogOpen(false);
      loadFAQEntries();
    } catch (error) {
      console.error('Error saving FAQ entry:', error);
      alert('Erro ao salvar entrada do FAQ');
    }
  };

  const handleSeedData = async () => {
    if (!confirm('Isso irá criar todas as entradas iniciais do FAQ. Continuar?')) return;
    
    try {
      const result = await populateFAQ();
      if (result.success > 0) {
        alert(`${result.success} entradas do FAQ criadas com sucesso!${result.errors > 0 ? `\n${result.errors} entradas já existiam ou tiveram erro.` : ''}`);
      } else {
        alert('Todas as entradas já existem ou ocorreu um erro.');
      }
      loadFAQEntries();
    } catch (error) {
      console.error('Error seeding FAQ data:', error);
      alert('Erro ao criar dados iniciais.');
    }
  };

  const handleReorder = async (id: string, direction: 'up' | 'down') => {
    const entry = faqEntries.find(e => e.id === id);
    if (!entry) return;

    const currentIndex = faqEntries.findIndex(e => e.id === id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= faqEntries.length) return;

    const otherEntry = faqEntries[newIndex];
    
    try {
      await faqService.reorderFAQEntries([
        { id: id, order: otherEntry.order },
        { id: otherEntry.id!, order: entry.order },
      ]);
      loadFAQEntries();
    } catch (error) {
      console.error('Error reordering FAQ entries:', error);
    }
  };

  const filteredEntries = searchQuery.trim()
    ? faqEntries.filter(e => 
        e.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : faqEntries;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Gerenciar FAQ</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSeedData}>
                Popular com Dados Iniciais
              </Button>
              <Button onClick={handleCreate}>
                + Nova Entrada
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={(value) => setSelectedCategory(value as FAQCategory | 'todos')}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as Categorias</SelectItem>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
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
              {filteredEntries.map((entry, index) => (
                <Card key={entry.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {categoryLabels[entry.category]}
                          </Badge>
                          {!entry.active && (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            Ordem: {entry.order} | Views: {entry.views || 0} | Útil: {entry.helpful || 0}
                          </span>
                        </div>
                        <h3 className="font-semibold mb-1">{entry.question}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.answer}
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
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReorder(entry.id!, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReorder(entry.id!, 'down')}
                            disabled={index === filteredEntries.length - 1}
                          >
                            ↓
                          </Button>
                        </div>
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

      {/* Dialog de criação/edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Editar Entrada do FAQ' : 'Nova Entrada do FAQ'}
            </DialogTitle>
            <DialogDescription>
              {editingEntry 
                ? 'Edite as informações da entrada do FAQ abaixo.'
                : 'Preencha os campos abaixo para criar uma nova entrada no FAQ.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">
                Pergunta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="answer">
                Resposta <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value as FAQCategory })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Ordem</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="ex: compra, pagamento, frete"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="active">Ativo</Label>
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

