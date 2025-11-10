// AdminCompanies component for managing companies
import React, { useState, useEffect } from 'react';
import { Company } from '../types';
import { companyService } from '../services/companyService';
import { grantManagerAccess, revokeManagerAccess } from '../services/authService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Trash2, Edit, Plus, Building2 } from 'lucide-react';

export const AdminCompanies: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    domains: '',
    keywords: '',
    greeting: 'Olá! Como posso ajudar?',
    managerEmail: '',
    managerName: '',
    managerAccessEnabled: false,
  });

  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      const allCompanies = await companyService.getAllCompanies();
      setCompanies(allCompanies);
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCompany(null);
    setFormData({
      name: '',
      domains: '',
      keywords: '',
      greeting: 'Olá! Como posso ajudar?',
      managerEmail: '',
      managerName: '',
      managerAccessEnabled: false,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      name: company.name,
      domains: company.domains.join(', '),
      keywords: company.keywords.join(', '),
      greeting: company.greeting,
      managerEmail: company.managerEmail,
      managerName: company.managerName,
      managerAccessEnabled: company.managerAccessEnabled,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta empresa? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      await companyService.deleteCompany(id);
      loadCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Erro ao deletar empresa. Tente novamente.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const companyData = {
        name: formData.name,
        domains: formData.domains.split(',').map(d => d.trim()).filter(d => d),
        keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
        greeting: formData.greeting,
        managerEmail: formData.managerEmail.toLowerCase().trim(),
        managerName: formData.managerName,
        managerAccessEnabled: formData.managerAccessEnabled,
      };

      if (editingCompany?.id) {
        await companyService.updateCompany(editingCompany.id, companyData);
        
        // Atualizar acesso do gestor se necessário
        if (formData.managerAccessEnabled && companyData.managerEmail) {
          await grantManagerAccess(companyData.managerEmail, editingCompany.id);
        } else if (!formData.managerAccessEnabled && companyData.managerEmail) {
          await revokeManagerAccess(companyData.managerEmail);
        }
      } else {
        const companyId = await companyService.createCompany(companyData);
        
        // Conceder acesso ao gestor se habilitado
        if (formData.managerAccessEnabled && companyData.managerEmail) {
          await grantManagerAccess(companyData.managerEmail, companyId);
        }
      }

      setIsDialogOpen(false);
      loadCompanies();
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Erro ao salvar empresa. Tente novamente.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciar Empresas</h2>
          <p className="text-muted-foreground">Configure empresas e seus gestores</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  <CardTitle>{company.name}</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(company)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  {company.id !== 'general' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => company.id && handleDelete(company.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {company.domains.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Domínios:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.domains.map((domain, idx) => (
                      <Badge key={idx} variant="secondary">@{domain}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {company.keywords.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Palavras-chave:</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {company.keywords.map((keyword, idx) => (
                      <Badge key={idx} variant="outline">{keyword}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {company.managerEmail && (
                <div>
                  <Label className="text-xs text-muted-foreground">Gestor:</Label>
                  <p className="text-sm">{company.managerName} ({company.managerEmail})</p>
                  {company.managerAccessEnabled && (
                    <Badge variant="success" className="mt-1">Acesso Habilitado</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {companies.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Nenhuma empresa cadastrada ainda.</p>
            <Button onClick={handleCreate} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeira Empresa
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
            </DialogTitle>
            <DialogDescription>
              Configure os dados da empresa e do gestor
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Fantasia *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ex: Prio, Yampi, Hapvida"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="domains">Domínios de Email</Label>
              <Input
                id="domains"
                value={formData.domains}
                onChange={(e) => setFormData({ ...formData, domains: e.target.value })}
                placeholder="Ex: prio, yampi (separados por vírgula)"
              />
              <p className="text-xs text-muted-foreground">
                Domínios de email que identificam esta empresa (ex: @prio.com → prio)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="keywords">Palavras-chave</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="Ex: yampi, hapvida (separadas por vírgula)"
              />
              <p className="text-xs text-muted-foreground">
                Palavras-chave que podem aparecer no email do usuário
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="greeting">Saudação Personalizada</Label>
              <textarea
                id="greeting"
                className="w-full min-h-[80px] px-3 py-2 border rounded-md"
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                placeholder="Olá! Como posso ajudar?"
              />
              <p className="text-xs text-muted-foreground">
                Saudação que o chatbot usará para esta empresa
              </p>
            </div>

            <div className="border-t pt-4 space-y-4">
              <h3 className="font-semibold">Gestor da Empresa</h3>
              
              <div className="space-y-2">
                <Label htmlFor="managerName">Nome do Gestor</Label>
                <Input
                  id="managerName"
                  value={formData.managerName}
                  onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
                  placeholder="Nome completo do gestor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="managerEmail">Email do Gestor</Label>
                <Input
                  id="managerEmail"
                  type="email"
                  value={formData.managerEmail}
                  onChange={(e) => setFormData({ ...formData, managerEmail: e.target.value })}
                  placeholder="gestor@empresa.com"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="managerAccessEnabled"
                  checked={formData.managerAccessEnabled}
                  onChange={(e) => setFormData({ ...formData, managerAccessEnabled: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="managerAccessEnabled" className="cursor-pointer">
                  Habilitar acesso do gestor ao dashboard
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">
                O gestor poderá visualizar e gerenciar tickets, FAQ e base de conhecimento da empresa
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingCompany ? 'Salvar Alterações' : 'Criar Empresa'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

