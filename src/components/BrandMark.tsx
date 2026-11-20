import React from 'react';

interface BrandMarkProps {
  tone?: 'dark' | 'light';
  onClick?: () => void;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ tone = 'dark', onClick }) => {
  const isLight = tone === 'light';
  const strokeMain = isLight ? '#09090D' : '#FFFFFF';
  const textColor = isLight ? 'text-[#09090D]' : 'text-white';
  const mutedXColor = isLight ? 'text-[#8B8B98]' : 'text-[#8B8B98]';

  const content = (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        width="22"
        height="22"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="3"
          y="4"
          width="12"
          height="20"
          rx="2.5"
          stroke={strokeMain}
          strokeWidth="1.75"
        />
        <rect
          x="13"
          y="8"
          width="12"
          height="12"
          rx="6"
          stroke="#5146C8"
          strokeWidth="1.75"
        />
      </svg>
      <span className={`font-display text-[15px] font-semibold tracking-tight ${textColor}`}>
        PaarvAI <span className={`font-normal ${mutedXColor}`}>×</span> Madello
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5146C8] transition-opacity hover:opacity-85 cursor-pointer whitespace-nowrap shrink-0"
      >
        {content}
      </button>
    );
  }

  return content;
};
