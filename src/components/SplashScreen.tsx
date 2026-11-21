import React from 'react';
import { HILL_LOGO_URL } from './BrandMark.tsx';

export const SplashScreen: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#120711] px-6 text-center"
      role="status"
      aria-label="Launching HILL MOBILE"
    >
      <div className="rounded-3xl bg-[#FDF7FB] p-2 shadow-2xl border border-[#EA6C20]/30">
        <img
          src={HILL_LOGO_URL}
          alt="HILL MOBILE Official Logo"
          className="h-28 w-28 rounded-2xl object-cover"
        />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-[#FAF7FA]">
        HILL MOBILE
      </h1>
      <p className="mt-2 text-sm text-[#C4B0C2]">
        Free Live Broadcasts &amp; Recorded Programmes
      </p>
      <button
        type="button"
        onClick={onDismiss}
        className="mt-8 rounded-xl bg-[#7A0F6D] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#941684] transition-colors cursor-pointer"
      >
        Enter Studio →
      </button>
    </div>
  );
};
