import { db } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { CubboOrder } from '../types';

const companyCacheCollection = collection(db, 'companyOrdersCache');
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_CACHED_ORDERS = 50;

interface CompanyCacheDoc {
  orders: CubboOrder[];
  expiresAt: number;
  updatedAt?: Date;
  meta?: {
    source?: 'cache' | 'remote';
  };
}

const sanitizeOrdersForCache = (orders: CubboOrder[]): CubboOrder[] => {
  return orders.slice(0, MAX_CACHED_ORDERS).map((order) => {
    try {
      return JSON.parse(JSON.stringify(order));
    } catch {
      return {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        customer_email: order.customer_email,
        shipping_email: order.shipping_email,
        customer_name: order.customer_name,
        items_summary: order.items_summary,
        total_amount: order.total_amount,
        currency: order.currency,
        shipping_information: order.shipping_information,
      } as CubboOrder;
    }
  });
};

export const orderCacheService = {
  async getCompanyCache(companyId: string): Promise<{ orders: CubboOrder[]; expiresAt: number } | null> {
    try {
      const docRef = doc(companyCacheCollection, companyId);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        return null;
      }
      const data = snapshot.data() as CompanyCacheDoc;
      if (!data.orders || !Array.isArray(data.orders)) {
        return null;
      }
      return {
        orders: data.orders,
        expiresAt: data.expiresAt || 0,
      };
    } catch (error) {
      console.error('[orderCacheService] Erro ao ler cache da empresa:', error);
      return null;
    }
  },

  async setCompanyCache(
    companyId: string,
    orders: CubboOrder[],
    ttlMs: number = DEFAULT_TTL_MS
  ): Promise<void> {
    try {
      const docRef = doc(companyCacheCollection, companyId);
      await setDoc(
        docRef,
        {
          orders: sanitizeOrdersForCache(orders),
          updatedAt: serverTimestamp(),
          expiresAt: Date.now() + ttlMs,
          meta: {
            source: 'remote',
          },
        },
        { merge: true }
      );
    } catch (error) {
      console.error('[orderCacheService] Erro ao salvar cache da empresa:', error);
    }
  },
};







