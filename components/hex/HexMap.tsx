'use client';
import type { MapData } from '@/lib/map/generator';
import { HexTile } from './HexTile';

interface Props {
  map: MapData;
  hexSize?: number;
  className?: string;
  onHexClick?: (idx: number) => void;
  /** Decorative chrome around the board (caption band, inner frame) */
  framed?: boolean;
  /** Caption eyebrow (bottom-left) — e.g. "board snapshot · turn 47" */
  caption?: string;
}

/**
 * HexMap — renders the 3-4-5-4-3 19-hex Catan layout.
 *
 * The viewBox is sized from real hex geometry (√3 width per column, 1.5 row
 * step). Padding is generous so the outermost tiles don't kiss the frame,
 * matching the spectator kit's scale.
 */
export function HexMap({
  map, hexSize = 48, className, onHexClick, framed = false, caption,
}: Props) {
  // Pointy-top hex geometry constants
  const W = hexSize * Math.sqrt(3);   // column width
  const H = hexSize * 1.5;            // row step height
  // Board extents: cols span ±2, rows span ±2 → widest row uses 5 tiles
  // Outer radius from centre = W * 2.5 horizontally and H * 2 + hexSize vertically
  const padX = hexSize * 0.75;
  const padY = hexSize * 0.75;
  const halfW = W * 2.5 + padX;
  const halfH = H * 2 + hexSize + padY;
  const viewBox = `${(-halfW).toFixed(2)} ${(-halfH).toFixed(2)} ${(halfW * 2).toFixed(2)} ${(halfH * 2).toFixed(2)}`;

  return (
    <div
      className={[
        'relative w-full',
        framed
          ? 'rounded-[var(--radius-lg)] hairline bg-[var(--color-bg-surface)] p-4 md:p-6'
          : '',
        className ?? '',
      ].filter(Boolean).join(' ')}
    >
      {framed && (
        <>
          {/* Subtle inner hex-lattice ambience behind the board */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-4 rounded-[var(--radius-md)] opacity-60"
            style={{
              background:
                'radial-gradient(ellipse at 20% 15%, rgba(244,185,66,0.06) 0, transparent 55%),' +
                'radial-gradient(ellipse at 80% 85%, rgba(232,93,46,0.05) 0, transparent 55%)',
            }}
          />
          {/* Corner hex glyphs */}
          <span aria-hidden className="pointer-events-none absolute top-3 right-4 text-[14px] text-[var(--color-fg-subtle)]">⬡</span>
          <span aria-hidden className="pointer-events-none absolute bottom-3 left-4 text-[14px] text-[var(--color-fg-subtle)]">⬡</span>
        </>
      )}

      <svg
        viewBox={viewBox}
        className="relative block w-full h-auto select-none"
        aria-label="Catan map"
        role="img"
        style={{ filter: framed ? 'drop-shadow(0 10px 24px rgba(0,0,0,0.45))' : undefined }}
      >
        {map.hexes.map((hex, i) => (
          <HexTile
            key={`${hex.q}-${hex.r}-${i}`}
            hex={hex}
            size={hexSize}
            onClick={onHexClick ? () => onHexClick(i) : undefined}
          />
        ))}
      </svg>

      {framed && caption && (
        <div className="absolute bottom-3 left-6 font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
          {caption}
        </div>
      )}
    </div>
  );
}
