import React from 'react';
import { NotificationItem } from '../types';
import { NotificationBell } from './NotificationBell';
import { cn } from '../lib/utils';

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  leading?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onNotificationSelect?: (notification: NotificationItem) => void;
  showNotifications?: boolean;
  sticky?: boolean;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  subtitle,
  leading,
  actions,
  children,
  className,
  onNotificationSelect,
  showNotifications = true,
  sticky = true,
}) => {
  return (
    <header
      className={cn(
        'w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        sticky && 'sticky top-0 z-30',
        className
      )}
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-8">
        <div className="flex items-center gap-3">
          {leading}
          <div>
            {title && (
              <h1 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h1>
            )}
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {showNotifications && <NotificationBell onSelect={onNotificationSelect} />}
          {children}
        </div>
      </div>
    </header>
  );
};







