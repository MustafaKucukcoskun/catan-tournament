'use client';
import { useEffect, useState } from 'react';
import { PlayerAvatar } from './PlayerAvatar';
import { HexMap } from '@/components/hex/HexMap';
import type { MapData } from '@/lib/map/generator';

// Ported from Claude Design export:
//   ui_kits/tournament-hub/components-v2.jsx — LiveTableCard (mini hex + live
//     avatars + ticking timer + ember glow breathing animation).
//   ui_kits/tournament-hub/leaderboard-amber.jsx — "on the tables" aside
//     with italic Fraunces title and a "3 live" eyebrow.
// We use the real HexMap for the mini snapshot rather than a synthetic one.

export interface LiveTable {
  id: string;
  tableNumber: number;
  startedAt: Date | string;
  map: MapData;
  players: { seatCode: string; name: string; finalVp?: number | null }[];
}

interface Props {
  tables: LiveTable[];
  // Section heading — italic Fraunces per Variant C. Omit `title` to render
  // just the cards (useful inside other layouts).
  title?: string;
  // Optional right-hand eyebrow ("3 live" in the export).
  eyebrow?: string;
  // Forces the "concluded" layout — drops the glow/breathing and uses a
  // calmer hairline instead. Defaults to treating empty startedAt as live.
  variant?: 'live' | 'concluded';
}

export function LiveTables({
  tables,
  title,
  eyebrow,
  variant = 'live',
}: Props) {
  if (tables.length === 0) {
    return (
      <div
        className="flex items-center justify-center font-[var(--font-body)] text-[var(--color-fg-muted)] italic"
        style={{
          padding: '48px 24px',
          border: '1px solid rgba(244,185,66,0.10)',
          borderRadius: 10,
          background: 'var(--color-bg-surface)',
          fontSize: 14,
        }}
      >
        Şu anda gösterilecek maç yok.
      </div>
    );
  }

  return (
    <section>
      {(title || eyebrow) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h2
              className="m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
              style={{
                fontSize: 22,
                fontWeight: 500,
                fontStyle: 'italic',
                letterSpacing: 0,
              }}
            >
              {title}
            </h2>
          )}
          {eyebrow && (
            <span
              className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[var(--color-accent-live)]"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
              }}
            >
              <LiveDot size={6} />
              {eyebrow}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {tables.map((t) => (
          <LiveTableCard key={t.id} table={t} variant={variant} />
        ))}
      </div>
    </section>
  );
}

function LiveTableCard({
  table,
  variant,
}: {
  table: LiveTable;
  variant: 'live' | 'concluded';
}) {
  const isLive = variant === 'live';
  const borderColor = isLive
    ? 'rgba(255,107,53,0.28)'
    : 'rgba(244,185,66,0.10)';

  return (
    <article
      className={isLive ? 'animate-breath' : undefined}
      style={{
        background: 'var(--color-bg-surface)',
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: 0,
        overflow: 'hidden',
        boxShadow: isLive
          ? '0 0 0 1px var(--color-accent-live), 0 0 20px rgba(255,107,53,0.35)'
          : 'none',
      }}
    >
      {/* Header strip: LIVE eyebrow + ticking timer */}
      <header
        className="flex items-center justify-between"
        style={{
          padding: '14px 18px 10px',
          borderBottom: '1px solid rgba(244,185,66,0.08)',
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 font-[var(--font-mono)]"
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: isLive ? 'var(--color-accent-live)' : 'var(--color-fg-muted)',
          }}
        >
          {isLive && <LiveDot size={6} />}
          {isLive ? `CANLI · masa ${table.tableNumber}` : `masa ${table.tableNumber} · biten`}
        </span>
        <LiveTimer startedAt={table.startedAt} tick={isLive} />
      </header>

      {/* Hex snapshot — real map scaled down, warm hairline frame */}
      <div
        className="flex items-center justify-center"
        style={{
          padding: '16px 18px 14px',
          background:
            'radial-gradient(ellipse at 50% 55%, rgba(244,185,66,0.05) 0%, transparent 65%)',
          borderBottom: '1px solid rgba(244,185,66,0.08)',
        }}
      >
        <HexMap map={table.map} hexSize={14} className="max-h-[220px] w-auto" />
      </div>

      {/* Player roster — avatar stack + name + VP */}
      <ul
        className="flex flex-col"
        style={{ padding: '12px 18px 16px', gap: 8, listStyle: 'none', margin: 0 }}
      >
        {table.players.map((p, i) => {
          const leader =
            table.players.reduce(
              (max, cur) => Math.max(max, cur.finalVp ?? -1),
              -1,
            ) === (p.finalVp ?? -1) && (p.finalVp ?? -1) > 0;

          return (
            <li
              key={i}
              className="flex items-center"
              style={{ gap: 10 }}
            >
              <PlayerAvatar seatCode={p.seatCode} size={28} />
              <span
                className="flex-1 truncate font-[var(--font-body)] text-[var(--color-fg-primary)]"
                style={{ fontSize: 13 }}
              >
                {p.name}
              </span>
              <span
                className="font-[var(--font-mono)] tabular-nums"
                style={{
                  fontSize: 13,
                  color: leader
                    ? 'var(--color-accent-gold)'
                    : 'var(--color-fg-muted)',
                  fontWeight: leader ? 600 : 400,
                }}
              >
                {p.finalVp ?? '—'}{' '}
                <span
                  style={{
                    fontSize: 10,
                    color: 'var(--color-fg-muted)',
                    letterSpacing: '0.1em',
                    fontWeight: 500,
                  }}
                >
                  VP
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

// Live timer — ticks every second when `tick` is true. Colon flickers gold
// each tick, per DESIGN.md. Falls back to the static formatted elapsed
// duration when not live (concluded matches).
function LiveTimer({
  startedAt,
  tick,
}: {
  startedAt: Date | string;
  tick: boolean;
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!tick) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tick]);

  const start =
    typeof startedAt === 'string' ? new Date(startedAt).getTime() : startedAt.getTime();
  const elapsed = Math.max(0, now - start);
  const h = Math.floor(elapsed / 3_600_000);
  const m = Math.floor((elapsed % 3_600_000) / 60_000);
  const s = Math.floor((elapsed % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const display = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  const parts = display.split(':');

  return (
    <span
      className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]"
      style={{
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '-0.01em',
      }}
    >
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && (
            <span className="animate-colon-flicker" style={{ color: 'var(--color-fg-muted)' }}>
              :
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

function LiveDot({ size = 6 }: { size?: number }) {
  return (
    <span
      className="inline-block rounded-full animate-pulse-ember shrink-0"
      style={{
        width: size,
        height: size,
        background: 'var(--color-accent-live)',
        boxShadow: '0 0 10px var(--color-accent-live)',
      }}
    />
  );
}
