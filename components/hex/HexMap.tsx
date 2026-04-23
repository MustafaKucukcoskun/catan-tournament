'use client';
import type { MapData } from '@/lib/map/generator';
import { HexTile } from './HexTile';

interface Props {
  map: MapData;
  hexSize?: number;
  className?: string;
  onHexClick?: (idx: number) => void;
}

export function HexMap({ map, hexSize = 48, className, onHexClick }: Props) {
  // Compute viewBox to fit 19-hex board
  const pad = hexSize * 1.5;
  const w = hexSize * Math.sqrt(3) * 5 + pad * 2;
  const h = hexSize * 7.5 + pad * 2;
  const cx = w / 2;
  const cy = h / 2;
  return (
    <svg
      viewBox={`${-cx} ${-cy} ${w} ${h}`}
      className={className}
      style={{ width: '100%', height: 'auto' }}
    >
      {map.hexes.map((hex, i) => (
        <HexTile
          key={`${hex.q}-${hex.r}`}
          hex={hex}
          size={hexSize}
          onClick={onHexClick ? () => onHexClick(i) : undefined}
        />
      ))}
    </svg>
  );
}
