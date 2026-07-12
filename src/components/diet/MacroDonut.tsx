import React from 'react';
import { MACRO_COLOR_HEX } from '../../config/macroColors';

interface MacroDonutProps {
  carbsPercent: number;
  proteinsPercent: number;
  fatsPercent: number;
  centerLabel: string;
  centerSubLabel?: string;
  size?: number;
}

const RADIUS = 70;
const STROKE_WIDTH = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ciambella SVG con i tre macronutrienti, colori fissi in tutto il sito. */
export const MacroDonut: React.FC<MacroDonutProps> = ({
  carbsPercent,
  proteinsPercent,
  fatsPercent,
  centerLabel,
  centerSubLabel,
  size = 140,
}) => {
  const total = carbsPercent + proteinsPercent + fatsPercent;
  const safeTotal = total > 0 ? total : 1;

  const segments = [
    { key: 'carbs', value: carbsPercent, color: MACRO_COLOR_HEX.carbs },
    { key: 'proteins', value: proteinsPercent, color: MACRO_COLOR_HEX.proteins },
    { key: 'fats', value: fatsPercent, color: MACRO_COLOR_HEX.fats },
  ];

  let offsetAcc = 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Distribuzione macronutrienti: ${Math.round(carbsPercent)}% carboidrati, ${Math.round(proteinsPercent)}% proteine, ${Math.round(fatsPercent)}% grassi`}
    >
      <circle cx="100" cy="100" r={RADIUS} fill="none" className="stroke-sage-100 dark:stroke-sage-800" strokeWidth={STROKE_WIDTH} />
      <g transform="rotate(-90 100 100)">
        {segments.map((seg) => {
          if (seg.value <= 0) return null;
          const len = (seg.value / safeTotal) * CIRCUMFERENCE;
          const dashoffset = -offsetAcc;
          offsetAcc += len;
          return (
            <circle
              key={seg.key}
              cx="100"
              cy="100"
              r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={`${len} ${CIRCUMFERENCE}`}
              strokeDashoffset={dashoffset}
              strokeLinecap="butt"
            />
          );
        })}
      </g>
      <text x="100" y={centerSubLabel ? 96 : 108} textAnchor="middle" className="fill-sage-900 dark:fill-sage-50" style={{ fontSize: 30, fontWeight: 900 }}>
        {centerLabel}
      </text>
      {centerSubLabel && (
        <text x="100" y="118" textAnchor="middle" className="fill-sage-500 dark:fill-sage-400" style={{ fontSize: 12, fontWeight: 700 }}>
          {centerSubLabel}
        </text>
      )}
    </svg>
  );
};
