'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { PlayerAvatar } from './PlayerAvatar';

// LeaderboardRow shape is preserved from the original DB-driven contract so
// that upstream page code (app/t/[id]/page.tsx) does not need to change.
// Visual grammar is ported verbatim from the Claude Design export:
//   ui_kits/tournament-hub/leaderboard-shared.jsx  (LeaderboardRow/Header)
//   ui_kits/tournament-hub/leaderboard-salon.jsx   (the "Standings" section)
// Kinetic touches (SparkBurst, italic Fraunces title) come from Variant C.
export interface LeaderboardRow {
  rank: number;
  playerId: string;
  name: string;
  seatCode: string;
  matchesPlayed: number;
  wins: number;
  totalVp: number;
  isActive?: boolean;
}

// Shared grid template used by both header and rows — keeps column widths
// locked in tight visual rhythm, exactly like the export.
const GRID_COLS = '48px 44px 1fr 60px 60px 80px 60px';

interface LeaderboardProps {
  rows: LeaderboardRow[];
  // When provided, shows "after round N" eyebrow metadata like Variant A.
  roundLabel?: string;
  // Slice rows to skip top-N (use 3 when PodiumBlock already renders top 3).
  skipTop?: number;
  // Section heading override (Variant A uses "Standings", Variant C uses "the field").
  title?: string;
  // Section title visual treatment — 'italic' matches Variant C ("the field").
  titleStyle?: 'plain' | 'italic';
}

export function Leaderboard({
  rows,
  roundLabel,
  skipTop = 0,
  title = 'Sıralama',
  titleStyle = 'plain',
}: LeaderboardProps) {
  const visibleRows = skipTop > 0 ? rows.slice(skipTop) : rows;
  // Position copy like "sıralama 4 — 10" in the Variant C right-hand eyebrow.
  const positionsLabel =
    skipTop > 0 && visibleRows.length > 0
      ? `sıralama ${skipTop + 1} — ${skipTop + visibleRows.length}`
      : null;

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4">
        <h2
          className="m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
          style={{
            fontSize: 24,
            fontWeight: titleStyle === 'italic' ? 500 : 600,
            fontStyle: titleStyle === 'italic' ? 'italic' : 'normal',
            letterSpacing: titleStyle === 'italic' ? 0 : '-0.005em',
          }}
        >
          {title}
        </h2>
        {(roundLabel || positionsLabel) && (
          <span
            className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
            style={{
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.16em',
            }}
          >
            {roundLabel ?? positionsLabel}
          </span>
        )}
      </div>

      <div
        className="bg-[var(--color-bg-surface)] overflow-hidden"
        style={{
          border: '1px solid rgba(244,185,66,0.10)',
          borderRadius: 10,
        }}
      >
        <LeaderboardHeader />
        <AnimatePresence initial={false}>
          {visibleRows.map((r) => (
            <LeaderboardRowView key={r.playerId} row={r} />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function LeaderboardHeader() {
  const headers = ['#', '', 'Oyuncu', 'Oynanan', 'Galibiyet', 'VP', 'Trend'];
  return (
    <div
      className="grid items-center bg-[var(--color-bg-elevated)]"
      style={{
        gridTemplateColumns: GRID_COLS,
        gap: 12,
        padding: '10px 18px',
        borderBottom: '1px solid rgba(244,185,66,0.20)',
      }}
    >
      {headers.map((h, i) => (
        <span
          key={i}
          className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            fontWeight: 500,
            textAlign: i >= 3 ? 'right' : 'left',
          }}
        >
          {h}
        </span>
      ))}
    </div>
  );
}

// Spark-burst wrapper ported from components-v2.jsx. Fires a one-shot gold
// ring around the row whenever the VP value changes — the "score update"
// signature motion from DESIGN.md.
function SparkBurst({ trigger, children }: { trigger: number; children: React.ReactNode }) {
  const [bursts, setBursts] = useState<number[]>([]);
  const prev = useRef(trigger);
  useEffect(() => {
    if (prev.current !== trigger) {
      const id = Math.random();
      setBursts((b) => [...b, id]);
      const t = setTimeout(() => setBursts((b) => b.filter((x) => x !== id)), 700);
      prev.current = trigger;
      return () => clearTimeout(t);
    }
  }, [trigger]);
  return (
    <div className="relative">
      {children}
      {bursts.map((id) => (
        <div
          key={id}
          className="absolute pointer-events-none animate-spark"
          style={{
            inset: -4,
            borderRadius: 6,
            boxShadow: '0 0 0 2px #F4B942, 0 0 24px rgba(244,185,66,0.6)',
          }}
        />
      ))}
    </div>
  );
}

function LeaderboardRowView({ row }: { row: LeaderboardRow }) {
  // Deterministic trend placeholder — we don't have historical data in DB yet,
  // so render an em-dash. Upstream can later provide a real trend by widening
  // LeaderboardRow. Never a random value; trend must be stable per render.
  // The branches below stay intact so that once LeaderboardRow carries a real
  // `trend: string` field it's one edit to wire it up.
  const trend: string = '—';
  const trendColor =
    trend === '—'
      ? 'var(--color-fg-subtle)'
      : trend.startsWith('+')
        ? 'var(--color-accent-seafoam)'
        : 'var(--color-fg-muted)';

  const rankColor =
    row.rank === 1
      ? 'var(--color-accent-gold)'
      : row.rank <= 3
        ? 'var(--color-fg-primary)'
        : 'var(--color-fg-muted)';

  const vpColor =
    row.rank === 1 ? 'var(--color-accent-gold)' : 'var(--color-fg-primary)';

  const borderBottom = row.isActive
    ? '1px solid rgba(255,107,53,0.28)'
    : '1px solid rgba(244,185,66,0.08)';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.3, type: 'spring', bounce: 0.3 }}
      className="relative"
    >
      <SparkBurst trigger={row.totalVp}>
        <div
          className="grid items-center transition-[background] duration-200 ease-out"
          style={{
            gridTemplateColumns: GRID_COLS,
            gap: 12,
            padding: '10px 18px',
            borderBottom,
            background: row.isActive ? 'rgba(255,107,53,0.03)' : 'transparent',
            position: 'relative',
          }}
        >
          {row.isActive && (
            <span
              className="absolute animate-pulse-ember"
              style={{
                left: 0,
                top: 0,
                bottom: 0,
                width: 2,
                background: 'var(--color-accent-live)',
                boxShadow: '0 0 8px var(--color-accent-live)',
              }}
            />
          )}
          <span
            className="font-[var(--font-mono)] tabular-nums"
            style={{
              color: rankColor,
              fontWeight: row.rank <= 3 ? 600 : 400,
              fontSize: 13,
            }}
          >
            {String(row.rank).padStart(2, '0')}
          </span>
          <PlayerAvatar
            seatCode={row.seatCode}
            size={32}
            halo={
              row.rank === 1
                ? 'gold-winner'
                : row.rank === 2
                  ? 'silver'
                  : row.rank === 3
                    ? 'bronze'
                    : row.isActive
                      ? 'pulse-live'
                      : 'none'
            }
          />
          <span
            className="flex items-center gap-2 font-[var(--font-body)] text-[var(--color-fg-primary)]"
            style={{ fontSize: 14 }}
          >
            <span className="truncate">{row.name}</span>
            {row.isActive && (
              <span
                className="inline-flex items-center gap-1.5 font-[var(--font-mono)] text-[var(--color-accent-live)]"
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                }}
              >
                <LiveDotInline size={6} />
                canlı
              </span>
            )}
          </span>
          <span
            className="text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]"
            style={{ fontSize: 13 }}
          >
            {row.matchesPlayed}
          </span>
          <span
            className="text-right font-[var(--font-mono)] tabular-nums text-[var(--color-fg-muted)]"
            style={{ fontSize: 13 }}
          >
            {row.wins}
          </span>
          <motion.span
            key={row.totalVp}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, type: 'spring' }}
            className="text-right font-[var(--font-mono)] tabular-nums"
            style={{
              fontSize: 16,
              color: vpColor,
              fontWeight: row.rank <= 3 ? 600 : 400,
            }}
          >
            {row.totalVp}
          </motion.span>
          <span
            className="text-right font-[var(--font-mono)] tabular-nums"
            style={{ fontSize: 11, color: trendColor }}
          >
            {trend}
          </span>
        </div>
      </SparkBurst>
    </motion.div>
  );
}

function LiveDotInline({ size = 8 }: { size?: number }) {
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
