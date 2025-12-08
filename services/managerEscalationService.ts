import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ManagerEscalation,
  ManagerEscalationStatus,
  TicketPriority,
} from '../types';
import { supportService } from './supportService';
import { managerNotificationService } from './managerNotificationService';

const managerEscalationsCollection = collection(db, 'managerEscalations');

const timestampToMillis = (value?: Timestamp | number): number => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  try {
    return value.toDate().getTime();
  } catch {
    return Date.now();
  }
};

const escalationFromSnapshot = (snapshot: any): ManagerEscalation => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    companyId: data.companyId,
    orderNumber: data.orderNumber,
    orderId: data.orderId,
    priority: 'alta',
    status: data.status || 'aberto',
    subject: data.subject,
    description: data.description,
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
    createdBy: data.createdBy,
    managerEmail: data.managerEmail,
    ticketId: data.ticketId,
    lastAdminUpdateAt: data.lastAdminUpdateAt
      ? timestampToMillis(data.lastAdminUpdateAt)
      : undefined,
    lastAdminSummary: data.lastAdminSummary,
  };
};

export interface CreateManagerEscalationInput {
  companyId: string;
  orderNumber: string;
  orderId?: string;
  subject?: string;
  description: string;
  managerEmail: string;
  managerName?: string;
  priority?: TicketPriority;
}

export interface ListEscalationsOptions {
  companyId: string;
  status?: ManagerEscalationStatus | 'todos';
  search?: string;
  cursor?: number;
  pageSize?: number;
}

export const managerEscalationService = {
  createEscalation: async (
    payload: CreateManagerEscalationInput
  ): Promise<ManagerEscalation> => {
    const ticketSubject =
      payload.subject ||
      `Chamado prioritário do gestor • Pedido ${payload.orderNumber}`;

    // Criar ticket de suporte com prioridade alta
    const ticketId = await supportService.createTicket({
      subject: ticketSubject,
      description: payload.description,
      priority: payload.priority || 'alta',
      status: 'aberto',
      name: payload.managerName || 'Gestor',
      email: payload.managerEmail,
      orderNumber: payload.orderNumber,
      companyId: payload.companyId,
      source: 'manager',
    });

    const docRef = await addDoc(managerEscalationsCollection, {
      companyId: payload.companyId,
      orderNumber: payload.orderNumber,
      orderId: payload.orderId,
      subject: ticketSubject,
      description: payload.description,
      status: 'aberto',
      priority: 'alta',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: payload.managerName || payload.managerEmail,
      managerEmail: payload.managerEmail,
      ticketId,
    });

    // Vincular ticket com escalation
    await supportService.updateTicket(ticketId, {
      managerEscalationId: docRef.id,
    });

    await managerNotificationService.publish({
      companyId: payload.companyId,
      type: 'escalation_atualizada',
      title: 'Chamado enviado ao suporte',
      summary: `Pedido ${payload.orderNumber} foi escalado com prioridade máxima.`,
      escalationId: docRef.id,
      orderNumber: payload.orderNumber,
      status: 'aberto',
      metadata: {
        managerEmail: payload.managerEmail,
      },
    });

    const snapshot = await getDoc(docRef);
    return escalationFromSnapshot(snapshot);
  },

  getEscalation: async (escalationId: string): Promise<ManagerEscalation | null> => {
    const ref = doc(managerEscalationsCollection, escalationId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) return null;
    return escalationFromSnapshot(snapshot);
  },

  listEscalations: async (
    options: ListEscalationsOptions
  ): Promise<{ items: ManagerEscalation[]; nextCursor?: number }> => {
    const constraints: any[] = [
      where('companyId', '==', options.companyId),
      orderBy('createdAt', 'desc'),
      limit(options.pageSize ?? 20),
    ];

    if (options.status && options.status !== 'todos') {
      constraints.splice(1, 0, where('status', '==', options.status));
    }

    if (options.cursor) {
      constraints.push(startAfter(Timestamp.fromMillis(options.cursor)));
    }

    const q = query(managerEscalationsCollection, ...constraints);
    const snapshot = await getDocs(q);
    let items = snapshot.docs.map(escalationFromSnapshot);

    if (options.search) {
      const term = options.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.orderNumber?.toLowerCase().includes(term) ||
          item.subject?.toLowerCase().includes(term) ||
          item.description?.toLowerCase().includes(term)
      );
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1];
    const nextCursor = lastDoc?.data()?.createdAt
      ? timestampToMillis(lastDoc.data().createdAt)
      : undefined;

    return { items, nextCursor };
  },

  updateEscalationStatus: async (
    escalationId: string,
    status: ManagerEscalationStatus,
    adminSummary?: string
  ): Promise<void> => {
    const ref = doc(managerEscalationsCollection, escalationId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Escalação não encontrada');
    }

    const escalation = escalationFromSnapshot(snapshot);
    await updateDoc(ref, {
      status,
      lastAdminSummary: adminSummary,
      lastAdminUpdateAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await managerNotificationService.publish({
      companyId: escalation.companyId,
      type: 'escalation_atualizada',
      title: `Chamado atualizado • Pedido ${escalation.orderNumber}`,
      summary: adminSummary || `Status alterado para ${status}`,
      escalationId,
      orderNumber: escalation.orderNumber,
      status,
    });

    if (escalation.ticketId) {
      await supportService.updateTicket(escalation.ticketId, {
        status: status === 'resolvido' ? 'resolvido' : 'em_andamento',
      });
    }
  },
};

