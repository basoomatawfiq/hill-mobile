import React, { useEffect, useState } from 'react';
import { signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FolderPlus,
  LogOut,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trash2,
} from 'lucide-react';
import { adminFetchStatus, adminSendPushBroadcast, adminTriggerSync } from '../lib/api.ts';
import { auth, googleProvider } from '../lib/firebase.ts';
import {
  assignProgrammeCategory,
  createCategory,
  createNotificationRecord,
  deleteCategory,
  fetchAuditLogs,
  savePublicAppSettings,
  setProgrammeFeatured,
} from '../lib/firestoreService.ts';
import type {
  AppSettingsRecord,
  AuditLogRecord,
  CategoryRecord,
  FeaturedProgrammeRecord,
  LiveStatusResponse,
  ProgrammeItem,
  ScreenRoute,
  ServerStatusResponse,
} from '../types.ts';

export const AdminLoginScreen: React.FC<{
  user: User | null;
  isAdmin: boolean;
  checkingAdmin: boolean;
  onNavigate: (route: ScreenRoute) => void;
}> = ({ user, isAdmin, checkingAdmin, onNavigate }) => {
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSigningIn(false);
    }
  };

  if (user && isAdmin) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="rounded-2xl border border-emerald-500/30 bg-[#1C0D1B] p-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
          <h1 className="font-display text-xl font-bold text-[#FAF7FA]">
            Administrator Verified
          </h1>
          <p className="text-sm text-[#C4B0C2]">Signed in as {user.email}</p>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="w-full rounded-xl bg-[#7A0F6D] py-3 text-sm font-semibold text-white hover:bg-[#941684] cursor-pointer"
          >
            Enter Administration Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#7A0F6D]/20 text-[#EA6C20]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-[#FAF7FA]">
              Administrator Login
            </h1>
            <p className="text-xs text-[#C4B0C2]">
              Restricted to authorized HILL MOBILE administrators
            </p>
          </div>
        </div>

        <p className="text-sm text-[#C4B0C2] leading-relaxed">
          Public viewers never need an account to watch live or recorded programmes. Sign in with an authorized Google account to manage categories, featured programmes, and station alerts.
        </p>

        {user && !checkingAdmin && !isAdmin && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/30 p-4 text-xs text-red-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>Access Denied</span>
            </div>
            <p>
              The account <strong>{user.email}</strong> is not authorized as a HILL MOBILE administrator.
            </p>
            <button
              type="button"
              onClick={() => void signOut(auth)}
              className="text-xs font-semibold underline cursor-pointer"
            >
              Sign out and switch account
            </button>
          </div>
        )}

        {authError && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200">
            {authError}
          </div>
        )}

        <button
          type="button"
          disabled={signingIn || checkingAdmin}
          onClick={() => void handleGoogleSignIn()}
          className="w-full rounded-xl bg-[#7A0F6D] py-3 text-sm font-semibold text-white hover:bg-[#941684] disabled:opacity-60 transition-colors cursor-pointer"
        >
          {signingIn || checkingAdmin ? 'Verifying…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
};

type AdminTab = 'overview' | 'programmes' | 'categories' | 'notifications' | 'settings' | 'logs';

interface AdminDashboardScreenProps {
  user: User;
  liveStatus: LiveStatusResponse | null;
  programmes: ProgrammeItem[];
  categories: CategoryRecord[];
  featured: FeaturedProgrammeRecord[];
  settings: AppSettingsRecord;
  onDataChanged: () => Promise<void>;
  onNavigate: (route: ScreenRoute) => void;
}

export const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  user,
  liveStatus,
  programmes,
  categories,
  featured,
  settings,
  onDataChanged,
  onNavigate,
}) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [serverStatus, setServerStatus] = useState<ServerStatusResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Category form state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Announcement form state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Settings form state
  const [formSettings, setFormSettings] = useState<AppSettingsRecord>(settings);

  useEffect(() => {
    setFormSettings(settings);
  }, [settings]);

  const loadAdminExtras = async () => {
    try {
      const [status, logs] = await Promise.all([adminFetchStatus(), fetchAuditLogs()]);
      setServerStatus(status);
      setAuditLogs(logs);
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Unable to load server diagnostics.',
      });
    }
  };

  useEffect(() => {
    void loadAdminExtras();
  }, []);

  const featuredSet = new Set(featured.map((f) => f.videoId));

  const handleForceSync = async () => {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await adminTriggerSync();
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({
        kind: 'ok',
        text: `Synchronized ${res.videosCount} recordings. Live status: ${res.live.isLive ? 'LIVE' : 'Offline'}.`,
      });
    } catch (err) {
      setFeedback({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Sync failed.',
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await createCategory({ name: catName, description: catDesc, sortOrder: categories.length + 1 });
      setCatName('');
      setCatDesc('');
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({ kind: 'ok', text: 'Category created.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to create category.' });
    }
  };

  const handleDeleteCategory = async (cat: CategoryRecord) => {
    setFeedback(null);
    try {
      await deleteCategory(cat.id);
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({ kind: 'ok', text: `Deleted category "${cat.name}".` });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to delete category.' });
    }
  };

  const handleAssignCategory = async (prog: ProgrammeItem, categoryId: string) => {
    setFeedback(null);
    const cat = categories.find((c) => c.id === categoryId) || null;
    try {
      await assignProgrammeCategory(prog, cat);
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({ kind: 'ok', text: `Updated category for "${prog.title.slice(0, 40)}".` });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to assign category.' });
    }
  };

  const handleToggleFeatured = async (prog: ProgrammeItem) => {
    setFeedback(null);
    const next = !featuredSet.has(prog.videoId);
    try {
      await setProgrammeFeatured(prog, next);
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({
        kind: 'ok',
        text: next ? 'Added to Featured Programmes.' : 'Removed from Featured Programmes.',
      });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to update featured status.' });
    }
  };

  const handleSendAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = notifTitle.trim();
    const cleanBody = notifBody.trim();
    if (!cleanTitle || !cleanBody) {
      setFeedback({ kind: 'err', text: 'Announcement title and message body cannot be blank.' });
      return;
    }
    setSendingNotif(true);
    setFeedback(null);
    try {
      await createNotificationRecord({
        type: 'announcement',
        title: cleanTitle,
        body: cleanBody,
      });
      const pushRes = await adminSendPushBroadcast({
        title: cleanTitle,
        body: cleanBody,
        url: '/#/notifications',
      });
      setNotifTitle('');
      setNotifBody('');
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({
        kind: 'ok',
        text: `Announcement published. Web Push delivered: ${pushRes.delivery.sent}, failed: ${pushRes.delivery.failed}.`,
      });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to send announcement.' });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await savePublicAppSettings(formSettings);
      await onDataChanged();
      await loadAdminExtras();
      setFeedback({ kind: 'ok', text: 'Station settings saved.' });
    } catch (err) {
      setFeedback({ kind: 'err', text: err instanceof Error ? err.message : 'Failed to save settings.' });
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-medium text-[#EA6C20]">Administrator Console</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
            HILL MOBILE Control Center
          </h1>
          <p className="mt-1 text-xs text-[#C4B0C2]">Signed in as {user.email}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleForceSync()}
            disabled={syncing}
            className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-[#941684] disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing…' : 'Sync YouTube'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              void signOut(auth);
              onNavigate('home');
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#1C0D1B] px-4 py-2 text-xs sm:text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border p-4 text-sm ${
            feedback.kind === 'ok'
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
              : 'border-red-500/30 bg-red-950/30 text-red-200'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Segmented Admin Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ['overview', 'Overview'],
            ['programmes', 'Programmes'],
            ['categories', 'Categories'],
            ['notifications', 'Notifications'],
            ['settings', 'About & Contact'],
            ['logs', 'Audit Logs'],
          ] as Array<[AdminTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-medium cursor-pointer transition-colors ${
              tab === id
                ? 'bg-[#EA6C20] text-[#120711]'
                : 'border border-white/10 bg-[#1C0D1B] text-[#C4B0C2] hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-5">
              <p className="text-xs text-[#C4B0C2]">Broadcast Status</p>
              <p className="mt-2 font-display text-xl font-bold text-[#FAF7FA] flex items-center gap-2">
                {liveStatus?.isLive ? (
                  <>
                    <Radio className="h-5 w-5 text-red-400" />
                    <span>LIVE ON AIR</span>
                  </>
                ) : (
                  <span>Offline</span>
                )}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-5">
              <p className="text-xs text-[#C4B0C2]">YouTube API Connection</p>
              <p className="mt-2 font-display text-xl font-bold text-[#FAF7FA]">
                {serverStatus?.youtubeConfigured ? 'Connected' : 'Missing Key'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-5">
              <p className="text-xs text-[#C4B0C2]">Synced Recordings</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#FAF7FA] tabular-nums">
                {programmes.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-5">
              <p className="text-xs text-[#C4B0C2]">Push Subscribers</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#FAF7FA] tabular-nums">
                {serverStatus?.pushSubscriberCount ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 space-y-2 text-sm">
            <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
              Channel Diagnostics
            </h2>
            <p className="text-[#C4B0C2]">
              Target Handle: <span className="font-mono text-[#FAF7FA]">{serverStatus?.channelHandle || settings.channelHandle}</span>
            </p>
            <p className="text-[#C4B0C2]">
              Resolved Channel ID:{' '}
              <span className="font-mono text-[#FAF7FA]">
                {serverStatus?.resolvedChannelId || 'Pending first YouTube sync'}
              </span>
            </p>
            {serverStatus?.lastError && (
              <p className="text-amber-300 flex items-center gap-2 pt-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Last Sync Error: {serverStatus.lastError}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {tab === 'programmes' && (
        <div className="space-y-4">
          <p className="text-sm text-[#C4B0C2]">
            Assign categories or feature any synchronized YouTube programme on the Home screen.
          </p>
          {programmes.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-8 text-center text-sm text-[#C4B0C2]">
              No recordings synced yet. Ensure <code className="font-mono">YOUTUBE_API_KEY</code> is configured and click Sync YouTube.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] divide-y divide-white/10">
              {programmes.map((prog) => {
                const isFeat = featuredSet.has(prog.videoId);
                return (
                  <div
                    key={prog.videoId}
                    className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-semibold text-[#FAF7FA] truncate">
                        {prog.title}
                      </p>
                      <p className="mt-0.5 text-xs text-[#C4B0C2] font-mono tabular-nums">
                        {prog.videoId} · {prog.publishedAt.slice(0, 10)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      <select
                        aria-label={`Category for ${prog.title}`}
                        value={prog.categoryId || ''}
                        onChange={(e) => void handleAssignCategory(prog, e.target.value)}
                        className="rounded-xl border border-white/15 bg-[#120711] px-3 py-2 text-xs text-[#FAF7FA]"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => void handleToggleFeatured(prog)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium cursor-pointer ${
                          isFeat
                            ? 'bg-[#EA6C20] text-[#120711]'
                            : 'border border-white/15 bg-[#120711] text-[#C4B0C2] hover:text-white'
                        }`}
                      >
                        <Star className={`h-3.5 w-3.5 ${isFeat ? 'fill-current' : ''}`} />
                        <span>{isFeat ? 'Featured' : 'Feature'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleCreateCategory}
            className="lg:col-span-5 rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 space-y-4"
          >
            <h2 className="font-display text-base font-semibold text-[#FAF7FA] flex items-center gap-2">
              <FolderPlus className="h-4 w-4 text-[#EA6C20]" />
              <span>Add Category</span>
            </h2>
            <div>
              <label className="block text-xs font-medium text-[#C4B0C2] mb-1">
                Category Name
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={60}
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="e.g., Friday Khutbah"
                className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C4B0C2] mb-1">
                Short Description
              </label>
              <textarea
                rows={3}
                maxLength={280}
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                placeholder="Optional summary shown to administrators"
                className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-xl bg-[#7A0F6D] py-2.5 text-sm font-semibold text-white hover:bg-[#941684] cursor-pointer"
            >
              Create Category
            </button>
          </form>

          <div className="lg:col-span-7 rounded-2xl border border-white/10 bg-[#1C0D1B] divide-y divide-white/10">
            {categories.length === 0 ? (
              <p className="p-6 text-sm text-[#C4B0C2]">No categories created yet.</p>
            ) : (
              categories.map((cat) => (
                <div key={cat.id} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-display text-sm font-semibold text-[#FAF7FA]">{cat.name}</p>
                    <p className="text-xs text-[#C4B0C2]">{cat.description || cat.slug}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteCategory(cat)}
                    aria-label={`Delete ${cat.name}`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#C4B0C2] hover:bg-red-500/15 hover:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {tab === 'notifications' && (
        <form
          onSubmit={handleSendAnnouncement}
          className="max-w-xl rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-[#FAF7FA] flex items-center gap-2">
            <Bell className="h-4 w-4 text-[#EA6C20]" />
            <span>Send Station Announcement</span>
          </h2>
          <div>
            <label className="block text-xs font-medium text-[#C4B0C2] mb-1">
              Announcement Title
            </label>
            <input
              type="text"
              required
              maxLength={120}
              value={notifTitle}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="e.g., Special Evening Lecture Tonight at 8:00 PM"
              className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#C4B0C2] mb-1">
              Message Body
            </label>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={notifBody}
              onChange={(e) => setNotifBody(e.target.value)}
              placeholder="Write the announcement details for viewers…"
              className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
            />
          </div>
          <button
            type="submit"
            disabled={sendingNotif}
            className="rounded-xl bg-[#7A0F6D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#941684] disabled:opacity-60 cursor-pointer"
          >
            {sendingNotif ? 'Publishing…' : 'Publish & Push Alert'}
          </button>
        </form>
      )}

      {tab === 'settings' && (
        <form
          onSubmit={handleSaveSettings}
          className="max-w-2xl rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 space-y-4"
        >
          <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
            Edit About HILL &amp; Contact Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#C4B0C2] mb-1">About Headline</label>
              <input
                type="text"
                required
                maxLength={140}
                value={formSettings.aboutTitle}
                onChange={(e) => setFormSettings({ ...formSettings, aboutTitle: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C4B0C2] mb-1">Contact Email</label>
              <input
                type="email"
                required
                maxLength={160}
                value={formSettings.contactEmail}
                onChange={(e) => setFormSettings({ ...formSettings, contactEmail: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C4B0C2] mb-1">Contact Phone</label>
              <input
                type="text"
                maxLength={60}
                value={formSettings.contactPhone}
                onChange={(e) => setFormSettings({ ...formSettings, contactPhone: e.target.value })}
                className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#C4B0C2] mb-1">Location</label>
              <input
                type="text"
                maxLength={200}
                value={formSettings.contactLocation}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, contactLocation: e.target.value })
                }
                className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#C4B0C2] mb-1">About Body</label>
            <textarea
              required
              minLength={10}
              maxLength={3000}
              rows={5}
              value={formSettings.aboutBody}
              onChange={(e) => setFormSettings({ ...formSettings, aboutBody: e.target.value })}
              className="w-full rounded-xl border border-white/15 bg-[#120711] px-3.5 py-2.5 text-sm text-[#FAF7FA]"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#7A0F6D] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#941684] cursor-pointer"
          >
            Save Information
          </button>
        </form>
      )}

      {tab === 'logs' && (
        <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 bg-[#120711] text-[#C4B0C2]">
                <tr>
                  <th className="px-4 py-3 font-medium">Action</th>
                  <th className="px-4 py-3 font-medium">Details</th>
                  <th className="px-4 py-3 font-medium">Actor</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-[#C4B0C2]">
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-mono text-[#FAF7FA] whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-[#C4B0C2]">{log.details}</td>
                      <td className="px-4 py-3 text-[#C4B0C2] whitespace-nowrap">{log.actorEmail}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        <span
                          className={
                            log.status === 'error'
                              ? 'text-red-400'
                              : log.status === 'warning'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                          }
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
