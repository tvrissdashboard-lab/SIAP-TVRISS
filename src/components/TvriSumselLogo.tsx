import React from 'react';

interface TvriSumselLogoProps {
  className?: string;
  badge?: boolean;
  variant?: 'stacked' | 'horizontal';
}

export const TvriSumselLogo: React.FC<TvriSumselLogoProps> = ({
  className = "h-11",
  badge = true,
  variant = 'stacked'
}) => {
  const logoSrc = import.meta.env.BASE_URL + 'logo-tvri-sumsel.png';

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${badge ? 'bg-white px-3 py-1.5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition' : ''} ${className}`}>
      <img
        src={logoSrc}
        alt="Logo Resmi TVRI Stasiun Sumatera Selatan"
        className="h-full w-auto object-contain select-none"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
