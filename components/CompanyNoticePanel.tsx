import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { SupportNotice } from '../types';
import { supportNoticeService } from '../services/supportNoticeService';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import { RichTextEditor } from './RichTextEditor';

interface CompanyNoticePanelProps {
  companyId?: string | null;
  companyName?: string;
}

const defaultForm = {
  title: '',
  content: '<p>Descreva o aviso direcionado para esta empresa...</p>',
  active: true,
  showOnHome: false,
  showOnSupport: true,
};

export const CompanyNoticePanel: React.FC<CompanyNoticePanelProps> = ({ companyId, companyName }) => {
  const [notices, setNotices] = useState<SupportNotice[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormState] = useState(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!companyId) {
      setNotices([]);
      return;
    }
    const unsubscribe = supportNoticeService.listen(
      { companyId, includeInactive: true, location: 'all' },
      (items) => setNotices(items)
    );
    return () => unsubscribe();
  }, [companyId]);

  const handleCreateNotice = async () => {
    if (!companyId) return;
    if (!formState.title.trim()) {
      alert('Informe um título para o aviso.');
      return;
    }
    setIsSaving(true);
    try {
      await supportNoticeService.create({
        ...formState,
        targetCompanyIds: [companyId],
      });
      setFormState(defaultForm);
      setIsFormOpen(false);
    } catch (error) {
      console.error('[CompanyNoticePanel] Erro ao criar aviso:', error);
      alert('Erro ao criar aviso para esta empresa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (notice: SupportNotice) => {
    if (!notice.id) return;
    try {
      await supportNoticeService.toggleActive(notice.id, !notice.active);
    } catch (error) {
      console.error('[CompanyNoticePanel] Erro ao alterar status:', error);
      alert('Erro ao alterar status do aviso.');
    }
  };

  if (!companyId) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Salve a empresa para liberar o cadastro de avisos específicos.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Avisos direcionados</p>
          <p className="text-xs text-muted-foreground">
            Configure comunicados exclusivos para {companyName || 'esta empresa'}.
          </p>
        </div>
        <Button size="sm" variant={isFormOpen ? 'secondary' : 'default'} onClick={() => setIsFormOpen((prev) => !prev)}>
          {isFormOpen ? 'Cancelar' : 'Novo aviso rápido'}
        </Button>
      </div>

      {isFormOpen && (
        <div className="space-y-4 rounded-md border border-primary/20 bg-primary/5 p-4" role="form" aria-label="Cadastro de aviso rápido">
          <div className="space-y-2">
            <Label htmlFor="company-notice-title">Título</Label>
            <input
              id="company-notice-title"
              type="text"
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
              value={formState.title}
              onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Conteúdo rico</Label>
            <RichTextEditor
              content={formState.content}
              onChange={(value) => setFormState((prev) => ({ ...prev, content: value }))}
              placeholder="Digite o conteúdo do aviso..."
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.showOnHome}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, showOnHome: event.target.checked }))
                }
              />
              Mostrar na página inicial
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formState.showOnSupport}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, showOnSupport: event.target.checked }))
                }
              />
              Mostrar na área do cliente
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={isSaving} onClick={handleCreateNotice}>
              {isSaving ? 'Salvando...' : 'Salvar aviso'}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {notices.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhum aviso criado para esta empresa ainda.
          </p>
        )}
        {notices.map((notice) => (
          <div key={notice.id} className="rounded-md border border-border/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{notice.title}</p>
                <p className="text-xs text-muted-foreground">
                  Atualizado em {new Date(notice.updatedAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={notice.active ? 'success' : 'secondary'}>
                  {notice.active ? 'Ativo' : 'Inativo'}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(notice)}
                >
                  {notice.active ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>
            <div
              className="prose prose-sm mt-2 max-w-none text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(notice.content || '') }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

