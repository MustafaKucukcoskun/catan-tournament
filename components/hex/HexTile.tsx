'use client';
import type { Hex } from '@/lib/map/validator';
import { cn } from '@/lib/utils';

const RESOURCE_FILL: Record<string, string> = {
  wood:   'var(--color-resource-wood)',
  sheep:  'var(--color-resource-sheep)',
  wheat:  'var(--color-resource-wheat)',
  brick:  'var(--color-resource-brick)',
  ore:    'var(--color-resource-ore)',
  desert: 'var(--color-resource-desert)',
};

interface Props {
  hex: Hex;
  size?: number;
  onClick?: () => void;
  className?: string;
}

export function HexTile({ hex, size = 48, onClick, className }: Props) {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = size * 1.5 * hex.r;
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return `${size * Math.cos(angle)},${size * Math.sin(angle)}`;
  }).join(' ');
  const isRed = hex.token === 6 || hex.token === 8;
  const gradientId = `g-${hex.q}-${hex.r}`;
  return (
    <g
      transform={`translate(${x},${y})`}
      className={cn('transition-transform duration-[var(--duration-fast)] ease-out cursor-pointer hover:scale-[1.02]', className)}
      onClick={onClick}
    >
      <defs>
        <radialGradient id={gradientId} cx="0.5" cy="0.4" r="0.65">
          <stop offset="0%" stopColor={RESOURCE_FILL[hex.resource]} stopOpacity="1" />
          <stop offset="100%" stopColor={RESOURCE_FILL[hex.resource]} stopOpacity="0.85" />
        </radialGradient>
      </defs>
      <polygon
        points={points}
        fill={`url(#${gradientId})`}
        stroke="rgba(244,185,66,0.20)"
        strokeWidth="1"
      />
      {hex.token !== null && (
        <>
          <circle r={size * 0.35} fill="var(--color-bg-surface)" stroke="rgba(244,185,66,0.30)" strokeWidth="1" />
          {isRed && (
            <circle r={size * 0.42} fill="none" stroke="var(--color-accent-gold)" strokeWidth="2" opacity="0.45" />
          )}
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono)"
            fontSize={size * 0.4}
            fontWeight="600"
            fill={isRed ? 'var(--color-accent-gold)' : 'var(--color-fg-primary)'}
          >
            {hex.token}
          </text>
        </>
      )}
    </g>
  );
}
