// Componente para gerenciar respostas padrão por empresa
import React, { useState, useEffect } from 'react';
import { DefaultResponse } from '../types';
import { defaultResponseService } from '../services/defaultResponseService';
import { companyService } from '../services/companyService';
import { knowledgeBaseService } from '../services/knowledgeBaseService';
import { autoLearningService } from '../services/autoLearningService';
import { Company } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export const AdminDefaultResponses: React.FC = () => {
  const [responses, setResponses] = useState<DefaultResponse[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('general');
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingResponse, setEditingResponse] = useState<DefaultResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    companyId: '',
    question: '',
    answer: '',
    keywords: '',
    category: '',
    active: true,
    includeInLearning: false,
    includeInAutoLearning: false,
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    loadResponses();
  }, [selectedCompanyId]);

  const loadCompanies = async () => {
    try {
      const allCompanies = await companyService.getAllCompanies();
      setCompanies(allCompanies);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadResponses = async () => {
    setIsLoading(true);
    try {
      if (selectedCompanyId === 'general') {
        // Buscar todas as respostas de todas as empresas
        const allResponses: DefaultResponse[] = [];
        for (const company of companies) {
          if (company.id) {
            const companyResponses = await defaultResponseService.getDefaultResponses(company.id);
            allResponses.push(...companyResponses);
          }
        }
        setResponses(allResponses);
      } else {
        const companyResponses = await defaultResponseService.getDefaultResponses(selectedCompanyId);
        setResponses(companyResponses);
      }
    } catch (error) {
      console.error('Erro ao carregar respostas padrão:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingResponse(null);
    setFormData({
      companyId: selectedCompanyId !== 'general' ? selectedCompanyId : '',
      question: '',
      answer: '',
      keywords: '',
      category: '',
      active: true,
      includeInLearning: false,
      includeInAutoLearning: false,
    });
    setIsFormOpen(true);
  };

  const handleEdit = (response: DefaultResponse) => {
    setEditingResponse(response);
    setFormData({
      companyId: response.companyId,
      question: response.question,
      answer: response.answer,
      keywords: response.keywords.join(', '),
      category: response.category || '',
      active: response.active,
      includeInLearning: response.includeInLearning || false,
      includeInAutoLearning: response.includeInAutoLearning || false,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    try {
      const keywordsArray = formData.keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0);

      if (editingResponse?.id) {
        // Atualizar
        await defaultResponseService.updateDefaultResponse(editingResponse.id, {
          question: formData.question,
          answer: formData.answer,
          keywords: keywordsArray,
          category: formData.category || undefined,
          active: formData.active,
          includeInLearning: formData.includeInLearning,
          includeInAutoLearning: formData.includeInAutoLearning,
        });
      } else {
        // Criar
        if (!formData.companyId) {
          alert('Selecione uma empresa');
          return;
        }
        
        const newId = await defaultResponseService.createDefaultResponse({
          companyId: formData.companyId,
          question: formData.question,
          answer: formData.answer,
          keywords: keywordsArray,
          category: formData.category || undefined,
          active: formData.active,
          includeInLearning: formData.includeInLearning,
          includeInAutoLearning: formData.includeInAutoLearning,
        });

        // Se marcado para incluir no aprendizado, adicionar à Base de Conhecimento
        if (formData.includeInLearning && newId) {
          try {
            await knowledgeBaseService.createKnowledgeEntry({
              title: formData.question,
              content: formData.answer,
              category: formData.category || 'Resposta Padrão',
              tags: ['resposta-padrão', ...keywordsArray],
              source: 'manual',
              verified: true,
              companyId: formData.companyId,
            });
          } catch (error) {
            console.error('Erro ao adicionar à Base de Conhecimento:', error);
          }
        }
      }

      setIsFormOpen(false);
      loadResponses();
    } catch (error) {
      console.error('Erro ao salvar resposta padrão:', error);
      alert('Erro ao salvar resposta padrão');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar esta resposta padrão?')) {
      return;
    }
    try {
      await defaultResponseService.deleteDefaultResponse(id);
      loadResponses();
    } catch (error) {
      console.error('Erro ao deletar resposta padrão:', error);
      alert('Erro ao deletar resposta padrão');
    }
  };

  const filteredResponses = responses
    .filter(response => response.active)
    .filter(response => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          response.question.toLowerCase().includes(query) ||
          response.answer.toLowerCase().includes(query) ||
          response.keywords.some(k => k.toLowerCase().includes(query)) ||
          (response.category && response.category.toLowerCase().includes(query))
        );
      }
      return true;
    });

  const getCompanyName = (companyId: string) => {
    const company = companies.find(c => c.id === companyId);
    return company?.name || companyId;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Respostas Padrão</h1>
          <p className="text-sm text-gray-600">Gerencie respostas padrão por empresa para facilitar o atendimento</p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">Todas as empresas</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id || ''}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="text"
            placeholder="Buscar respostas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button onClick={handleCreate}>
            ➕ Criar Resposta Padrão
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="p-12 text-center">
          <CardContent>
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <p className="mt-4 text-muted-foreground font-medium">Carregando respostas padrão...</p>
          </CardContent>
        </Card>
      ) : filteredResponses.length === 0 ? (
        <Card className="p-12 text-center">
          <CardContent>
            <p className="text-muted-foreground">Nenhuma resposta padrão encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResponses.map((response) => (
            <Card key={response.id} className="relative">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{response.question}</CardTitle>
                  <div className="flex gap-2">
                    {response.active ? (
                      <Badge variant="success">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Empresa: {getCompanyName(response.companyId)}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 mb-3 line-clamp-3">{response.answer}</p>
                {response.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {response.keywords.slice(0, 3).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {response.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{response.keywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-muted-foreground mb-3">
                  <span>Usos: {response.usageCount}</span>
                  {response.category && <span>Categoria: {response.category}</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(response)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => response.id && handleDelete(response.id)}
                  >
                    Desativar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingResponse ? 'Editar Resposta Padrão' : 'Criar Resposta Padrão'}
            </DialogTitle>
            <DialogDescription>
              {editingResponse
                ? 'Edite as informações da resposta padrão abaixo.'
                : 'Preencha os dados para criar uma nova resposta padrão.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="companyId">Empresa *</Label>
              <Select
                value={formData.companyId}
                onValueChange={(value) => setFormData({ ...formData, companyId: value })}
                disabled={!!editingResponse}
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
            <div>
              <Label htmlFor="question">Pergunta *</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Ex: Como rastrear meu pedido?"
              />
            </div>
            <div>
              <Label htmlFor="answer">Resposta *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Digite a resposta padrão genérica..."
                rows={6}
              />
            </div>
            <div>
              <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="Ex: rastreamento, pedido, entrega"
              />
            </div>
            <div>
              <Label htmlFor="category">Categoria (opcional)</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Rastreamento"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                />
                <span className="text-sm">Ativa</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeInLearning}
                  onChange={(e) => setFormData({ ...formData, includeInLearning: e.target.checked })}
                />
                <span className="text-sm">Incluir no aprendizado do Gemini</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.includeInAutoLearning}
                  onChange={(e) => setFormData({ ...formData, includeInAutoLearning: e.target.checked })}
                />
                <span className="text-sm">Incluir no aprendizado automático</span>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

