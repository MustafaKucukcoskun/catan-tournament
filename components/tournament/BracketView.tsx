// Ported from Claude Design export:
//   ui_kits/tournament-hub/screens.jsx → BracketScreen (column treatment)
//   preview/components-cards.html (live-ember ring / breathing animation)
//
// Each elimination round is rendered as a column. The live semifinal (if
// present) wears the shadow-live ring + breathing animation. Winners glow
// gold, losers fade to fg-subtle. The rightmost column is a "Championship"
// ornament with a Fraunces italic caption when no finalists are known yet.

import { PlayerAvatar } from './PlayerAvatar';
import { cn } from '@/lib/utils';

export interface BracketPod {
  id: string;
  tableNumber: number;
  roundLabel: string;
  players: {
    seatCode: string;
    name: string;
    isWinner: boolean;
    vp?: number | null;
  }[];
  status: 'pending' | 'live' | 'completed';
}

interface Props { pods: BracketPod[][]; }

export function BracketView({ pods }: Props) {
  // Drop any empty rounds from the backing data
  const rounds = pods.filter(r => r.length > 0);

  if (rounds.length === 0) {
    return (
      <section className="relative overflow-hidden rounded-[var(--radius-lg)] hairline bg-[var(--color-bg-surface)] py-16 px-8 text-center">
        <div className="inline-flex items-center gap-2 font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[var(--color-fg-muted)]">
          <span className="text-[var(--color-fg-subtle)]">⬡</span>
          Eleme bracket&apos;i
        </div>
        <div className="mt-4 font-[var(--font-display)] italic text-[18px] text-[var(--color-fg-muted)]">
          Kazananlar bekleniyor — lig turları bittiğinde bracket burada açılır.
        </div>
      </section>
    );
  }

  return (
    <section>
      <header className="flex items-baseline justify-between mb-5">
        <h2
          className="m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
          style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.005em' }}
        >
          Eleme bracket&apos;i{' '}
          <em
            className="text-[var(--color-accent-gold)]"
            style={{ fontWeight: 400, fontStyle: 'italic' }}
          >
            — merdiven
          </em>
        </h2>
        <span
          className="font-[var(--font-mono)] uppercase tracking-[0.14em] text-[11px] text-[var(--color-fg-muted)]"
        >
          {rounds.length} tur
        </span>
      </header>

      <div
        className="grid gap-5"
        style={{
          gridTemplateColumns: `repeat(${rounds.length + 1}, minmax(200px, 1fr))`,
          alignItems: 'start',
        }}
      >
        {rounds.map((round, ri) => (
          <BracketColumn
            key={ri}
            label={round[0]?.roundLabel ?? `Tur ${ri + 1}`}
            pods={round}
          />
        ))}

        {/* Championship column — the ornamental finalists plate */}
        <div className="flex flex-col gap-3">
          <div
            className="font-[var(--font-mono)] uppercase tracking-[0.14em] text-[10px] text-[var(--color-fg-muted)]"
          >
            Şampiyonluk
          </div>
          <ChampionshipPanel rounds={rounds} />
        </div>
      </div>
    </section>
  );
}

function BracketColumn({ label, pods }: { label: string; pods: BracketPod[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div
        className="font-[var(--font-mono)] uppercase tracking-[0.14em] text-[10px] text-[var(--color-fg-muted)]"
      >
        {label} · {pods.length}
      </div>
      <div className="flex flex-col gap-3">
        {pods.map(pod => (
          <PodCard key={pod.id} pod={pod} />
        ))}
      </div>
    </div>
  );
}

function PodCard({ pod }: { pod: BracketPod }) {
  const isLive = pod.status === 'live';
  const isDone = pod.status === 'completed';
  const winner = pod.players.find(p => p.isWinner);

  return (
    <article
      className={cn(
        'relative rounded-[var(--radius-md)]',
        isLive && 'animate-breath',
      )}
      style={{
        background: 'var(--color-bg-surface)',
        border: isLive
          ? '1px solid rgba(255,107,53,0.40)'
          : isDone
            ? '1px solid rgba(244,185,66,0.22)'
            : '1px solid rgba(244,185,66,0.08)',
        padding: '12px 14px',
        boxShadow: isLive
          ? '0 0 0 1px var(--color-accent-live), 0 0 20px rgba(255,107,53,0.35)'
          : 'none',
      }}
    >
      {/* Head row: pod number eyebrow + status */}
      <header className="flex items-center justify-between mb-2">
        <span
          className="font-[var(--font-mono)] uppercase tracking-[0.14em] text-[10px]"
          style={{
            color: isLive
              ? 'var(--color-accent-live)'
              : isDone
                ? 'var(--color-accent-gold)'
                : 'var(--color-fg-muted)',
          }}
        >
          {isLive && (
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-accent-live)] animate-pulse-ember mr-1.5 align-middle"
              style={{ boxShadow: '0 0 8px var(--color-accent-live)' }}
            />
          )}
          Masa {pod.tableNumber}
        </span>
        {isDone && (
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-muted)]">
            biten
          </span>
        )}
        {pod.status === 'pending' && (
          <span className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--color-fg-subtle)]">
            bekliyor
          </span>
        )}
      </header>

      {/* Player list — tight rows */}
      <ul className="flex flex-col gap-1.5" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {pod.players.map((p, i) => {
          const won = p.isWinner;
          const lost = isDone && !won;
          const rowColor = won
            ? 'var(--color-accent-gold)'
            : lost
              ? 'var(--color-fg-subtle)'
              : 'var(--color-fg-primary)';
          const vpColor = won
            ? 'var(--color-accent-gold)'
            : 'var(--color-fg-muted)';
          return (
            <li
              key={i}
              className="flex items-center justify-between"
              style={{ gap: 8 }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <PlayerAvatar
                  seatCode={p.seatCode}
                  size={22}
                  halo={won ? 'gold-winner' : 'none'}
                />
                <span
                  className="truncate font-[var(--font-body)]"
                  style={{
                    fontSize: 13,
                    color: rowColor,
                    fontWeight: won ? 600 : 400,
                  }}
                >
                  {p.name}
                </span>
              </div>
              <span
                className="font-[var(--font-mono)] tabular-nums"
                style={{
                  fontSize: 12,
                  color: vpColor,
                  fontWeight: won ? 600 : 400,
                }}
              >
                {p.vp != null ? p.vp : '—'}
              </span>
            </li>
          );
        })}
      </ul>

      {winner && isDone && (
        <div
          className="mt-2 pt-2 font-[var(--font-display)] italic text-[11px]"
          style={{
            borderTop: '1px solid rgba(244,185,66,0.10)',
            color: 'var(--color-accent-gold)',
          }}
        >
          {winner.name} geçti
        </div>
      )}
    </article>
  );
}

function ChampionshipPanel({ rounds }: { rounds: BracketPod[][] }) {
  // Try to find a winner in the final round
  const last = rounds[rounds.length - 1];
  const winner = last?.find(p => p.status === 'completed')?.players.find(p => p.isWinner);

  return (
    <div
      className="relative flex flex-col items-center text-center gap-3"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid rgba(244,185,66,0.22)',
        borderRadius: 10,
        padding: '22px 18px',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60 rounded-[10px]"
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(244,185,66,0.12) 0%, transparent 65%)',
        }}
      />
      <svg
        width="32" height="32" viewBox="0 0 24 24"
        fill="none" stroke="var(--color-accent-gold)"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="relative"
        aria-hidden
      >
        <path d="M10 17v.5a2.5 2.5 0 1 1-5 0V17"/>
        <path d="M19 17v.5a2.5 2.5 0 1 1-5 0V17"/>
        <path d="M7 2h10v5a5 5 0 0 1-10 0z"/>
        <path d="M12 7v10"/>
      </svg>

      {winner ? (
        <>
          <PlayerAvatar seatCode={winner.seatCode} size={56} halo="gold-winner" />
          <div
            className="relative font-[var(--font-display)] text-[var(--color-fg-primary)]"
            style={{ fontSize: 17, fontWeight: 600 }}
          >
            {winner.name}
          </div>
          <div
            className="relative font-[var(--font-mono)] text-[var(--color-accent-gold)] uppercase tracking-[0.16em]"
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            şampiyon
          </div>
        </>
      ) : (
        <div
          className="relative font-[var(--font-display)] italic text-[var(--color-fg-muted)]"
          style={{ fontSize: 14, maxWidth: 180 }}
        >
          Finalistler bekleniyor
        </div>
      )}
    </div>
  );
}
