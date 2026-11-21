import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import type {
  AppSettingsRecord,
  AuditLogRecord,
  CategoryRecord,
  FeaturedProgrammeRecord,
  FirestoreProgrammeRecord,
  NotificationRecord,
  ProgrammeItem,
} from '../types.ts';
import {
  auth,
  BLUEPRINT_LIMITS,
  db,
  handleFirestoreError,
  OperationType,
  OWNER_ADMIN_EMAILS,
} from './firebase.ts';

export const DEFAULT_APP_SETTINGS: AppSettingsRecord = {
  stationName: 'HILL MOBILE',
  channelHandle: '@samiwabasriugandatrueislam688',
  aboutTitle: 'Authentic Knowledge, Live & On Demand',
  aboutBody:
    'HILL MOBILE is the official free streaming companion for live broadcasts and recorded educational programmes from the @samiwabasriugandatrueislam688 YouTube channel. Built for effortless access on Android phones, iPhones, tablets, and desktop browsers, HILL MOBILE keeps every lecture, reminder, and community broadcast freely accessible with zero subscriptions and zero fees.',
  missionStatement:
    'Delivering clear, uninterrupted access to live broadcasts and curated recorded programmes for viewers everywhere — completely free.',
  contactEmail: 'contact@hillmobile.org',
  contactPhone: '',
  contactLocation: 'Kampala, Uganda',
};

function sanitizeStr(input: string, max: number): string {
  return input.trim().slice(0, max);
}

function makeSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, BLUEPRINT_LIMITS.categorySlugMax);
  return slug.length >= 2 ? slug : `cat-${Date.now().toString(36)}`;
}

function assertVerifiedAdmin(): { uid: string; email: string } {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !user.email) {
    throw new Error('Administrator sign-in with a verified email is required.');
  }
  return { uid: user.uid, email: user.email };
}

export async function checkIsAdmin(uid: string, email?: string | null): Promise<boolean> {
  if (email && OWNER_ADMIN_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  const path = `administrators/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'administrators', uid));
    return snap.exists();
  } catch (err) {
    // Expected permission denial for non-admin viewers; don't crash viewer UX
    if (err instanceof Error && err.message.toLowerCase().includes('permission')) {
      return false;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function fetchPublicAppSettings(): Promise<AppSettingsRecord> {
  const path = 'app_settings/public';
  try {
    const snap = await getDoc(doc(db, 'app_settings', 'public'));
    if (!snap.exists()) return DEFAULT_APP_SETTINGS;
    return { ...DEFAULT_APP_SETTINGS, ...(snap.data() as Partial<AppSettingsRecord>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function savePublicAppSettings(
  settings: Omit<AppSettingsRecord, 'updatedByUid' | 'updatedAt'>
): Promise<void> {
  const admin = assertVerifiedAdmin();
  const path = 'app_settings/public';
  const payload = {
    stationName: sanitizeStr(settings.stationName || 'HILL MOBILE', BLUEPRINT_LIMITS.stationNameMax),
    channelHandle: sanitizeStr(
      settings.channelHandle || '@samiwabasriugandatrueislam688',
      BLUEPRINT_LIMITS.stationNameMax
    ),
    aboutTitle: sanitizeStr(settings.aboutTitle, BLUEPRINT_LIMITS.aboutTitleMax),
    aboutBody: sanitizeStr(settings.aboutBody, BLUEPRINT_LIMITS.aboutBodyMax),
    missionStatement: sanitizeStr(settings.missionStatement, BLUEPRINT_LIMITS.missionMax),
    contactEmail: sanitizeStr(settings.contactEmail, BLUEPRINT_LIMITS.emailMax),
    contactPhone: sanitizeStr(settings.contactPhone, BLUEPRINT_LIMITS.phoneMax),
    contactLocation: sanitizeStr(settings.contactLocation, BLUEPRINT_LIMITS.locationMax),
    updatedByUid: admin.uid,
    updatedAt: serverTimestamp(),
  };

  try {
    const existing = await getDoc(doc(db, 'app_settings', 'public'));
    if (existing.exists()) {
      await updateDoc(doc(db, 'app_settings', 'public'), payload);
    } else {
      await setDoc(doc(db, 'app_settings', 'public'), payload);
    }
    await writeAuditLog({
      action: 'UPDATE_APP_SETTINGS',
      targetType: 'app_settings',
      targetId: 'public',
      details: `Updated station info and contact details (${payload.stationName}).`,
      status: 'success',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchCategories(): Promise<CategoryRecord[]> {
  const path = 'categories';
  try {
    const q = query(collection(db, 'categories'), orderBy('sortOrder', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CategoryRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createCategory(input: {
  name: string;
  description: string;
  sortOrder?: number;
}): Promise<CategoryRecord> {
  const admin = assertVerifiedAdmin();
  const cleanName = sanitizeStr(input.name, BLUEPRINT_LIMITS.categoryNameMax);
  if (cleanName.length < 2) {
    throw new Error('Category name must be at least 2 characters.');
  }
  const slug = makeSlug(cleanName);
  const id = slug;
  const path = `categories/${id}`;

  const record = {
    id,
    name: cleanName,
    slug,
    description: sanitizeStr(input.description, BLUEPRINT_LIMITS.categoryDescMax),
    sortOrder: Math.max(0, Math.min(10000, Math.floor(input.sortOrder ?? 10))),
    createdByUid: admin.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'categories', id), record);
    await writeAuditLog({
      action: 'CREATE_CATEGORY',
      targetType: 'category',
      targetId: id,
      details: `Created category "${cleanName}".`,
      status: 'success',
    });
    return record as unknown as CategoryRecord;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  assertVerifiedAdmin();
  const path = `categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
    await writeAuditLog({
      action: 'DELETE_CATEGORY',
      targetType: 'category',
      targetId: categoryId,
      details: `Deleted category ${categoryId}.`,
      status: 'warning',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function fetchSyncedProgrammes(): Promise<FirestoreProgrammeRecord[]> {
  const path = 'programmes';
  try {
    const q = query(collection(db, 'programmes'), orderBy('publishedAt', 'desc'), limit(200));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FirestoreProgrammeRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function assignProgrammeCategory(
  programme: ProgrammeItem,
  category: CategoryRecord | null
): Promise<void> {
  const admin = assertVerifiedAdmin();
  const path = `programmes/${programme.videoId}`;
  const docRef = doc(db, 'programmes', programme.videoId);

  try {
    const existing = await getDoc(docRef);
    const categoryId = category?.id || '';
    const categoryName = category?.name || '';

    const safeThumbnail =
      sanitizeStr(programme.thumbnailUrl, BLUEPRINT_LIMITS.thumbnailUrlMax) ||
      `https://i.ytimg.com/vi/${programme.videoId}/hqdefault.jpg`;

    if (existing.exists()) {
      await updateDoc(docRef, {
        title: sanitizeStr(programme.title, BLUEPRINT_LIMITS.programmeTitleMax),
        description: sanitizeStr(programme.description, BLUEPRINT_LIMITS.programmeDescMax),
        thumbnailUrl: safeThumbnail,
        publishedAt: sanitizeStr(programme.publishedAt || new Date().toISOString(), 64),
        categoryId,
        categoryName,
        isAvailable: programme.isAvailable,
        updatedByUid: admin.uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        videoId: programme.videoId,
        title: sanitizeStr(programme.title, BLUEPRINT_LIMITS.programmeTitleMax),
        description: sanitizeStr(programme.description, BLUEPRINT_LIMITS.programmeDescMax),
        thumbnailUrl: safeThumbnail,
        publishedAt: sanitizeStr(programme.publishedAt || new Date().toISOString(), 64),
        categoryId,
        categoryName,
        isFeatured: false,
        isAvailable: programme.isAvailable,
        updatedByUid: admin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await writeAuditLog({
      action: 'ASSIGN_PROGRAMME_CATEGORY',
      targetType: 'programme',
      targetId: programme.videoId,
      details: category
        ? `Assigned "${programme.title.slice(0, 60)}" to category "${category.name}".`
        : `Cleared category for "${programme.title.slice(0, 60)}".`,
      status: 'success',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchFeaturedProgrammes(): Promise<FeaturedProgrammeRecord[]> {
  const path = 'featured_programmes';
  try {
    const q = query(collection(db, 'featured_programmes'), orderBy('sortOrder', 'asc'), limit(24));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FeaturedProgrammeRecord);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function setProgrammeFeatured(
  programme: ProgrammeItem,
  featured: boolean,
  note = ''
): Promise<void> {
  const admin = assertVerifiedAdmin();
  const featPath = `featured_programmes/${programme.videoId}`;
  const progPath = `programmes/${programme.videoId}`;

  const safeThumbnail =
    sanitizeStr(programme.thumbnailUrl, BLUEPRINT_LIMITS.thumbnailUrlMax) ||
    `https://i.ytimg.com/vi/${programme.videoId}/hqdefault.jpg`;

  try {
    if (featured) {
      const existing = await getDoc(doc(db, 'featured_programmes', programme.videoId));
      const payload = {
        videoId: programme.videoId,
        title: sanitizeStr(programme.title, BLUEPRINT_LIMITS.programmeTitleMax),
        thumbnailUrl: safeThumbnail,
        publishedAt: sanitizeStr(programme.publishedAt || new Date().toISOString(), 64),
        categoryName: sanitizeStr(programme.categoryName || 'Featured', BLUEPRINT_LIMITS.categoryNameMax),
        note: sanitizeStr(note, BLUEPRINT_LIMITS.featuredNoteMax),
        sortOrder: 1,
        updatedByUid: admin.uid,
        updatedAt: serverTimestamp(),
      };
      if (existing.exists()) {
        await updateDoc(doc(db, 'featured_programmes', programme.videoId), payload);
      } else {
        await setDoc(doc(db, 'featured_programmes', programme.videoId), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } else {
      await deleteDoc(doc(db, 'featured_programmes', programme.videoId));
    }

    // Keep programmes collection synchronized if record exists
    const progSnap = await getDoc(doc(db, 'programmes', programme.videoId));
    if (progSnap.exists()) {
      await updateDoc(doc(db, 'programmes', programme.videoId), {
        isFeatured: featured,
        updatedByUid: admin.uid,
        updatedAt: serverTimestamp(),
      });
    } else if (featured) {
      await setDoc(doc(db, 'programmes', programme.videoId), {
        videoId: programme.videoId,
        title: sanitizeStr(programme.title, BLUEPRINT_LIMITS.programmeTitleMax),
        description: sanitizeStr(programme.description, BLUEPRINT_LIMITS.programmeDescMax),
        thumbnailUrl: safeThumbnail,
        publishedAt: sanitizeStr(programme.publishedAt || new Date().toISOString(), 64),
        categoryId: programme.categoryId || '',
        categoryName: programme.categoryName || '',
        isFeatured: true,
        isAvailable: programme.isAvailable,
        updatedByUid: admin.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await writeAuditLog({
      action: featured ? 'FEATURE_PROGRAMME' : 'UNFEATURE_PROGRAMME',
      targetType: 'featured_programme',
      targetId: programme.videoId,
      details: `${featured ? 'Featured' : 'Removed from featured'}: ${programme.title.slice(0, 80)}`,
      status: 'success',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${featPath} / ${progPath}`);
  }
}

export async function fetchNotificationsFeed(): Promise<NotificationRecord[]> {
  const path = 'notifications';
  try {
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(40));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<NotificationRecord, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function createNotificationRecord(input: {
  type: 'live' | 'announcement';
  title: string;
  body: string;
  videoId?: string;
}): Promise<void> {
  const admin = assertVerifiedAdmin();
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `notifications/${id}`;
  try {
    await setDoc(doc(db, 'notifications', id), {
      type: input.type,
      title: sanitizeStr(input.title, BLUEPRINT_LIMITS.notificationTitleMax),
      body: sanitizeStr(input.body, BLUEPRINT_LIMITS.notificationBodyMax),
      videoId: sanitizeStr(input.videoId || '', 32),
      sentByUid: admin.uid,
      createdAt: serverTimestamp(),
    });
    await writeAuditLog({
      action: 'CREATE_NOTIFICATION',
      targetType: 'notification',
      targetId: id,
      details: `Published ${input.type} alert: ${input.title.slice(0, 80)}`,
      status: 'success',
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteNotificationRecord(id: string): Promise<void> {
  assertVerifiedAdmin();
  const path = `notifications/${id}`;
  try {
    await deleteDoc(doc(db, 'notifications', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function writeAuditLog(input: {
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified || !user.email) return;
  const id = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `audit_logs/${id}`;
  try {
    await setDoc(doc(db, 'audit_logs', id), {
      action: sanitizeStr(input.action, 80),
      actorUid: user.uid,
      actorEmail: sanitizeStr(user.email, BLUEPRINT_LIMITS.emailMax),
      targetType: sanitizeStr(input.targetType, 60),
      targetId: sanitizeStr(input.targetId, 128),
      details: sanitizeStr(input.details, BLUEPRINT_LIMITS.auditDetailsMax),
      status: input.status,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function fetchAuditLogs(): Promise<AuditLogRecord[]> {
  assertVerifiedAdmin();
  const path = 'audit_logs';
  try {
    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AuditLogRecord, 'id'>) }));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}
