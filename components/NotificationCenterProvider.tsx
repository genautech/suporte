import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { NotificationItem, ManagerNotification } from '../types';
import {
  listenToConversationNotifications,
  listenToTicketNotifications,
  NotificationScope,
} from '../services/notificationService';
import { useToast } from './ui/use-toast';
import { managerNotificationService } from '../services/managerNotificationService';

type SeenMap = Record<string, number>;

export interface NotificationWithState extends NotificationItem {
  isRead: boolean;
}

interface NotificationCenterContextValue {
  notifications: NotificationWithState[];
  unreadCount: number;
  muted: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  toggleMute: () => void;
}

const NotificationCenterContext = createContext<NotificationCenterContextValue | undefined>(
  undefined
);

interface NotificationCenterProviderProps {
  scope: NotificationScope | null;
  children: React.ReactNode;
}

const getScopeKey = (scope: NotificationScope | null): string | null => {
  if (!scope) return null;
  if (scope.role === 'admin') return 'admin';
  if (scope.role === 'manager') return `manager_${scope.companyId}`;
  return `user_${scope.email.toLowerCase()}`;
};

export const NotificationCenterProvider: React.FC<NotificationCenterProviderProps> = ({
  scope,
  children,
}) => {
  const [rawNotifications, setRawNotifications] = useState<NotificationItem[]>([]);
  const [seenMap, setSeenMap] = useState<SeenMap>({});
  const [muted, setMuted] = useState(false);
  const scopeKey = useMemo(() => getScopeKey(scope), [scope]);
  const { toast } = useToast();

  const ticketRef = useRef<NotificationItem[]>([]);
  const conversationRef = useRef<NotificationItem[]>([]);
  const managerRef = useRef<NotificationItem[]>([]);
  const bootstrappedRef = useRef(false);
  const lastNotifiedAtRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Carregar preferências de mute/vistos ao trocar de escopo
  useEffect(() => {
    if (!scopeKey) {
      setSeenMap({});
      setMuted(false);
      return;
    }

    try {
      const storedSeen = localStorage.getItem(`notification_seen_${scopeKey}`);
      setSeenMap(storedSeen ? JSON.parse(storedSeen) : {});
    } catch {
      setSeenMap({});
    }

    try {
      const storedMuted = localStorage.getItem(`notification_muted_${scopeKey}`);
      setMuted(storedMuted === 'true');
    } catch {
      setMuted(false);
    }
  }, [scopeKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio('/sounds/notification.wav');
    audio.volume = 0.35;
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
    };
  }, []);

  const mergeNotifications = useCallback(
    (limit: number = 40) => {
      const baseNotifications =
        scope?.role === 'manager'
          ? [...managerRef.current]
          : [...ticketRef.current, ...conversationRef.current];
      const merged = baseNotifications
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit);
      setRawNotifications(merged);
    },
    [scope?.role]
  );

  const transformManagerNotification = (notification: ManagerNotification): NotificationItem => ({
    id: notification.id,
    type: 'manager',
    entityId: notification.orderNumber || notification.escalationId || notification.id,
    title: notification.title,
    summary: notification.summary,
    status: notification.status,
    createdAt: notification.createdAt,
    customerName: notification.metadata?.customerName,
    customerEmail: notification.metadata?.customerEmail,
    meta: {
      ...notification.metadata,
      category: notification.type,
      orderNumber: notification.orderNumber,
      escalationId: notification.escalationId,
    },
  });

  useEffect(() => {
    if (!scope) {
      ticketRef.current = [];
      conversationRef.current = [];
      managerRef.current = [];
      setRawNotifications([]);
      return;
    }

    bootstrappedRef.current = false;
    lastNotifiedAtRef.current = 0;

    if (scope.role === 'manager') {
      const unsubscribe = managerNotificationService.listen(scope.companyId, (items) => {
        managerRef.current = items.map(transformManagerNotification);
        mergeNotifications();
      });

      return () => {
        managerRef.current = [];
        unsubscribe();
      };
    }

    const unsubscribes = [
      listenToTicketNotifications(
        { scope, limit: 40 },
        (items) => {
          ticketRef.current = items;
          mergeNotifications();
        }
      ),
      listenToConversationNotifications(
        { scope, limit: 40 },
        (items) => {
          conversationRef.current = items;
          mergeNotifications();
        }
      ),
    ];

    return () => {
      unsubscribes.forEach((unsub) => unsub());
      ticketRef.current = [];
      conversationRef.current = [];
      managerRef.current = [];
    };
  }, [scope, mergeNotifications]);

  const persistSeen = useCallback(
    (next: SeenMap) => {
      if (!scopeKey) return;
      setSeenMap(next);
      try {
        localStorage.setItem(`notification_seen_${scopeKey}`, JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [scopeKey]
  );

  const markAsRead = useCallback(
    (id: string) => {
      if (!scopeKey) return;
      persistSeen({
        ...seenMap,
        [id]: Date.now(),
      });
    },
    [persistSeen, scopeKey, seenMap]
  );

  const markAllAsRead = useCallback(() => {
    if (!scopeKey || rawNotifications.length === 0) return;
    const next: SeenMap = { ...seenMap };
    const timestamp = Date.now();
    rawNotifications.forEach((notification) => {
      next[notification.id] = timestamp;
    });
    persistSeen(next);
  }, [persistSeen, rawNotifications, scopeKey, seenMap]);

  const toggleMute = useCallback(() => {
    if (!scopeKey) return;
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(`notification_muted_${scopeKey}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [scopeKey]);

  const isNotificationRead = useCallback(
    (notification: NotificationItem) => {
      const seenAt = seenMap[notification.id];
      return typeof seenAt === 'number' && seenAt >= notification.createdAt;
    },
    [seenMap]
  );

  const notifications = useMemo<NotificationWithState[]>(
    () =>
      rawNotifications.map((notification) => ({
        ...notification,
        isRead: isNotificationRead(notification),
      })),
    [rawNotifications, isNotificationRead]
  );

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  // Toast + áudio para novas notificações
  useEffect(() => {
    if (!scope || rawNotifications.length === 0) {
      return;
    }

    if (!bootstrappedRef.current) {
      bootstrappedRef.current = true;
      lastNotifiedAtRef.current = rawNotifications[0]?.createdAt ?? Date.now();
      return;
    }

    const freshNotifications = rawNotifications
      .filter((notification) => {
        return (
          notification.createdAt > lastNotifiedAtRef.current && !isNotificationRead(notification)
        );
      })
      .sort((a, b) => a.createdAt - b.createdAt);

    if (freshNotifications.length === 0) {
      return;
    }

    freshNotifications.forEach((notification) => {
      lastNotifiedAtRef.current = Math.max(
        notification.createdAt,
        lastNotifiedAtRef.current
      );
      const toastTitle =
        notification.type === 'ticket'
          ? 'Novo chamado'
          : notification.type === 'conversation'
            ? 'Nova interação'
            : 'Atualização do gestor';
      toast({
        title: toastTitle,
        description: notification.summary,
        duration: 4000,
      });

      if (!muted && audioRef.current) {
        try {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => undefined);
        } catch {
          // ignore playback errors
        }
      }
    });
  }, [muted, rawNotifications, scope, isNotificationRead, toast]);

  const value = useMemo<NotificationCenterContextValue>(
    () => ({
      notifications,
      unreadCount,
      muted,
      markAsRead,
      markAllAsRead,
      toggleMute,
    }),
    [notifications, unreadCount, muted, markAsRead, markAllAsRead, toggleMute]
  );

  return (
    <NotificationCenterContext.Provider value={value}>
      {children}
    </NotificationCenterContext.Provider>
  );
};

export const useNotificationCenter = (): NotificationCenterContextValue => {
  const context = useContext(NotificationCenterContext);
  if (!context) {
    throw new Error('useNotificationCenter deve ser usado dentro de NotificationCenterProvider');
  }
  return context;
};

