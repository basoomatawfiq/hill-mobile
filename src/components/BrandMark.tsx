import React from 'react';

export const HILL_LOGO_URL = `${import.meta.env.BASE_URL}assets/aistudio/WhatsApp_Image_2026-11-20_at_06.30.25_17e6e149.jpeg`;

export const BrandCrest: React.FC<{ className?: string }> = ({ className = 'h-9 w-9' }) => (
  <img
    src={HILL_LOGO_URL}
    alt="HILL MOBILE Logo"
    className={`${className} rounded-lg object-cover bg-[#FDF7FB]`}
  />
);

export const BrandWordmark: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EA6C20] rounded-lg py-1"
  >
    <BrandCrest className="h-9 w-9 shrink-0 shadow-sm" />
    <span className="font-display text-lg font-bold tracking-tight text-[#FAF7FA] whitespace-nowrap shrink-0">
      HILL MOBILE
    </span>
  </button>
);
