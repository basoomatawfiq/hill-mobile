import React, { useState } from 'react';
import { Download, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export const PWAInstallButton: React.FC<{ variant?: 'compact' | 'full' }> = ({
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    if (variant === 'full') {
      return (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          HILL MOBILE is installed on this device and running in app mode.
        </div>
      );
    }
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7A0F6D] px-4 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#941684] transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS || variant === 'full') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-[#1C0D1B] px-4 py-2 text-xs sm:text-sm font-medium text-[#FAF7FA] hover:bg-[#271325] transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
        >
          <Smartphone className="h-4 w-4 shrink-0 text-[#EA6C20]" />
          <span>{isIOS ? 'Install on iPhone' : 'Install Guide'}</span>
        </button>

        {showIOSGuide && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-guide-title"
          >
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1C0D1B] p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <h3 id="install-guide-title" className="font-display text-lg font-semibold text-[#FAF7FA]">
                  Install HILL MOBILE
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close install guide"
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-[#C4B0C2] hover:bg-white/5 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-[#C4B0C2] leading-relaxed">
                <p>
                  <strong className="text-[#FAF7FA]">iPhone &amp; iPad (Safari):</strong> Tap the{' '}
                  <Share className="inline h-4 w-4 text-[#EA6C20] mx-0.5" /> Share button in the Safari toolbar, then select{' '}
                  <strong className="text-[#FAF7FA]">Add to Home Screen</strong>.
                </p>
                <p>
                  <strong className="text-[#FAF7FA]">Android (Chrome) &amp; Desktop:</strong> Open the browser menu and select{' '}
                  <strong className="text-[#FAF7FA]">Install App</strong> or{' '}
                  <strong className="text-[#FAF7FA]">Add to Home Screen</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-xl bg-[#7A0F6D] py-2.5 text-sm font-medium text-white hover:bg-[#941684] transition-colors cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="bg-amber-950/90 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-200 flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-amber-400" />
      <span>You are currently offline. Live TV and YouTube streaming require an internet connection.</span>
    </div>
  );
};
