import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  ManagerNotificationPreferences,
  ManagerProfile,
} from '../types';
import { companyService } from './companyService';
import { grantManagerAccess, revokeManagerAccess } from './authService';

const managerProfilesCollection = collection(db, 'managerProfiles');

const timestampToMillis = (value?: Timestamp | number): number => {
  if (!value) return Date.now();
  if (typeof value === 'number') return value;
  try {
    return value.toDate().getTime();
  } catch {
    return Date.now();
  }
};

const defaultPreferences = (): ManagerNotificationPreferences => ({
  newOrders: true,
  escalations: true,
  celebrationFeed: true,
  channels: ['in_app', 'email'],
});

const normalizeEmail = (value?: string | null): string => {
  if (!value) return '';
  return value.trim().toLowerCase();
};

const normalizeName = (value?: string | null): string => {
  if (!value) return '';
  return value.trim();
};

interface ManagerProfileUpdateResult {
  emailChanged: boolean;
  currentEmail: string;
  previousEmail?: string | null;
}

const profileFromSnapshot = (snapshot: any): ManagerProfile => {
  const data = snapshot.data() || {};
  return {
    id: snapshot.id,
    companyId: data.companyId || snapshot.id,
    name: data.name || '',
    email: data.email || '',
    notificationPreferences: {
      ...defaultPreferences(),
      ...(data.notificationPreferences || {}),
      channels:
        data.notificationPreferences?.channels?.length > 0
          ? data.notificationPreferences.channels
          : defaultPreferences().channels,
    },
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
    lastCelebrationSeenAt: data.lastCelebrationSeenAt
      ? timestampToMillis(data.lastCelebrationSeenAt)
      : undefined,
    timezone: data.timezone,
  };
};

export const managerProfileService = {
  getProfile: async (companyId: string): Promise<ManagerProfile> => {
    const profileRef = doc(managerProfilesCollection, companyId);
    const snapshot = await getDoc(profileRef);

    if (snapshot.exists()) {
      return profileFromSnapshot(snapshot);
    }

    // Criar perfil padrão baseado nos dados da empresa
    const company = await companyService.getCompany(companyId);
    const profile: ManagerProfile = {
      companyId,
      name: company?.managerName || company?.name || 'Gestor',
      email: company?.managerEmail || '',
      notificationPreferences: defaultPreferences(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(profileRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return profile;
  },

  upsertProfile: async (
    companyId: string,
    payload: Partial<Pick<ManagerProfile, 'name' | 'email' | 'timezone'>> & {
      notificationPreferences?: Partial<ManagerNotificationPreferences>;
    }
  ): Promise<ManagerProfileUpdateResult> => {
    const profileRef = doc(managerProfilesCollection, companyId);
    const snapshot = await getDoc(profileRef);
    const existingProfile = snapshot.exists() ? profileFromSnapshot(snapshot) : null;
    const basePreferences = existingProfile
      ? existingProfile.notificationPreferences
      : defaultPreferences();

    const normalizedName = normalizeName(payload.name ?? existingProfile?.name);
    const normalizedEmail = normalizeEmail(payload.email ?? existingProfile?.email);
    const normalizedTimezone = payload.timezone?.trim();

    const profileData: Record<string, any> = {
      companyId,
      name: normalizedName,
      email: normalizedEmail,
      notificationPreferences: {
        ...basePreferences,
        ...payload.notificationPreferences,
        channels:
          payload.notificationPreferences?.channels?.length === 0
            ? basePreferences.channels
            : payload.notificationPreferences?.channels || basePreferences.channels,
      },
      createdAt: snapshot.exists() ? undefined : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (payload.timezone !== undefined) {
      profileData.timezone = normalizedTimezone || null;
    }

    await setDoc(
      profileRef,
      profileData,
      { merge: true }
    );

    // Manter cadastro oficial da empresa sincronizado
    if (normalizedName || normalizedEmail) {
      try {
        await companyService.updateCompany(companyId, {
          managerName: normalizedName,
          managerEmail: normalizedEmail,
        });
      } catch (error) {
        console.error('[managerProfileService] Erro ao atualizar dados da company:', error);
      }
    }

    const previousEmail = normalizeEmail(existingProfile?.email);
    let emailChanged = false;

    const ensureManagerRole = async () => {
      if (!normalizedEmail) {
        return;
      }

      try {
        await grantManagerAccess(normalizedEmail, companyId);
      } catch (error) {
        console.error('[managerProfileService] Erro ao garantir acesso de gestor:', error);
        throw error;
      }
    };

    const revokePreviousRole = async () => {
      if (!previousEmail || previousEmail === normalizedEmail) {
        return;
      }
      try {
        await revokeManagerAccess(previousEmail);
      } catch (error) {
        console.error('[managerProfileService] Erro ao revogar acesso anterior do gestor:', error);
      }
    };

    if (normalizedEmail) {
      if (!previousEmail) {
        await ensureManagerRole();
      } else if (previousEmail !== normalizedEmail) {
        emailChanged = true;
        await ensureManagerRole();
        await revokePreviousRole();
      }
    }

    return {
      emailChanged,
      currentEmail: normalizedEmail,
      previousEmail: previousEmail || null,
    };
  },

  updateNotificationPreferences: async (
    companyId: string,
    preferences: Partial<ManagerNotificationPreferences>
  ): Promise<void> => {
    const profileRef = doc(managerProfilesCollection, companyId);
    await updateDoc(profileRef, {
      notificationPreferences: {
        ...defaultPreferences(),
        ...preferences,
      },
      updatedAt: serverTimestamp(),
    });
  },

  markCelebrationSeen: async (companyId: string): Promise<void> => {
    const profileRef = doc(managerProfilesCollection, companyId);
    await updateDoc(profileRef, {
      lastCelebrationSeenAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  listenToProfile: (
    companyId: string,
    handler: (profile: ManagerProfile | null) => void
  ): Unsubscribe => {
    const profileRef = doc(managerProfilesCollection, companyId);
    return onSnapshot(profileRef, (snapshot) => {
      if (!snapshot.exists()) {
        handler(null);
        return;
      }
      handler(profileFromSnapshot(snapshot));
    });
  },
};

