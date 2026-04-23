'use client';
import type { Hex } from '@/lib/map/validator';
import { cn } from '@/lib/utils';

// Warm inner-to-outer radial gradient stops per the design preview
// (components-hex.html). Brighter centre, deeper edge — this is the
// "emboss" we allow. NOT heavy, just dimensional.
const RESOURCE_GRADIENT: Record<string, [string, string]> = {
  wood:   ['#4D9668', '#2F6443'],
  sheep:  ['#A4D68A', '#6EA956'],
  wheat:  ['#F0D565', '#C9A835'],
  brick:  ['#D86A38', '#A54320'],
  ore:    ['#828A94', '#565D67'],
  desert: ['#EBD3A6', '#B99866'],
};

// Hover shading — slightly brighter than base for the secondary radial
const RESOURCE_HIGHLIGHT: Record<string, string> = {
  wood:   '#63B07C',
  sheep:  '#B9E39E',
  wheat:  '#F9E07A',
  brick:  '#E47C4B',
  ore:    '#969EAB',
  desert: '#F5E2B8',
};

interface Props {
  hex: Hex;
  size?: number;
  onClick?: () => void;
  className?: string;
  /** Hide the number token — used for background watermark hexes */
  muted?: boolean;
}

/**
 * HexTile — pointy-top hex with layered radial gradient, warm hairline border,
 * and a centred JetBrains Mono number token. On 6 and 8 ("red" tokens) a
 * gold glow ring wraps the number and the digit itself is rendered in the
 * deep coffee background colour so it reads as an embossed brass plate.
 *
 * Geometry maps the Hex {q, r} axial coordinates into pointy-top SVG space
 * using the standard math: x = s√3·(q + r/2), y = s·1.5·r.
 */
export function HexTile({ hex, size = 48, onClick, className, muted }: Props) {
  const x = size * Math.sqrt(3) * (hex.q + hex.r / 2);
  const y = size * 1.5 * hex.r;
  // Pointy-top vertices — angle offset -30° so the tile stands tall
  const points = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(size * Math.cos(a)).toFixed(2)},${(size * Math.sin(a)).toFixed(2)}`;
  }).join(' ');

  const [c1, c2] = RESOURCE_GRADIENT[hex.resource] ?? RESOURCE_GRADIENT.desert;
  const highlight = RESOURCE_HIGHLIGHT[hex.resource] ?? '#F5E2B8';
  const isRed = hex.token === 6 || hex.token === 8;
  const isDesert = hex.resource === 'desert';
  const hasNumber = !isDesert && hex.token !== null;

  // Unique gradient ids — combine coords + a stable slug so ports render crisply
  const gid = `hex-${hex.q}-${hex.r}`;
  const gidFace = `${gid}-face`;
  const gidSheen = `${gid}-sheen`;
  const gidToken = `${gid}-token`;

  const numberTokenRadius = size * 0.36;
  const fontSize = isRed ? size * 0.46 : size * 0.42;

  return (
    <g
      transform={`translate(${x.toFixed(2)},${y.toFixed(2)})`}
      className={cn(
        'transition-transform duration-[var(--duration-fast)] ease-[var(--ease-out)]',
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className,
      )}
      onClick={onClick}
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      <defs>
        {/* Primary face gradient — brighter at 40% Y, deepens toward the bottom */}
        <radialGradient id={gidFace} cx="50%" cy="38%" r="70%">
          <stop offset="0%"  stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
        {/* Top-left lantern sheen — a subtle linear overlay */}
        <linearGradient id={gidSheen} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"  stopColor={highlight} stopOpacity="0.18" />
          <stop offset="45%" stopColor={highlight} stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.18" />
        </linearGradient>
        {/* Number token — warm cream with faint inner gold tint */}
        <radialGradient id={gidToken} cx="50%" cy="38%" r="72%">
          <stop offset="0%"   stopColor="#FBECCF" />
          <stop offset="60%"  stopColor="#E8D3A6" />
          <stop offset="100%" stopColor="#C9A64E" />
        </radialGradient>
      </defs>

      {/* Subtle drop shadow behind the tile for dimension */}
      <polygon
        points={points}
        fill="rgba(0,0,0,0.35)"
        transform="translate(1.2, 1.8)"
      />

      {/* Face fill */}
      <polygon
        points={points}
        fill={`url(#${gidFace})`}
        stroke="#5A4A36"
        strokeWidth="1"
      />

      {/* Sheen overlay on top — evening-lantern highlight */}
      <polygon
        points={points}
        fill={`url(#${gidSheen})`}
        pointerEvents="none"
      />

      {/* Inner hairline highlight — subtle warm gold rim at 12% */}
      <polygon
        points={points}
        fill="none"
        stroke="rgba(244,185,66,0.18)"
        strokeWidth="0.6"
        transform="scale(0.94)"
        style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        pointerEvents="none"
      />

      {!muted && hasNumber && (
        <>
          {/* Gold glow ring for 6 / 8 — soft outer halo */}
          {isRed && (
            <circle
              r={numberTokenRadius + size * 0.09}
              fill="none"
              stroke="var(--color-accent-gold)"
              strokeWidth={size * 0.03}
              opacity="0.55"
              style={{ filter: `drop-shadow(0 0 ${size * 0.14}px var(--color-accent-gold))` }}
              className="animate-hex-glow"
            />
          )}

          {/* Number token disc — warm gradient with embossed rim */}
          <circle
            r={numberTokenRadius}
            fill={`url(#${gidToken})`}
            stroke={isRed ? 'rgba(244,185,66,0.85)' : 'rgba(90,74,54,0.85)'}
            strokeWidth="1"
          />
          {/* Inner 1px highlight */}
          <circle
            r={numberTokenRadius - 2}
            fill="none"
            stroke="rgba(255,245,220,0.35)"
            strokeWidth="0.6"
          />

          {/* Pip dots — classic Catan treatment for 6/8 (five pips) */}
          {isRed && (
            <g transform={`translate(0, ${numberTokenRadius * 0.62})`} fill="#7A1F10">
              {[-2, -1, 0, 1, 2].map(i => (
                <circle key={i} cx={i * (size * 0.06)} cy="0" r={size * 0.022} />
              ))}
            </g>
          )}

          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="var(--font-mono)"
            fontSize={fontSize}
            fontWeight={isRed ? 700 : 600}
            fill={isRed ? '#7A1F10' : '#2F1E0F'}
            style={{ letterSpacing: '-0.02em' }}
          >
            {hex.token}
          </text>
        </>
      )}

      {/* Desert marker — decorative star glyph */}
      {!muted && isDesert && (
        <text
          x="0"
          y="0"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-display)"
          fontSize={size * 0.5}
          fill="rgba(90,74,54,0.8)"
        >
          ✶
        </text>
      )}
    </g>
  );
}
