import React, { useState } from 'react';
import {
  Bell,
  Clock,
  Film,
  Home,
  Info,
  Mail,
  Menu,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ScreenRoute } from '../types.ts';
import { BrandWordmark } from './BrandMark.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface NavigationProps {
  currentRoute: ScreenRoute;
  isLive: boolean;
  onNavigate: (route: ScreenRoute) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentRoute,
  isLive,
  onNavigate,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navTo = (route: ScreenRoute) => {
    setDrawerOpen(false);
    onNavigate(route);
  };

  const linkClass = (route: ScreenRoute) =>
    `text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer py-1 border-b-2 ${
      currentRoute === route
        ? 'text-[#FAF7FA] border-[#EA6C20]'
        : 'text-[#C4B0C2] border-transparent hover:text-[#FAF7FA]'
    }`;

  return (
    <>
      {/* Top Bar Contract: 3 zones (Brand — 5 Nav Links — 1 Primary Action) */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#120711]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 h-14 sm:h-16">
          {/* Zone 1: Brand Wordmark */}
          <BrandWordmark onClick={() => navTo('home')} />

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
            <button type="button" onClick={() => navTo('home')} className={linkClass('home')}>
              Home
            </button>
            <button type="button" onClick={() => navTo('live')} className={linkClass('live')}>
              Live TV
            </button>
            <button type="button" onClick={() => navTo('library')} className={linkClass('library')}>
              Programmes
            </button>
            <button type="button" onClick={() => navTo('search')} className={linkClass('search')}>
              Search
            </button>
            <button type="button" onClick={() => navTo('about')} className={linkClass('about')}>
              About HILL
            </button>
          </nav>

          {/* Zone 3: Single Primary Action (+ Mobile Menu Trigger) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2">
              {isLive ? (
                <button
                  type="button"
                  onClick={() => navTo('live')}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-red-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Radio className="h-4 w-4 shrink-0" />
                  <span>Watch Live</span>
                </button>
              ) : (
                <PWAInstallButton />
              )}
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#1C0D1B] text-[#FAF7FA] hover:bg-[#271325] transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Thumb-Zone Ergonomics) */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#120711]/95 backdrop-blur-md lg:hidden pb-safe"
      >
        <div className="grid grid-cols-5 items-center h-14">
          <button
            type="button"
            onClick={() => navTo('home')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              currentRoute === 'home' ? 'text-[#EA6C20]' : 'text-[#C4B0C2]'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Home</span>
          </button>

          <button
            type="button"
            onClick={() => navTo('live')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              currentRoute === 'live'
                ? 'text-red-400'
                : isLive
                  ? 'text-red-400/90'
                  : 'text-[#C4B0C2]'
            }`}
          >
            <Radio className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Live TV</span>
          </button>

          <button
            type="button"
            onClick={() => navTo('library')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              currentRoute === 'library' || currentRoute === 'latest'
                ? 'text-[#EA6C20]'
                : 'text-[#C4B0C2]'
            }`}
          >
            <Film className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Library</span>
          </button>

          <button
            type="button"
            onClick={() => navTo('search')}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              currentRoute === 'search' ? 'text-[#EA6C20]' : 'text-[#C4B0C2]'
            }`}
          >
            <Search className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">Search</span>
          </button>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center h-full cursor-pointer ${
              drawerOpen ? 'text-[#EA6C20]' : 'text-[#C4B0C2]'
            }`}
          >
            <Menu className="h-5 w-5" />
            <span className="mt-0.5 text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-over Navigation Drawer for all 14 screens */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Full Navigation Menu"
        >
          <div className="flex h-full w-full max-w-xs flex-col border-l border-white/10 bg-[#170916] p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <BrandWordmark onClick={() => navTo('home')} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-[#C4B0C2] hover:bg-white/5 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-1">
              {[
                { route: 'home' as const, label: 'Home', icon: Home },
                { route: 'live' as const, label: 'Live TV', icon: Radio },
                { route: 'library' as const, label: 'Recorded Programmes', icon: Film },
                { route: 'latest' as const, label: 'Latest Programmes', icon: Clock },
                { route: 'search' as const, label: 'Search Programmes', icon: Search },
                { route: 'notifications' as const, label: 'Notifications', icon: Bell },
                { route: 'about' as const, label: 'About HILL', icon: Info },
                { route: 'contact' as const, label: 'Contact', icon: Mail },
                { route: 'settings' as const, label: 'Settings & Privacy', icon: Settings },
                { route: 'admin' as const, label: 'Admin Dashboard', icon: ShieldCheck },
              ].map((item) => {
                const Icon = item.icon;
                const active = currentRoute === item.route;
                return (
                  <button
                    key={item.route}
                    type="button"
                    onClick={() => navTo(item.route)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#7A0F6D]/25 text-[#FAF7FA] border border-[#7A0F6D]/40'
                        : 'text-[#C4B0C2] hover:bg-white/5 hover:text-[#FAF7FA]'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[#EA6C20]" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
              <PWAInstallButton variant="full" />
              <p className="text-xs text-[#C4B0C2]">
                100% Free Viewing · No Subscriptions
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
