import React from 'react';
import { MacroKey } from '../../utils/mealBalance';
import { MACRO_COLOR_HEX } from '../../config/macroColors';

interface MacroIconProps {
  macro: MacroKey;
  className?: string;
}

/** Icona dedicata per ciascun macronutriente: spiga (carboidrati), pesce (proteine), goccia (grassi). */
export const MacroIcon: React.FC<MacroIconProps> = ({ macro, className = 'w-4 h-4' }) => {
  const color = MACRO_COLOR_HEX[macro];

  if (macro === 'carbs') {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <line x1="16" y1="15" x2="16" y2="29" stroke={color} strokeWidth="2" />
        <ellipse cx="16" cy="6" rx="2" ry="4.5" fill={color} />
        <ellipse cx="12" cy="10" rx="2" ry="4" fill={color} transform="rotate(-30 12 10)" />
        <ellipse cx="20" cy="10" rx="2" ry="4" fill={color} transform="rotate(30 20 10)" />
        <ellipse cx="11" cy="15" rx="2.2" ry="4.5" fill={color} transform="rotate(-25 11 15)" />
        <ellipse cx="21" cy="15" rx="2.2" ry="4.5" fill={color} transform="rotate(25 21 15)" />
      </svg>
    );
  }

  if (macro === 'proteins') {
    return (
      <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
        <ellipse cx="13" cy="16" rx="8" ry="5.5" fill={color} />
        <path d="M21,16 L27,11 L27,21 Z" fill={color} />
        <circle cx="9" cy="14.5" r="1" fill="white" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M16,4 C22,10 26,15 26,20 A10,10 0 1 1 6,20 C6,15 10,10 16,4 Z" fill={color} />
      <ellipse cx="12" cy="15" rx="1.5" ry="2.5" fill="white" transform="rotate(-20 12 15)" />
    </svg>
  );
};
