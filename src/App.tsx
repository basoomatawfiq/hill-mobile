import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { Radio } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { Navigation } from './components/Navigation.tsx';
import { OfflineBanner } from './components/PWAInstallButton.tsx';
import { SplashScreen } from './components/SplashScreen.tsx';
import { fetchLiveStatus, fetchRecordedVideos, fetchVideoDetail } from './lib/api.ts';
import { auth } from './lib/firebase.ts';
import {
  checkIsAdmin,
  DEFAULT_APP_SETTINGS,
  fetchCategories,
  fetchFeaturedProgrammes,
  fetchNotificationsFeed,
  fetchPublicAppSettings,
  fetchSyncedProgrammes,
} from './lib/firestoreService.ts';
import { AdminDashboardScreen, AdminLoginScreen } from './screens/AdminScreens.tsx';
import { HomeScreen } from './screens/HomeScreen.tsx';
import {
  AboutScreen,
  ContactScreen,
  NotificationsScreen,
  SettingsScreen,
} from './screens/InfoScreens.tsx';
import { RecordedLibraryScreen, SearchScreen } from './screens/LibraryScreens.tsx';
import { LiveTvScreen } from './screens/LiveTvScreen.tsx';
import { ProgrammeDetailsScreen, VideoPlayerScreen } from './screens/ProgrammeScreens.tsx';
import type {
  AppSettingsRecord,
  CategoryRecord,
  FeaturedProgrammeRecord,
  FirestoreProgrammeRecord,
  LiveStatusResponse,
  NotificationRecord,
  ProgrammeItem,
  ScreenRoute,
} from './types.ts';

function parseHashRoute(): { route: ScreenRoute; videoId?: string } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  if (!hash) return { route: 'home' };
  const [segment, param] = hash.split('/');
  switch (segment) {
    case 'live':
      return { route: 'live' };
    case 'library':
      return { route: 'library' };
    case 'latest':
      return { route: 'latest' };
    case 'search':
      return { route: 'search' };
    case 'notifications':
      return { route: 'notifications' };
    case 'about':
      return { route: 'about' };
    case 'contact':
      return { route: 'contact' };
    case 'settings':
      return { route: 'settings' };
    case 'admin-login':
      return { route: 'admin-login' };
    case 'admin':
      return { route: 'admin' };
    case 'programme':
      return { route: 'details', videoId: param };
    case 'watch':
      return { route: 'player', videoId: param };
    default:
      return { route: 'home' };
  }
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [route, setRoute] = useState<ScreenRoute>(() => parseHashRoute().route);
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Auth & Admin state
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Live & Video state
  const [liveStatus, setLiveStatus] = useState<LiveStatusResponse | null>(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [rawVideos, setRawVideos] = useState<ProgrammeItem[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [videosLoading, setVideosLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  // Firestore public metadata
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [syncedMetadata, setSyncedMetadata] = useState<FirestoreProgrammeRecord[]>([]);
  const [featured, setFeatured] = useState<FeaturedProgrammeRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [settings, setSettings] = useState<AppSettingsRecord>(DEFAULT_APP_SETTINGS);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 650);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (nextUser && nextUser.emailVerified) {
        setCheckingAdmin(true);
        try {
          const ok = await checkIsAdmin(nextUser.uid, nextUser.email);
          setIsAdmin(ok);
        } catch {
          setIsAdmin(false);
        } finally {
          setCheckingAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setCheckingAdmin(false);
      }
    });
    return () => unsub();
  }, []);

  const navigate = useCallback((nextRoute: ScreenRoute, videoId?: string) => {
    setRoute(nextRoute);
    const targetHash =
      nextRoute === 'home'
        ? '#/'
        : nextRoute === 'details' && videoId
          ? `#/programme/${videoId}`
          : nextRoute === 'player' && videoId
            ? `#/watch/${videoId}`
            : `#/${nextRoute}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHashRoute();
      setRoute(parsed.route);
      if (parsed.videoId && (!selectedProgramme || selectedProgramme.videoId !== parsed.videoId)) {
        const match = rawVideos.find((v) => v.videoId === parsed.videoId);
        if (match) {
          setSelectedProgramme(match);
        } else {
          void fetchVideoDetail(parsed.videoId).then((res) => {
            if (res.item) setSelectedProgramme(res.item);
          });
        }
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [rawVideos, selectedProgramme]);

  const loadFirestorePublic = useCallback(async () => {
    try {
      const [cats, synced, feat, notifs, appSet] = await Promise.all([
        fetchCategories(),
        fetchSyncedProgrammes(),
        fetchFeaturedProgrammes(),
        fetchNotificationsFeed(),
        fetchPublicAppSettings(),
      ]);
      setCategories(cats);
      setSyncedMetadata(synced);
      setFeatured(feat);
      setNotifications(notifs);
      setSettings(appSet);
    } catch (err) {
      console.error('Failed loading public Firestore data:', err);
    }
  }, []);

  const loadLive = useCallback(async (force = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setLiveLoading(false);
      return;
    }
    setLiveLoading(true);
    try {
      const data = await fetchLiveStatus(force);
      setLiveStatus(data);
    } catch (err) {
      console.warn('Live check deferred (network/server busy):', err);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async () => {
    setVideosLoading(true);
    setVideosError(null);
    try {
      const res = await fetchRecordedVideos({ maxResults: 24 });
      if (res.errorMessage && res.items.length === 0 && res.configured) {
        setVideosError(res.errorMessage);
      }
      setRawVideos(res.items);
      setNextPageToken(res.nextPageToken);
    } catch (err) {
      setVideosError(
        err instanceof Error ? err.message : 'Unable to load recorded programmes right now.'
      );
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadFirestorePublic(), loadLive(), loadVideos()]);
    // Poll backend-cached live status every 60s while tab is visible and online
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void loadLive(false);
      }
    }, 60_000);
    const onOnline = () => {
      void loadLive(false);
      void loadVideos();
    };
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('online', onOnline);
    };
  }, [loadFirestorePublic, loadLive, loadVideos]);

  // Deep-link load if page opened directly on #/programme/:id or #/watch/:id
  useEffect(() => {
    const initial = parseHashRoute();
    if (initial.videoId && !selectedProgramme) {
      void fetchVideoDetail(initial.videoId).then((res) => {
        if (res.item) setSelectedProgramme(res.item);
      });
    }
  }, [selectedProgramme]);

  const handleLoadMore = async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetchRecordedVideos({ pageToken: nextPageToken, maxResults: 24 });
      setRawVideos((prev) => {
        const seen = new Set(prev.map((p) => p.videoId));
        return [...prev, ...res.items.filter((i) => !seen.has(i.videoId))];
      });
      setNextPageToken(res.nextPageToken);
    } finally {
      setLoadingMore(false);
    }
  };

  // Merge Firestore category/featured metadata onto live YouTube recordings
  const programmes = useMemo(() => {
    const metaMap = new Map(syncedMetadata.map((m) => [m.videoId, m]));
    return rawVideos.map((vid) => {
      const meta = metaMap.get(vid.videoId);
      if (!meta) return vid;
      return {
        ...vid,
        categoryId: meta.categoryId,
        categoryName: meta.categoryName,
        isFeatured: meta.isFeatured,
      };
    });
  }, [rawVideos, syncedMetadata]);

  const openDetails = (programme: ProgrammeItem) => {
    setSelectedProgramme(programme);
    navigate('details', programme.videoId);
  };

  const openPlayer = (programme: ProgrammeItem) => {
    setSelectedProgramme(programme);
    navigate('player', programme.videoId);
  };

  const relatedProgrammes = useMemo(() => {
    if (!selectedProgramme) return [];
    return programmes
      .filter((p) => p.videoId !== selectedProgramme.videoId)
      .sort((a, b) => {
        const aSame = a.categoryId && a.categoryId === selectedProgramme.categoryId ? 1 : 0;
        const bSame = b.categoryId && b.categoryId === selectedProgramme.categoryId ? 1 : 0;
        return bSame - aSame;
      });
  }, [programmes, selectedProgramme]);

  const isLive = Boolean(liveStatus?.isLive && liveStatus.liveBroadcast);

  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen onDismiss={() => setShowSplash(false)} />}

      <div className="min-h-screen flex flex-col bg-[#120711] text-[#FAF7FA]">
        <OfflineBanner />
        <Navigation currentRoute={route} isLive={isLive} onNavigate={(r) => navigate(r)} />

        {/* Live Broadcast Switch Banner when browsing recorded screens */}
        {isLive && route !== 'live' && route !== 'player' && (
          <div className="bg-red-950/70 border-b border-red-500/30 px-4 py-2.5">
            <div className="mx-auto max-w-7xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-red-100 min-w-0">
                <Radio className="h-4 w-4 text-red-400 animate-pulse shrink-0" />
                <span className="truncate">
                  <strong>Live Now:</strong> {liveStatus?.liveBroadcast?.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('live')}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 shrink-0 cursor-pointer"
              >
                Switch to Live TV
              </button>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 pt-6 sm:pt-8 pb-24 lg:pb-12">
          {route === 'home' && (
            <HomeScreen
              liveStatus={liveStatus}
              liveLoading={liveLoading}
              programmes={programmes}
              programmesLoading={videosLoading}
              programmesError={videosError}
              featured={featured}
              categories={categories}
              settings={settings}
              onRefresh={() => {
                void loadLive(true);
                void loadVideos();
              }}
              onNavigate={(r) => navigate(r)}
              onSelectCategory={(catId) => {
                setSelectedCategoryId(catId);
                navigate('library');
              }}
              onSelectProgramme={openDetails}
              onWatchProgramme={openPlayer}
            />
          )}

          {route === 'live' && (
            <LiveTvScreen
              liveStatus={liveStatus}
              loading={liveLoading}
              onRefreshLive={() => void loadLive(true)}
              onNavigate={(r) => navigate(r)}
            />
          )}

          {route === 'library' && (
            <RecordedLibraryScreen
              programmes={programmes}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onCategoryChange={setSelectedCategoryId}
              loading={videosLoading}
              loadingMore={loadingMore}
              hasMore={Boolean(nextPageToken)}
              error={videosError}
              onLoadMore={() => void handleLoadMore()}
              onRetry={() => void loadVideos()}
              onSelectProgramme={openDetails}
              onWatchProgramme={openPlayer}
            />
          )}

          {route === 'latest' && (
            <RecordedLibraryScreen
              title="Latest Programmes"
              subtitle="Most recently published broadcasts from HILL MOBILE — select any programme to play."
              programmes={programmes}
              categories={categories}
              selectedCategoryId="all"
              onCategoryChange={(id) => {
                setSelectedCategoryId(id);
                navigate('library');
              }}
              loading={videosLoading}
              loadingMore={loadingMore}
              hasMore={Boolean(nextPageToken)}
              error={videosError}
              onLoadMore={() => void handleLoadMore()}
              onRetry={() => void loadVideos()}
              onSelectProgramme={openDetails}
              onWatchProgramme={openPlayer}
            />
          )}

          {route === 'details' && selectedProgramme && (
            <ProgrammeDetailsScreen
              programme={selectedProgramme}
              related={relatedProgrammes}
              onBack={() => navigate('library')}
              onWatch={openPlayer}
              onSelectProgramme={openDetails}
            />
          )}

          {route === 'player' && selectedProgramme && (
            <VideoPlayerScreen
              programme={selectedProgramme}
              related={relatedProgrammes}
              isChannelLive={isLive}
              onSwitchToLive={() => navigate('live')}
              onBack={() => navigate('library')}
              onWatch={openPlayer}
              onSelectProgramme={openDetails}
            />
          )}

          {(route === 'details' || route === 'player') && !selectedProgramme && (
            <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-8 text-center">
              <p className="text-sm text-[#C4B0C2]">Loading programme details…</p>
            </div>
          )}

          {route === 'search' && (
            <SearchScreen
              programmes={programmes}
              categories={categories}
              onSearchServer={async (q) => {
                const res = await fetchRecordedVideos({ q, maxResults: 24 });
                return res.items;
              }}
              onSelectProgramme={openDetails}
              onWatchProgramme={openPlayer}
            />
          )}

          {route === 'notifications' && (
            <NotificationsScreen notifications={notifications} onNavigate={(r) => navigate(r)} />
          )}

          {route === 'about' && <AboutScreen settings={settings} />}

          {route === 'contact' && <ContactScreen settings={settings} />}

          {route === 'settings' && (
            <SettingsScreen isAdmin={isAdmin} onNavigate={(r) => navigate(r)} />
          )}

          {route === 'admin-login' && (
            <AdminLoginScreen
              user={user}
              isAdmin={isAdmin}
              checkingAdmin={checkingAdmin}
              onNavigate={(r) => navigate(r)}
            />
          )}

          {route === 'admin' &&
            (user && isAdmin ? (
              <AdminDashboardScreen
                user={user}
                liveStatus={liveStatus}
                programmes={programmes}
                categories={categories}
                featured={featured}
                settings={settings}
                onDataChanged={async () => {
                  await Promise.all([loadFirestorePublic(), loadLive(false), loadVideos()]);
                }}
                onNavigate={(r) => navigate(r)}
              />
            ) : (
              <AdminLoginScreen
                user={user}
                isAdmin={isAdmin}
                checkingAdmin={checkingAdmin}
                onNavigate={(r) => navigate(r)}
              />
            ))}
        </main>

        <footer className="hidden lg:block border-t border-white/10 bg-[#0C040B] py-6">
          <div className="mx-auto max-w-7xl px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-[#C4B0C2]">
            <p>
              HILL MOBILE · Free Streaming · Official Channel{' '}
              <a
                href={`https://www.youtube.com/${settings.channelHandle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#EA6C20] hover:underline"
              >
                {settings.channelHandle}
              </a>
            </p>
            <div className="flex items-center gap-5">
              <button type="button" onClick={() => navigate('about')} className="hover:text-white cursor-pointer">
                About
              </button>
              <button type="button" onClick={() => navigate('contact')} className="hover:text-white cursor-pointer">
                Contact
              </button>
              <button type="button" onClick={() => navigate('notifications')} className="hover:text-white cursor-pointer">
                Notifications
              </button>
              <button type="button" onClick={() => navigate('settings')} className="hover:text-white cursor-pointer">
                Settings &amp; Privacy
              </button>
              <button type="button" onClick={() => navigate('admin')} className="hover:text-white cursor-pointer">
                Admin
              </button>
            </div>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
