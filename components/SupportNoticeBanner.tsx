import React, { useEffect, useMemo, useState } from 'react';
import DOMPurify from 'dompurify';
import { BellRing, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { supportNoticeService, SupportNoticeLocation } from '../services/supportNoticeService';
import { SupportNotice } from '../types';
import { cn } from '../lib/utils';
import { Button } from './ui/button';

interface SupportNoticeBannerProps {
  companyId?: string | null;
  location?: Exclude<SupportNoticeLocation, 'all'>;
  withNotificationShortcut?: boolean;
  className?: string;
  title?: string;
  description?: string;
}

export const SupportNoticeBanner: React.FC<SupportNoticeBannerProps> = ({
  companyId,
  location = 'support',
  withNotificationShortcut = false,
  className,
  title = 'Avisos importantes do suporte',
  description = 'Fique atento aos comunicados oficiais e orientações rápidas.',
}) => {
  const [notices, setNotices] = useState<SupportNotice[]>([]);
  const [expandedNoticeId, setExpandedNoticeId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const unsubscribe = supportNoticeService.listenActive(
      { companyId, location },
      (items) => setNotices(items)
    );
    return () => unsubscribe();
  }, [companyId, location]);

  const visibleNotices = useMemo(() => notices.slice(0, collapsed ? 0 : notices.length), [notices, collapsed]);

  if (!notices.length) {
    return null;
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-6 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-primary/10',
        className
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/20 p-3 text-primary shadow-inner">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              {notices.length === 1 ? '1 aviso disponível' : `${notices.length} avisos disponíveis`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed((prev) => !prev)}
            className="text-xs uppercase tracking-wide text-primary"
          >
            {collapsed ? (
              <>
                Reabrir <ChevronDown className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Recolher <ChevronUp className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
          {withNotificationShortcut && <NotificationBell buttonClassName="bg-background" />}
        </div>
      </div>

      {!collapsed && (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {visibleNotices.map((notice) => {
            const isExpanded = expandedNoticeId === notice.id;
            return (
              <article
                key={notice.id}
                className="rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Megaphone className="h-4 w-4" />
                    <h3 className="font-semibold text-base text-foreground">{notice.title}</h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary"
                    onClick={() =>
                      setExpandedNoticeId((prev) => (prev === notice.id ? null : notice.id))
                    }
                  >
                    {isExpanded ? (
                      <>
                        Menos <ChevronUp className="ml-1 h-3 w-3" />
                      </>
                    ) : (
                      <>
                        Detalhes <ChevronDown className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
                <div
                  className={cn(
                    'prose prose-sm mt-3 max-w-none text-muted-foreground',
                    !isExpanded && 'line-clamp-3'
                  )}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(notice.content || ''),
                  }}
                />
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {notice.showOnHome && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                      Página inicial
                    </span>
                  )}
                  {notice.showOnSupport && (
                    <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-secondary">
                      Área do cliente
                    </span>
                  )}
                  {notice.targetCompanyIds.length === 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-foreground/70">
                      Todas empresas
                    </span>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

