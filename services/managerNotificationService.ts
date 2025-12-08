import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ManagerNotification,
  ManagerNotificationType,
} from '../types';

const managerNotificationsCollection = collection(db, 'managerNotifications');

const timestampToMillis = (value?: Timestamp | number): number => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  try {
    return value.toDate().getTime();
  } catch {
    return Date.now();
  }
};

const notificationFromSnapshot = (snapshot: any): ManagerNotification => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    companyId: data.companyId,
    type: data.type,
    title: data.title,
    summary: data.summary,
    createdAt: timestampToMillis(data.createdAt),
    orderNumber: data.orderNumber,
    orderId: data.orderId,
    escalationId: data.escalationId,
    status: data.status,
    readBy: data.readBy || [],
    metadata: data.metadata || {},
  };
};

export interface PublishManagerNotificationInput {
  companyId: string;
  type: ManagerNotificationType;
  title: string;
  summary: string;
  orderNumber?: string;
  orderId?: string;
  escalationId?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface FetchManagerNotificationOptions {
  companyId: string;
  cursor?: number;
  pageSize?: number;
}

export const managerNotificationService = {
  publish: async (payload: PublishManagerNotificationInput): Promise<void> => {
    await addDoc(managerNotificationsCollection, {
      ...payload,
      readBy: [],
      createdAt: serverTimestamp(),
    });
  },

  fetch: async (
    options: FetchManagerNotificationOptions
  ): Promise<{ items: ManagerNotification[]; nextCursor?: number }> => {
    const constraints: any[] = [
      where('companyId', '==', options.companyId),
      orderBy('createdAt', 'desc'),
      limit(options.pageSize ?? 40),
    ];

    if (options.cursor) {
      constraints.push(startAfter(Timestamp.fromMillis(options.cursor)));
    }

    const q = query(managerNotificationsCollection, ...constraints);
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(notificationFromSnapshot);
    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc?.data()?.createdAt
      ? timestampToMillis(lastDoc.data().createdAt)
      : undefined;

    return { items, nextCursor };
  },

  listen: (
    companyId: string,
    handler: (notifications: ManagerNotification[]) => void,
    pageSize: number = 40
  ): Unsubscribe => {
    const q = query(
      managerNotificationsCollection,
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    return onSnapshot(q, (snapshot) => {
      handler(snapshot.docs.map(notificationFromSnapshot));
    });
  },

  markAsRead: async (notificationId: string, managerEmail: string): Promise<void> => {
    await updateDoc(doc(managerNotificationsCollection, notificationId), {
      readBy: arrayUnion(managerEmail.toLowerCase()),
    });
  },
};

