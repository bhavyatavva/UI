import React from 'react';

interface BankLogoProps {
  size?: 'sm' | 'md' | 'lg';
}

export const BankLogo: React.FC<BankLogoProps> = ({ size = 'md' }) => {
  const dimensions =
    size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-9 w-9';

  return (
    <div
      className={`${dimensions} shrink-0 overflow-hidden rounded-lg bg-[#0d1421] ring-1 ring-slate-800/30 flex items-center justify-center`}
    >
      <img
        src="/assets/aistudio/WhatsApp_Image_2026-11-15_at_11.22.02_AM__1__a58c22d1.jpeg"
        alt="HDFC Bank Logo"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover"
      />
    </div>
  );
};
