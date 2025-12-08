import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { SupportNotice } from '../types';

export type SupportNoticeLocation = 'home' | 'support' | 'all';

export interface SupportNoticeFilters {
  companyId?: string | null;
  location?: SupportNoticeLocation;
  includeInactive?: boolean;
}

const noticesCollection = collection(db, 'supportNotices');

const toMillis = (value: Timestamp | number | undefined): number => {
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

const normalizeTargets = (targets?: string[] | null): string[] => {
  if (!Array.isArray(targets)) {
    return [];
  }
  return targets.map((target) => target?.trim()).filter(Boolean) as string[];
};

const buildNotice = (snapshot: any): SupportNotice => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    title: data.title || 'Aviso',
    content: data.content || '',
    active: data.active !== false,
    showOnHome: data.showOnHome !== false,
    showOnSupport: data.showOnSupport !== false,
    targetCompanyIds: normalizeTargets(data.targetCompanyIds),
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    createdBy: data.createdBy || undefined,
    updatedBy: data.updatedBy || undefined,
  };
};

const matchesLocation = (notice: SupportNotice, location?: SupportNoticeLocation): boolean => {
  if (!location || location === 'all') {
    return true;
  }
  if (location === 'home') {
    return notice.showOnHome;
  }
  return notice.showOnSupport;
};

const matchesCompany = (notice: SupportNotice, companyId?: string | null): boolean => {
  const targets = notice.targetCompanyIds || [];
  if (!companyId || companyId === 'general') {
    return (
      targets.length === 0 ||
      targets.includes('general') ||
      targets.includes('all')
    );
  }
  return (
    targets.length === 0 ||
    targets.includes(companyId) ||
    targets.includes('general') ||
    targets.includes('all')
  );
};

const applyFilters = (notices: SupportNotice[], filters?: SupportNoticeFilters): SupportNotice[] => {
  if (!filters) {
    return notices;
  }
  return notices.filter((notice) => {
    if (!filters.includeInactive && !notice.active) {
      return false;
    }
    if (!matchesLocation(notice, filters.location)) {
      return false;
    }
    if (!matchesCompany(notice, filters.companyId)) {
      return false;
    }
    return true;
  });
};

const sortByUpdatedAt = (notices: SupportNotice[]) =>
  [...notices].sort((a, b) => b.updatedAt - a.updatedAt);

export const supportNoticeService = {
  listen(
    filters: SupportNoticeFilters | undefined,
    handler: (notices: SupportNotice[]) => void
  ) {
    return onSnapshot(noticesCollection, (snapshot) => {
      const notices = sortByUpdatedAt(snapshot.docs.map(buildNotice));
      handler(applyFilters(notices, filters));
    });
  },

  listenActive(
    filters: Omit<SupportNoticeFilters, 'includeInactive'>,
    handler: (notices: SupportNotice[]) => void
  ) {
    return this.listen({ ...filters, includeInactive: false }, handler);
  },

  async getAll(): Promise<SupportNotice[]> {
    const snapshot = await getDocs(noticesCollection);
    return sortByUpdatedAt(snapshot.docs.map(buildNotice));
  },

  async getById(id: string): Promise<SupportNotice | null> {
    const docRef = doc(db, 'supportNotices', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    return buildNotice(docSnap);
  },

  async create(
    data: Omit<SupportNotice, 'id' | 'createdAt' | 'updatedAt'> & {
      createdBy?: string | null;
      updatedBy?: string | null;
    }
  ): Promise<string> {
    const payload = {
      title: data.title,
      content: data.content,
      active: data.active ?? true,
      showOnHome: data.showOnHome ?? false,
      showOnSupport: data.showOnSupport ?? true,
      targetCompanyIds: normalizeTargets(data.targetCompanyIds),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: data.createdBy || null,
      updatedBy: data.updatedBy || null,
    };
    const docRef = await addDoc(noticesCollection, payload);
    return docRef.id;
  },

  async update(
    id: string,
    data: Partial<Omit<SupportNotice, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    const docRef = doc(db, 'supportNotices', id);
    await updateDoc(docRef, {
      ...data,
      targetCompanyIds: data.targetCompanyIds ? normalizeTargets(data.targetCompanyIds) : undefined,
      updatedAt: serverTimestamp(),
    });
  },

  async toggleActive(id: string, active: boolean): Promise<void> {
    return this.update(id, { active });
  },

  async remove(id: string): Promise<void> {
    const docRef = doc(db, 'supportNotices', id);
    await deleteDoc(docRef);
  },
};






