import React from 'react';

/** Marchio Cunzari: una "C" ad anello, sfondo verde brillante e anello verde scuro. */
export const Logo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 76 76" className={className} aria-hidden="true">
    <circle
      cx="38"
      cy="38"
      r="26"
      fill="none"
      stroke="#14532d"
      strokeWidth="11"
      strokeLinecap="round"
      strokeDasharray="122 163"
      transform="rotate(45 38 38)"
    />
  </svg>
);
