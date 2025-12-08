import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { supportNoticeService } from '../services/supportNoticeService';
import { SupportNotice, Company } from '../types';
import { companyService } from '../services/companyService';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { RichTextEditor } from './RichTextEditor';
import { cn } from '../lib/utils';
import { Plus, Edit, Trash2, CheckCircle2, XCircle } from 'lucide-react';

type NoticeFormState = {
  title: string;
  content: string;
  active: boolean;
  showOnHome: boolean;
  showOnSupport: boolean;
  targetCompanyIds: string[];
};

const DEFAULT_FORM_STATE: NoticeFormState = {
  title: '',
  content: '<p>Digite aqui o conteúdo do banner...</p>',
  active: true,
  showOnHome: true,
  showOnSupport: true,
  targetCompanyIds: [],
};

const sanitize = (value: string) => DOMPurify.sanitize(value || '');

export const AdminSupportNotices: React.FC = () => {
  const [notices, setNotices] = useState<SupportNotice[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [showOnlyActive, setShowOnlyActive] = useState<boolean>(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<NoticeFormState>(DEFAULT_FORM_STATE);
  const [editingNotice, setEditingNotice] = useState<SupportNotice | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = supportNoticeService.listen(undefined, (items) => setNotices(items));
    companyService.getAllCompanies().then(setCompanies);
    return () => unsubscribe();
  }, []);

  const filteredNotices = useMemo(() => {
    return notices.filter((notice) => {
      if (showOnlyActive && !notice.active) {
        return false;
      }
      if (filterCompany === 'all') {
        return true;
      }
      if (filterCompany === 'general') {
        return (
          notice.targetCompanyIds.length === 0 ||
          notice.targetCompanyIds.includes('general') ||
          notice.targetCompanyIds.includes('all')
        );
      }
      return (
        notice.targetCompanyIds.length === 0 ||
        notice.targetCompanyIds.includes(filterCompany) ||
        notice.targetCompanyIds.includes('general') ||
        notice.targetCompanyIds.includes('all')
      );
    });
  }, [notices, filterCompany, showOnlyActive]);

  const handleCreate = () => {
    setEditingNotice(null);
    setFormState(DEFAULT_FORM_STATE);
    setIsDialogOpen(true);
  };

  const handleEdit = (notice: SupportNotice) => {
    setEditingNotice(notice);
    setFormState({
      title: notice.title,
      content: notice.content,
      active: notice.active,
      showOnHome: notice.showOnHome,
      showOnSupport: notice.showOnSupport,
      targetCompanyIds: notice.targetCompanyIds ?? [],
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (notice: SupportNotice) => {
    const confirmed = window.confirm(
      `Deseja realmente remover o aviso "${notice.title}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    try {
      await supportNoticeService.remove(notice.id!);
    } catch (error) {
      console.error('[AdminSupportNotices] Erro ao remover aviso:', error);
      alert('Erro ao remover o aviso. Tente novamente.');
    }
  };

  const handleToggleActive = async (notice: SupportNotice) => {
    try {
      await supportNoticeService.toggleActive(notice.id!, !notice.active);
    } catch (error) {
      console.error('[AdminSupportNotices] Erro ao alterar status do aviso:', error);
      alert('Erro ao alterar status do aviso.');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.title.trim()) {
      alert('Informe um título para o aviso.');
      return;
    }
    if (!formState.content || sanitize(formState.content).trim() === '') {
      alert('Informe o conteúdo do aviso.');
      return;
    }
    if (!formState.showOnHome && !formState.showOnSupport) {
      alert('Selecione pelo menos um local para exibir o aviso.');
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...formState,
        targetCompanyIds: formState.targetCompanyIds,
      };
      if (editingNotice?.id) {
        await supportNoticeService.update(editingNotice.id, payload);
      } else {
        await supportNoticeService.create(payload);
      }
      setIsDialogOpen(false);
      setFormState(DEFAULT_FORM_STATE);
      setEditingNotice(null);
    } catch (error) {
      console.error('[AdminSupportNotices] Erro ao salvar aviso:', error);
      alert('Erro ao salvar o aviso. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompanySelection = (companyId: string) => {
    setFormState((prev) => {
      const alreadySelected = prev.targetCompanyIds.includes(companyId);
      return {
        ...prev,
        targetCompanyIds: alreadySelected
          ? prev.targetCompanyIds.filter((id) => id !== companyId)
          : [...prev.targetCompanyIds, companyId],
      };
    });
  };

  const applyToAllCompanies = formState.targetCompanyIds.length === 0;
  const companiesWithGeneral = [{ id: 'general', name: 'Aplicar para todas' }, ...companies];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Banners de Avisos</h2>
          <p className="text-muted-foreground">
            Configure avisos ricos que serão exibidos na página inicial e na área do cliente.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Novo aviso
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <label className="text-sm font-medium text-muted-foreground">Filtrar por empresa:</label>
            <select
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={filterCompany}
              onChange={(event) => setFilterCompany(event.target.value)}
            >
              <option value="all">Todas as empresas</option>
              <option value="general">Avisos gerais</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={showOnlyActive}
              onChange={(event) => setShowOnlyActive(event.target.checked)}
            />
            Mostrar apenas ativos
          </label>
        </CardContent>
      </Card>

      {filteredNotices.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="text-4xl">📣</div>
            <p className="text-muted-foreground">
              Nenhum aviso encontrado com os filtros atuais.
            </p>
            <Button variant="outline" onClick={handleCreate}>
              Criar primeiro aviso
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredNotices.map((notice) => (
            <Card key={notice.id}>
              <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-lg">{notice.title}</CardTitle>
                  <CardDescription className="text-xs uppercase tracking-wide">
                    Atualizado em {new Date(notice.updatedAt).toLocaleString('pt-BR')}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={notice.active ? 'success' : 'secondary'} className="flex items-center gap-1">
                    {notice.active ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Ativo
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3" /> Inativo
                      </>
                    )}
                  </Badge>
                  {notice.showOnHome && <Badge variant="info">Página inicial</Badge>}
                  {notice.showOnSupport && <Badge variant="outline">Área do cliente</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitize(notice.content) }}
                />
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {notice.targetCompanyIds.length === 0 && (
                    <Badge variant="secondary">Todas as empresas</Badge>
                  )}
                  {notice.targetCompanyIds.map((companyId) => {
                    if (companyId === 'general' || companyId === 'all') {
                      return (
                        <Badge key={companyId} variant="secondary">
                          Aviso geral
                        </Badge>
                      );
                    }
                    const company = companies.find((c) => c.id === companyId);
                    return (
                      <Badge key={companyId} variant="outline">
                        {company?.name || companyId}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(notice)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant={notice.active ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => handleToggleActive(notice)}
                  >
                    {notice.active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(notice)}>
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                    Remover
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingNotice ? 'Editar aviso' : 'Novo aviso'}</DialogTitle>
            <DialogDescription>
              Utilize conteúdo rico para comunicar atualizações na página inicial e na área do cliente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="notice-title">Título</Label>
              <Input
                id="notice-title"
                value={formState.title}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, title: event.target.value }))
                }
                required
                placeholder="Ex: Instabilidade no atendimento"
              />
            </div>

            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <RichTextEditor
                content={formState.content}
                onChange={(value) => setFormState((prev) => ({ ...prev, content: value }))}
                placeholder="Digite o conteúdo do banner..."
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border p-4">
                <Label className="text-sm font-semibold">Onde exibir?</Label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formState.showOnHome}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, showOnHome: event.target.checked }))
                    }
                  />
                  Página inicial (antes do login)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formState.showOnSupport}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, showOnSupport: event.target.checked }))
                    }
                  />
                  Área do cliente (após login)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formState.active}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, active: event.target.checked }))
                    }
                  />
                  Ativo
                </label>
              </div>
              <div className="space-y-2 rounded-lg border border-border p-4">
                <Label className="text-sm font-semibold">Empresas alvo</Label>
                <p className="text-xs text-muted-foreground">
                  Se nenhum cliente for selecionado, o aviso será exibido para todas as empresas.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {companiesWithGeneral.map((company) => {
                    const isSelected =
                      applyToAllCompanies && company.id === 'general'
                        ? true
                        : formState.targetCompanyIds.includes(company.id);
                    return (
                      <button
                        type="button"
                        key={company.id}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs transition',
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/60'
                        )}
                        onClick={() => {
                          if (company.id === 'general') {
                            setFormState((prev) => ({ ...prev, targetCompanyIds: [] }));
                          } else {
                            handleCompanySelection(company.id || '');
                          }
                        }}
                      >
                        {company.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : editingNotice ? 'Salvar alterações' : 'Criar aviso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};






