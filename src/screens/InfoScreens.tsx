import React, { useState } from 'react';
import {
  Bell,
  BellOff,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PWAInstallButton } from '../components/PWAInstallButton.tsx';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { usePushNotifications } from '../hooks/usePushNotifications.ts';
import type { AppSettingsRecord, NotificationRecord, ScreenRoute } from '../types.ts';

const ABOUT_SANCTUARY_IMAGE = '/src/assets/images/about_hill_sanctuary_1795184241660.jpg';

function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Recently';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate().toLocaleString();
  }
  if (typeof ts === 'string') {
    const dt = new Date(ts);
    if (!Number.isNaN(dt.getTime())) return dt.toLocaleString();
  }
  return 'Recently';
}

export const NotificationsScreen: React.FC<{
  notifications: NotificationRecord[];
  onNavigate: (route: ScreenRoute) => void;
}> = ({ notifications, onNavigate }) => {
  const {
    supported,
    permission,
    isSubscribed,
    busy,
    error,
    enableNotifications,
    disableNotifications,
  } = usePushNotifications();

  return (
    <div className="space-y-8 pb-8 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
          Broadcast Notifications
        </h1>
        <p className="mt-1 text-sm text-[#C4B0C2]">
          Receive alerts when a new live broadcast begins or when station announcements are published.
        </p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-display text-lg font-semibold text-[#FAF7FA]">
              Push Alert Subscription
            </h2>
            <p className="text-sm text-[#C4B0C2]">
              {isSubscribed
                ? 'Active — You will be notified when HILL MOBILE goes live.'
                : permission === 'denied'
                  ? 'Blocked in browser settings. Allow notifications for this site to subscribe.'
                  : 'Opt in to receive live broadcast alerts on this device.'}
            </p>
          </div>

          {isSubscribed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void disableNotifications()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#120711] px-4 py-2.5 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] disabled:opacity-60 cursor-pointer shrink-0"
            >
              <BellOff className="h-4 w-4 text-[#C4B0C2]" />
              <span>{busy ? 'Updating…' : 'Disable Alerts'}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={busy || !supported}
              onClick={() => void enableNotifications()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#7A0F6D] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#941684] disabled:opacity-60 cursor-pointer shrink-0"
            >
              <Bell className="h-4 w-4" />
              <span>{busy ? 'Enabling…' : 'Enable Live Alerts'}</span>
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-3.5 text-xs text-amber-200">
            {error}
          </div>
        )}

        <div className="pt-3 border-t border-white/10 text-xs text-[#C4B0C2] space-y-1.5 leading-relaxed">
          <p>
            <strong className="text-[#FAF7FA]">Android &amp; Desktop Browsers:</strong> Supported directly in Chrome, Edge, and Firefox over HTTPS.
          </p>
          <p>
            <strong className="text-[#FAF7FA]">iPhone &amp; iPad (iOS 16.4+):</strong> Web notifications require adding HILL MOBILE to your Home Screen via Safari Share → Add to Home Screen, then opening the installed app.
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold text-[#FAF7FA]">
          Recent Alerts &amp; Announcements
        </h2>

        {notifications.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-8 text-center text-sm text-[#C4B0C2]">
            No broadcast announcements have been posted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-[#1C0D1B] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#C4B0C2] tabular-nums">
                    <span className={item.type === 'live' ? 'text-red-400 font-semibold' : 'text-[#EA6C20] font-medium'}>
                      {item.type === 'live' ? 'Live Broadcast' : 'Announcement'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <h3 className="font-display text-base font-semibold text-[#FAF7FA]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[#C4B0C2] leading-relaxed">{item.body}</p>
                </div>
                {item.type === 'live' && (
                  <button
                    type="button"
                    onClick={() => onNavigate('live')}
                    className="rounded-xl bg-[#7A0F6D] px-4 py-2 text-xs font-semibold text-white hover:bg-[#941684] shrink-0 cursor-pointer"
                  >
                    Open Live TV
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export const AboutScreen: React.FC<{ settings: AppSettingsRecord }> = ({ settings }) => {
  return (
    <div className="space-y-8 pb-8 max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#1C0D1B]">
        <div className="aspect-[16/7] w-full bg-[#120711] relative">
          <img
            src={ABOUT_SANCTUARY_IMAGE}
            alt="HILL MOBILE Community Center"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1C0D1B] via-black/30 to-transparent" />
        </div>
        <div className="p-6 sm:p-10 space-y-5">
          <p className="text-xs font-medium text-[#EA6C20]">
            About {settings.stationName} · {settings.channelHandle}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
            {settings.aboutTitle}
          </h1>
          <p className="text-sm sm:text-base text-[#C4B0C2] leading-relaxed whitespace-pre-line">
            {settings.aboutBody}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/10">
            <div className="rounded-xl bg-[#120711] border border-white/5 p-4">
              <p className="font-display text-sm font-semibold text-[#FAF7FA]">100% Free Access</p>
              <p className="mt-1 text-xs text-[#C4B0C2]">
                Zero subscriptions, zero paywalls, and no viewer registration required.
              </p>
            </div>
            <div className="rounded-xl bg-[#120711] border border-white/5 p-4">
              <p className="font-display text-sm font-semibold text-[#FAF7FA]">Official YouTube Source</p>
              <p className="mt-1 text-xs text-[#C4B0C2]">
                All streams use the official YouTube embedded player and Data API v3.
              </p>
            </div>
            <div className="rounded-xl bg-[#120711] border border-white/5 p-4">
              <p className="font-display text-sm font-semibold text-[#FAF7FA]">Viewer Choice</p>
              <p className="mt-1 text-xs text-[#C4B0C2]">
                Recorded programmes never autoplay — you choose every programme you watch.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <a
              href={`https://www.youtube.com/${settings.channelHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-[#120711] px-4 py-2.5 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325]"
            >
              <span>Visit Official YouTube Channel</span>
              <ExternalLink className="h-4 w-4 text-[#EA6C20]" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ContactScreen: React.FC<{ settings: AppSettingsRecord }> = ({ settings }) => {
  return (
    <div className="space-y-8 pb-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
          Contact HILL MOBILE
        </h1>
        <p className="mt-1 text-sm text-[#C4B0C2]">
          Reach the broadcast team or follow our official YouTube channel for programme updates.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] divide-y divide-white/10">
        <div className="p-6 flex items-start gap-4">
          <Mail className="h-5 w-5 text-[#EA6C20] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-[#C4B0C2]">Email</p>
            <a
              href={`mailto:${settings.contactEmail}`}
              className="mt-1 block text-base font-medium text-[#FAF7FA] hover:text-[#EA6C20]"
            >
              {settings.contactEmail}
            </a>
          </div>
        </div>

        {settings.contactPhone && (
          <div className="p-6 flex items-start gap-4">
            <Phone className="h-5 w-5 text-[#EA6C20] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-[#C4B0C2]">Phone</p>
              <p className="mt-1 text-base font-medium text-[#FAF7FA] tabular-nums">
                {settings.contactPhone}
              </p>
            </div>
          </div>
        )}

        <div className="p-6 flex items-start gap-4">
          <MapPin className="h-5 w-5 text-[#EA6C20] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-[#C4B0C2]">Location</p>
            <p className="mt-1 text-base font-medium text-[#FAF7FA]">
              {settings.contactLocation || 'Kampala, Uganda'}
            </p>
          </div>
        </div>

        <div className="p-6 flex items-start gap-4">
          <ExternalLink className="h-5 w-5 text-[#EA6C20] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-medium text-[#C4B0C2]">Official YouTube Channel</p>
            <a
              href={`https://www.youtube.com/${settings.channelHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1.5 text-base font-medium text-[#EA6C20] hover:underline"
            >
              <span>youtube.com/{settings.channelHandle}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SettingsScreen: React.FC<{
  isAdmin: boolean;
  onNavigate: (route: ScreenRoute) => void;
}> = ({ isAdmin, onNavigate }) => {
  const isOnline = useOnlineStatus();
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="space-y-8 pb-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAF7FA]">
          Settings &amp; App Preferences
        </h1>
        <p className="mt-1 text-sm text-[#C4B0C2]">
          Manage installation, notifications, privacy policy, and administrator access.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1C0D1B] divide-y divide-white/10">
        <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
              Install HILL MOBILE App (PWA)
            </h2>
            <p className="mt-1 text-sm text-[#C4B0C2]">
              Add HILL MOBILE to your phone or desktop home screen for quick launch.
            </p>
          </div>
          <PWAInstallButton variant="full" />
        </div>

        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
              Live Broadcast Alerts
            </h2>
            <p className="mt-1 text-sm text-[#C4B0C2]">
              Configure push notification permissions for new live broadcasts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className="rounded-xl border border-white/15 bg-[#120711] px-4 py-2 text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] cursor-pointer shrink-0"
          >
            Manage Alerts
          </button>
        </div>

        <div className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-emerald-400" />
            ) : (
              <WifiOff className="h-5 w-5 text-amber-400" />
            )}
            <div>
              <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
                Network Connectivity
              </h2>
              <p className="mt-0.5 text-sm text-[#C4B0C2]">
                {isOnline ? 'Connected — Ready to stream live and recorded programmes.' : 'Offline — Video streaming paused.'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-[#EA6C20]" />
              <div>
                <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
                  Privacy Policy
                </h2>
                <p className="mt-0.5 text-sm text-[#C4B0C2]">
                  Viewers are never tracked or required to create accounts.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowPrivacy((v) => !v)}
              className="rounded-xl border border-white/15 bg-[#120711] px-4 py-2 text-xs font-medium text-[#FAF7FA] hover:bg-[#271325] cursor-pointer shrink-0"
            >
              {showPrivacy ? 'Hide Policy' : 'Read Policy'}
            </button>
          </div>

          {showPrivacy && (
            <div className="mt-4 rounded-xl border border-white/10 bg-[#120711] p-4 text-xs text-[#C4B0C2] space-y-2 leading-relaxed">
              <p>
                <strong className="text-[#FAF7FA]">1. Zero Viewer Registration:</strong> Public viewers browse and stream HILL MOBILE content without accounts, personal profiles, or payment information.
              </p>
              <p>
                <strong className="text-[#FAF7FA]">2. Web Push Subscriptions:</strong> If you explicitly opt into live notifications, only your browser push endpoint token is stored solely to deliver broadcast alerts. You may unsubscribe at any time.
              </p>
              <p>
                <strong className="text-[#FAF7FA]">3. YouTube Embedded Player:</strong> Playback uses the official YouTube embedded player, subject to Google Privacy Policy and YouTube Terms of Service.
              </p>
              <p>
                <strong className="text-[#FAF7FA]">4. Administrator Access:</strong> Google Sign-In is restricted exclusively to authorized station administrators for content organization and auditing.
              </p>
            </div>
          )}
        </div>

        <div className="p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[#EA6C20]" />
            <div>
              <h2 className="font-display text-base font-semibold text-[#FAF7FA]">
                Administrator Portal
              </h2>
              <p className="mt-0.5 text-sm text-[#C4B0C2]">
                {isAdmin
                  ? 'Signed in as authorized administrator.'
                  : 'For authorized HILL MOBILE station administrators only.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate(isAdmin ? 'admin' : 'admin-login')}
            className="rounded-xl bg-[#7A0F6D] px-4 py-2 text-sm font-medium text-white hover:bg-[#941684] cursor-pointer shrink-0"
          >
            {isAdmin ? 'Open Dashboard' : 'Admin Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
};
