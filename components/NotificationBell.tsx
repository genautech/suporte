import React from 'react';
import { Bell, BellOff, CheckCheck, Volume2, VolumeX } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useNotificationCenter, NotificationWithState } from './NotificationCenterProvider';
import { NotificationItem } from '../types';
import { cn } from '../lib/utils';

interface NotificationBellProps {
  onSelect?: (notification: NotificationItem) => void;
  buttonClassName?: string;
}

const relativeTime = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes <= 0) return 'agora';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onSelect,
  buttonClassName,
}) => {
  const { notifications, unreadCount, muted, markAsRead, markAllAsRead, toggleMute } =
    useNotificationCenter();
  const [open, setOpen] = React.useState(false);

  const handleSelect = (notification: NotificationItem) => {
    markAsRead(notification.id);
    onSelect?.(notification);
    setOpen(false);
  };

  const renderNotification = (notification: NotificationWithState) => (
    <button
      key={notification.id}
      onClick={() => handleSelect(notification)}
      className={cn(
        'w-full text-left px-4 py-3 transition-colors border-b border-border/40',
        !notification.isRead ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-muted/60'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-sm text-foreground line-clamp-1">
            {notification.title}
          </span>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {notification.summary}
          </p>
        </div>
        <span className="text-[10px] uppercase text-muted-foreground">
          {relativeTime(notification.createdAt)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        {(() => {
          const isManagerNotification = notification.type === 'manager';
          const badgeLabel = isManagerNotification
            ? notification.meta?.category === 'novo_pedido'
              ? 'Novo pedido'
              : 'Atualização'
            : notification.status;
          if (!badgeLabel) {
            return null;
          }
          return (
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {badgeLabel}
            </Badge>
          );
        })()}
        {!notification.isRead && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary">
            • Novo
          </span>
        )}
      </div>
    </button>
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'relative inline-flex items-center justify-center rounded-full border border-border bg-background/80 p-2 text-foreground hover:bg-muted transition',
            buttonClassName
          )}
          aria-label="Notificações"
        >
          {muted ? <BellOff className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/40">
          <div>
            <p className="text-sm font-semibold text-foreground">Notificações</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} novas atualizações`
                : 'Você está em dia 🎉'}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Marcar
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggleMute}
              aria-label={muted ? 'Ativar som' : 'Silenciar som'}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nada por aqui ainda. Assim que novos chamados ou conversas chegarem, você verá
              por aqui. 😊
            </div>
          ) : (
            notifications.map(renderNotification)
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

