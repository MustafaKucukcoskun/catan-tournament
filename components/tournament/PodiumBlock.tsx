import { PlayerAvatar } from './PlayerAvatar';
import type { LeaderboardRow } from './Leaderboard';

// Ported from the Claude Design export:
//   Variant A (Evening Salon) — PodiumStand: physical stand with giant
//     Fraunces numeral, italic Fraunces name, restrained theatrical gap.
//   Variant C (Amber Atmosphere) — #1 spotlight panel: gold-tinted gradient
//     fill, "★ First place ★" top badge, halo glow, larger avatar.
// This is the marriage the user asked for: Variant A as base, Variant C's
// cinematic treatment reserved for #1.
interface Props {
  top3: LeaderboardRow[];
}

export function PodiumBlock({ top3 }: Props) {
  const first = top3.find((r) => r.rank === 1);
  const second = top3.find((r) => r.rank === 2);
  const third = top3.find((r) => r.rank === 3);

  return (
    <div className="relative">
      {/* Ambient amber-wash — the Variant C kinetic touch, one per podium. */}
      <div
        aria-hidden
        className="absolute pointer-events-none animate-amber-wash-a"
        style={{
          top: -120,
          left: '18%',
          width: 420,
          height: 420,
          background: 'radial-gradient(circle, rgba(244,185,66,0.10) 0%, transparent 60%)',
          zIndex: 0,
        }}
      />
      <div
        aria-hidden
        className="absolute pointer-events-none animate-amber-wash-b"
        style={{
          top: 40,
          right: '8%',
          width: 360,
          height: 360,
          background: 'radial-gradient(circle, rgba(232,93,46,0.08) 0%, transparent 60%)',
          zIndex: 0,
        }}
      />

      <div
        className="relative flex items-end justify-center"
        style={{ gap: 48, padding: '56px 0 40px', zIndex: 1 }}
      >
        {/* #2 — standard PodiumStand */}
        <PodiumStand row={second} place={2} />
        {/* #1 — cinematic spotlight from Variant C */}
        <PodiumStandFirst row={first} />
        {/* #3 — standard PodiumStand */}
        <PodiumStand row={third} place={3} />
      </div>
    </div>
  );
}

// Variant A: physical stand — Fraunces numeral atop a recessed block.
function PodiumStand({ row, place }: { row?: LeaderboardRow; place: 2 | 3 }) {
  if (!row) return <div style={{ flex: '0 0 140px' }} />;

  const height = place === 2 ? 140 : 110;
  const bgColor = place === 2 ? 'rgba(244,185,66,0.04)' : 'rgba(200,86,42,0.04)';
  const halo = place === 2 ? 'silver' : 'bronze';

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: 16, flex: '0 0 140px' }}
    >
      <PlayerAvatar seatCode={row.seatCode} size={72} halo={halo} />
      <div className="text-center">
        <div
          className="font-[var(--font-display)] text-[var(--color-fg-primary)]"
          style={{
            fontStyle: 'italic',
            fontWeight: 500,
            fontSize: 17,
            lineHeight: 1.2,
          }}
        >
          {row.name}
        </div>
        <div
          className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]"
          style={{
            fontSize: 18,
            fontWeight: 600,
            marginTop: 6,
            letterSpacing: '-0.01em',
          }}
        >
          {row.totalVp}{' '}
          <span
            style={{
              fontSize: 11,
              color: 'var(--color-fg-muted)',
              letterSpacing: '0.12em',
              fontWeight: 500,
            }}
          >
            VP
          </span>
        </div>
      </div>
      <div
        className="grid place-items-center font-[var(--font-display)]"
        style={{
          width: 120,
          height,
          background: bgColor,
          border: '1px solid rgba(244,185,66,0.15)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          fontSize: 44,
          fontWeight: 700,
          color: 'rgba(244,185,66,0.40)',
          letterSpacing: '-0.03em',
        }}
      >
        {place}
      </div>
    </div>
  );
}

// Variant C: the cinematic #1 treatment — gold-tinted gradient spotlight
// panel crowned with a "★ First place ★" badge, plus Variant A's physical
// numeral stand below for continuity with the #2/#3 stands.
function PodiumStandFirst({ row }: { row?: LeaderboardRow }) {
  if (!row) return <div style={{ flex: '0 0 200px' }} />;

  return (
    <div
      className="flex flex-col items-center"
      style={{ gap: 18, flex: '0 0 220px' }}
    >
      {/* Spotlight panel */}
      <div
        className="relative flex flex-col items-center text-center"
        style={{
          padding: '36px 30px 28px',
          background:
            'linear-gradient(180deg, rgba(244,185,66,0.10) 0%, rgba(244,185,66,0.02) 100%)',
          border: '1px solid rgba(244,185,66,0.35)',
          borderRadius: 10,
          boxShadow: '0 0 60px rgba(244,185,66,0.18)',
          width: '100%',
        }}
      >
        {/* "★ First place ★" pill — ported from Variant C verbatim */}
        <div
          className="absolute font-[var(--font-mono)]"
          style={{
            top: -13,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 14px',
            background: 'var(--color-bg-deep)',
            border: '1px solid rgba(244,185,66,0.35)',
            borderRadius: 999,
            fontSize: 10,
            letterSpacing: '0.22em',
            color: 'var(--color-accent-gold)',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {'★  Birinci  ★'}
        </div>

        <PlayerAvatar seatCode={row.seatCode} size={104} halo="gold-winner" />

        <div
          className="font-[var(--font-display)] text-[var(--color-fg-primary)]"
          style={{
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 22,
            marginTop: 16,
            lineHeight: 1.15,
            letterSpacing: '-0.005em',
          }}
        >
          {row.name}
        </div>

        <div
          className="font-[var(--font-mono)] tabular-nums"
          style={{
            fontSize: 30,
            fontWeight: 600,
            color: 'var(--color-accent-gold)',
            marginTop: 8,
            letterSpacing: '-0.01em',
            lineHeight: 1,
          }}
        >
          {row.totalVp}
          <span
            style={{
              fontSize: 12,
              color: 'var(--color-fg-muted)',
              letterSpacing: '0.12em',
              fontWeight: 500,
              marginLeft: 6,
            }}
          >
            VP
          </span>
        </div>
        <div
          className="font-[var(--font-body)] text-[var(--color-fg-muted)]"
          style={{
            fontStyle: 'italic',
            fontSize: 13,
            marginTop: 10,
          }}
        >
          {row.wins} galibiyet · {row.matchesPlayed} oynanan
        </div>
      </div>

      {/* Physical numeral stand under the spotlight — continuity with #2/#3 */}
      <div
        className="grid place-items-center font-[var(--font-display)]"
        style={{
          width: 180,
          height: 200,
          background: 'rgba(244,185,66,0.08)',
          border: '1px solid rgba(244,185,66,0.25)',
          borderBottom: 'none',
          borderRadius: '6px 6px 0 0',
          fontSize: 72,
          fontWeight: 700,
          color: 'var(--color-accent-gold)',
          letterSpacing: '-0.03em',
          marginTop: -6,
        }}
      >
        1
      </div>
    </div>
  );
}
