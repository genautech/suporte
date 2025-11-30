import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  QueryConstraint,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { NotificationItem } from '../types';

export type NotificationScope =
  | { role: 'admin' }
  | { role: 'manager'; companyId: string }
  | { role: 'user'; email: string };

export interface NotificationListenerOptions {
  scope: NotificationScope;
  limit?: number;
  onError?: (error: Error) => void;
}

const DEFAULT_LIMIT = 25;

const ticketsCollection = collection(db, 'tickets');
const conversationsCollection = collection(db, 'conversations');

const timestampToMillis = (value: Timestamp | number | undefined): number => {
  if (!value) {
    return Date.now();
  }
  if (typeof value === 'number') {
    return value;
  }
  try {
    return value.toDate().getTime();
  } catch {
    return Date.now();
  }
};

const getScopeConstraints = (
  scope: NotificationScope,
  field: 'companyId' | 'email' | 'userId'
): QueryConstraint[] => {
  if (scope.role === 'admin') {
    return [];
  }

  if (scope.role === 'manager' && field === 'companyId') {
    return [where('companyId', '==', scope.companyId)];
  }

  if (scope.role === 'user' && (field === 'email' || field === 'userId')) {
    const trimmed = scope.email.trim();
    const normalized = trimmed.toLowerCase();
    const candidates = Array.from(new Set([trimmed, normalized]));

    if (field === 'email') {
      if (candidates.length === 1) {
        return [where('email', '==', candidates[0])];
      }
      return [where('email', 'in', candidates)];
    }
    if (candidates.length === 1) {
      return [where('userId', '==', candidates[0])];
    }
    return [where('userId', 'in', candidates)];
  }

  return [];
};

const buildTicketNotification = (
  doc: QueryDocumentSnapshot<DocumentData>
): NotificationItem => {
  const data = doc.data() || {};
  const createdAt = timestampToMillis(data.updatedAt || data.createdAt);

  return {
    id: `ticket-${doc.id}`,
    type: 'ticket',
    entityId: doc.id,
    title: data.subject || 'Chamado de suporte',
    summary: data.description
      ? data.description.slice(0, 120)
      : `Status: ${data.status || 'aberto'}`,
    status: data.status,
    createdAt,
    customerName: data.name,
    customerEmail: data.email,
    meta: {
      priority: data.priority,
      orderNumber: data.orderNumber,
    },
  };
};

const buildConversationNotification = (
  doc: QueryDocumentSnapshot<DocumentData>
): NotificationItem => {
  const data = doc.data() || {};
  const lastMessage = Array.isArray(data.messages) ? data.messages[data.messages.length - 1] : null;
  const createdAt =
    lastMessage?.timestamp ||
    timestampToMillis(data.updatedAt || data.createdAt);

  return {
    id: `conversation-${doc.id}`,
    type: 'conversation',
    entityId: doc.id,
    title: data.userId || 'Nova conversa',
    summary: lastMessage?.text?.slice(0, 120) || 'Nova interação registrada.',
    status: data.resolved ? 'resolvido' : 'aberto',
    createdAt,
    customerEmail: data.userId,
    meta: {
      attempts: data.attempts,
      ticketId: data.ticketId,
      companyId: data.companyId || data.assignedCompanyId,
    },
  };
};

export const listenToTicketNotifications = (
  options: NotificationListenerOptions,
  handler: (notifications: NotificationItem[]) => void
): Unsubscribe => {
  const constraints: QueryConstraint[] = [
    ...getScopeConstraints(options.scope, 'email'),
    orderBy('updatedAt', 'desc'),
    limit(options.limit ?? DEFAULT_LIMIT),
  ];

  const q = query(ticketsCollection, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((doc) => buildTicketNotification(doc));
      handler(notifications);
    },
    (error) => {
      console.error('[notificationService] Ticket listener error:', error);
      options.onError?.(error);
    }
  );
};

export const listenToConversationNotifications = (
  options: NotificationListenerOptions,
  handler: (notifications: NotificationItem[]) => void
): Unsubscribe => {
  const constraints: QueryConstraint[] = [
    ...getScopeConstraints(options.scope, 'companyId'),
    orderBy('updatedAt', 'desc'),
    limit(options.limit ?? DEFAULT_LIMIT),
  ];

  // Usuários finais acompanham via userId
  if (options.scope.role === 'user') {
    constraints.splice(
      0,
      constraints.length,
      ...getScopeConstraints(options.scope, 'userId'),
      orderBy('updatedAt', 'desc'),
      limit(options.limit ?? DEFAULT_LIMIT)
    );
  }

  const q = query(conversationsCollection, ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs
        .filter((doc) => {
          const data = doc.data() || {};
          return !data.deleted;
        })
        .map((doc) => buildConversationNotification(doc));
      handler(notifications);
    },
    (error) => {
      console.error('[notificationService] Conversation listener error:', error);
      options.onError?.(error);
    }
  );
};

