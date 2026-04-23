import Link from 'next/link';
import { Shell } from '@/components/layout/Shell';
import { getServerClient } from '@/lib/supabase/server';

// Editorial hub home — ported from Claude Design export:
//   preview/components-cards.html (featured card anatomy, eyebrow/title/meta)
//   ui_kits/tournament-hub/screens.jsx → DashboardScreen (live pod treatment,
//     "3 live" eyebrow, breathing cards, italic Fraunces flourish)
//   preview/components-podium.html (halo ornament used for finished block)
//
// Layout:
//   1. Hero band with Fraunces display + italic aside + JetBrains Mono
//      metadata strip (players · active pods · round · evening glow)
//   2. Featured active tournaments — highlight-zone bg, large editorial
//      cards with Roman-numeral badge, live dot, player count, phase label
//   3. Recently concluded — restrained mono-label list inside a calm frame
//   4. Empty state — large hex glyph + italic welcome copy

export const dynamic = 'force-dynamic';

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];

function toRoman(n: number | null | undefined): string {
  if (!n || n <= 0) return '—';
  if (n <= 20) return ROMAN[n];
  // crude fallback for larger numbers
  return String(n);
}

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function timeOfDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 6)  return 'late night';
  if (h < 12) return 'morning session';
  if (h < 17) return 'afternoon session';
  if (h < 22) return 'evening session';
  return 'late evening';
}

export default async function HubHome() {
  const sb = getServerClient();
  const { data: active } = await sb.from('tournaments')
    .select('id,name,status,total_players,started_at,current_round,league_rounds,current_round_type')
    .in('status', ['league', 'elimination'])
    .order('started_at', { ascending: false });

  const { data: recentlyFinished } = await sb.from('tournaments')
    .select('id,name,completed_at,total_players')
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(6);

  const activeCount = active?.length ?? 0;
  const finishedCount = recentlyFinished?.length ?? 0;

  return (
    <Shell>
      <div
        style={{ padding: '36px 36px 56px', maxWidth: 1440, margin: '0 auto' }}
        className="flex flex-col gap-10"
      >
        {/* ---------- HERO BAND ---------- */}
        <section
          className="relative pb-8"
          style={{ borderBottom: '1px solid rgba(244,185,66,0.15)' }}
        >
          {/* Warm ambient wash */}
          <div
            aria-hidden
            className="pointer-events-none absolute animate-amber-wash-a"
            style={{
              top: -80, left: '8%', width: 420, height: 320,
              background: 'radial-gradient(circle, rgba(244,185,66,0.09) 0%, transparent 65%)',
              zIndex: 0,
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute animate-amber-wash-b"
            style={{
              top: -20, right: '6%', width: 380, height: 280,
              background: 'radial-gradient(circle, rgba(232,93,46,0.07) 0%, transparent 65%)',
              zIndex: 0,
            }}
          />

          <div className="relative flex items-center gap-3 mb-4">
            <span
              className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
              }}
            >
              Catan Tournament Hub · {timeOfDayGreeting()}
            </span>
            <span
              aria-hidden
              className="flex-1"
              style={{
                height: 1,
                background: 'linear-gradient(to right, rgba(244,185,66,0.30), transparent)',
              }}
            />
          </div>

          <h1
            className="relative m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
            style={{
              fontSize: 'clamp(36px, 5.5vw, 64px)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              lineHeight: 1.04,
            }}
          >
            Tonight&apos;s board is set,{' '}
            <em
              className="text-[var(--color-accent-gold)]"
              style={{ fontWeight: 400, fontStyle: 'italic' }}
            >
              the night is ours
            </em>
          </h1>

          <div className="relative mt-5 flex flex-wrap items-center" style={{ gap: 14 }}>
            <span
              className="inline-flex items-center font-[var(--font-body)] text-[var(--color-fg-muted)]"
              style={{ fontSize: 15, gap: 8 }}
            >
              {activeCount > 0 ? (
                <>
                  <span
                    aria-hidden
                    className="inline-block rounded-full animate-pulse-ember shrink-0"
                    style={{
                      width: 8, height: 8,
                      background: 'var(--color-accent-live)',
                      boxShadow: '0 0 12px var(--color-accent-live)',
                    }}
                  />
                  <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-accent-live)]">
                    {activeCount}
                  </span>
                  {activeCount === 1 ? 'tournament live' : 'tournaments live'}
                </>
              ) : (
                <span className="italic">no live tournaments — quiet hall tonight</span>
              )}
            </span>

            {finishedCount > 0 && (
              <>
                <span style={{ color: 'var(--color-fg-subtle)' }}>·</span>
                <span
                  className="font-[var(--font-body)] text-[var(--color-fg-muted)]"
                  style={{ fontSize: 15 }}
                >
                  <span className="font-[var(--font-mono)] tabular-nums text-[var(--color-fg-primary)]">
                    {finishedCount}
                  </span>{' '}
                  recently concluded
                </span>
              </>
            )}
          </div>
        </section>

        {/* ---------- FEATURED ACTIVE ---------- */}
        {activeCount > 0 ? (
          <section className="relative">
            <SectionHead
              eyebrow="now playing"
              title="Live tournaments"
              italic="— walk in"
              rightLabel={`${activeCount} ${activeCount === 1 ? 'room' : 'rooms'}`}
            />
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)]"
              style={{
                background: 'var(--color-bg-highlight)',
                border: '1px solid rgba(244,185,66,0.18)',
                padding: '22px',
              }}
            >
              {/* Ambient corner glyphs on the highlight zone */}
              <span aria-hidden className="pointer-events-none absolute top-3 left-4 text-[13px] text-[var(--color-fg-subtle)]">⬡</span>
              <span aria-hidden className="pointer-events-none absolute top-3 right-4 text-[13px] text-[var(--color-fg-subtle)]">⬡</span>
              <span aria-hidden className="pointer-events-none absolute bottom-3 left-4 text-[13px] text-[var(--color-fg-subtle)]">⬡</span>
              <span aria-hidden className="pointer-events-none absolute bottom-3 right-4 text-[13px] text-[var(--color-fg-subtle)]">⬡</span>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {active!.map((t, i) => (
                  <FeaturedTournamentCard
                    key={t.id}
                    idx={i}
                    t={t}
                  />
                ))}
              </div>
            </div>
          </section>
        ) : (
          <EmptyState />
        )}

        {/* ---------- RECENTLY FINISHED ---------- */}
        {finishedCount > 0 && (
          <section>
            <SectionHead
              eyebrow="archive"
              title="Recently concluded"
              italic="— look back"
              rightLabel={<Link href="/archive" className="text-[var(--color-accent-ember)] hover:underline">full archive →</Link>}
            />
            <div
              className="flex flex-col"
              style={{
                background: 'var(--color-bg-surface)',
                border: '1px solid rgba(244,185,66,0.10)',
                borderRadius: 10,
                overflow: 'hidden',
              }}
            >
              {recentlyFinished!.map((t, i, arr) => (
                <Link
                  key={t.id}
                  href={`/t/${t.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors"
                  style={{
                    borderBottom:
                      i < arr.length - 1
                        ? '1px solid rgba(244,185,66,0.08)'
                        : 'none',
                  }}
                >
                  {/* date badge */}
                  <div
                    className="flex flex-col items-center justify-center shrink-0"
                    style={{
                      width: 56, height: 56,
                      background: 'var(--color-bg-deep)',
                      border: '1px solid rgba(244,185,66,0.18)',
                      borderRadius: 8,
                    }}
                  >
                    <span
                      className="font-[var(--font-mono)] tabular-nums"
                      style={{
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.12em',
                        color: 'var(--color-fg-muted)',
                        lineHeight: 1,
                      }}
                    >
                      {t.completed_at
                        ? new Date(t.completed_at).toLocaleDateString('tr-TR', { month: 'short' }).slice(0, 3)
                        : '—'}
                    </span>
                    <span
                      className="font-[var(--font-display)] tabular-nums mt-0.5"
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: 'var(--color-fg-primary)',
                        lineHeight: 1,
                      }}
                    >
                      {t.completed_at ? new Date(t.completed_at).getDate() : '—'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className="font-[var(--font-display)] truncate group-hover:text-[var(--color-accent-gold)] transition-colors"
                      style={{
                        fontSize: 18, fontWeight: 600,
                        color: 'var(--color-fg-primary)',
                        letterSpacing: '-0.005em',
                      }}
                    >
                      {t.name}
                    </div>
                    <div
                      className="font-[var(--font-mono)] tabular-nums mt-0.5"
                      style={{
                        fontSize: 12,
                        color: 'var(--color-fg-muted)',
                        letterSpacing: '0.04em',
                      }}
                    >
                      {t.total_players} oyuncu · {formatShortDate(t.completed_at)}
                    </div>
                  </div>

                  <span
                    className="font-[var(--font-mono)] text-[var(--color-fg-subtle)] group-hover:text-[var(--color-accent-ember)] transition-colors"
                    style={{ fontSize: 16 }}
                  >
                    →
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </Shell>
  );
}

// ---------- pieces ----------

function SectionHead({
  eyebrow, title, italic, rightLabel,
}: {
  eyebrow: string;
  title: string;
  italic?: string;
  rightLabel?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between mb-4 gap-4">
      <div>
        <div
          className="font-[var(--font-mono)] text-[var(--color-fg-muted)]"
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.16em',
          }}
        >
          {eyebrow}
        </div>
        <h2
          className="m-0 mt-1 font-[var(--font-display)] text-[var(--color-fg-primary)]"
          style={{
            fontSize: 24, fontWeight: 600, letterSpacing: '-0.005em',
          }}
        >
          {title}
          {italic && (
            <em
              className="text-[var(--color-accent-gold)] ml-1.5"
              style={{ fontWeight: 400, fontStyle: 'italic' }}
            >
              {italic}
            </em>
          )}
        </h2>
      </div>
      {rightLabel !== undefined && (
        <span
          className="font-[var(--font-mono)] text-[var(--color-fg-muted)] shrink-0"
          style={{
            fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em',
          }}
        >
          {rightLabel}
        </span>
      )}
    </div>
  );
}

function FeaturedTournamentCard({
  t, idx,
}: {
  t: {
    id: string;
    name: string;
    status: string;
    total_players: number;
    started_at: string | null;
    current_round: number | null;
    league_rounds: number | null;
    current_round_type: string | null;
  };
  idx: number;
}) {
  const isElim = t.status === 'elimination';
  const phaseLabel = isElim
    ? 'Eleme turu'
    : t.current_round && t.league_rounds
      ? `Lig turu ${t.current_round}/${t.league_rounds}`
      : 'Lig turu';
  const italic = isElim ? 'pressure round' : 'league round';

  return (
    <Link
      href={`/t/${t.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius-lg)] transition-transform hover:-translate-y-0.5"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid rgba(255,107,53,0.30)',
        padding: 0,
        boxShadow: '0 0 0 1px var(--color-accent-live), 0 0 24px rgba(255,107,53,0.30)',
      }}
    >
      {/* breathing animation on the card face */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-[var(--radius-lg)] pointer-events-none animate-breath"
      />

      {/* Header: Roman numeral badge + live eyebrow */}
      <header
        className="relative flex items-center justify-between"
        style={{
          padding: '14px 16px 10px',
          borderBottom: '1px solid rgba(244,185,66,0.10)',
        }}
      >
        <span
          className="inline-flex items-center gap-1.5 font-[var(--font-mono)]"
          style={{
            fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--color-accent-live)',
          }}
        >
          <span
            aria-hidden
            className="inline-block rounded-full animate-pulse-ember shrink-0"
            style={{
              width: 6, height: 6,
              background: 'var(--color-accent-live)',
              boxShadow: '0 0 8px var(--color-accent-live)',
            }}
          />
          LIVE
        </span>

        <span
          className="font-[var(--font-display)] text-[var(--color-accent-gold)]"
          style={{
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: '0.02em',
            fontStyle: 'italic',
          }}
        >
          {toRoman(idx + 1)}
        </span>
      </header>

      {/* Body: title + italic phase */}
      <div className="relative flex-1 px-4 pt-4 pb-3">
        <div
          className="font-[var(--font-display)] text-[var(--color-fg-primary)] group-hover:text-[var(--color-accent-gold)] transition-colors"
          style={{
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.005em',
            lineHeight: 1.2,
          }}
        >
          {t.name}
        </div>
        <div
          className="mt-1 font-[var(--font-display)] italic text-[var(--color-fg-muted)]"
          style={{ fontSize: 13, letterSpacing: '0.005em' }}
        >
          {phaseLabel} — <span className="text-[var(--color-accent-gold)]">{italic}</span>
        </div>
      </div>

      {/* Footer: tabular mono stats */}
      <footer
        className="relative flex items-center gap-4"
        style={{
          padding: '12px 16px 14px',
          borderTop: '1px solid rgba(244,185,66,0.08)',
        }}
      >
        <FooterStat label="players" value={t.total_players} />
        {t.started_at && (
          <>
            <span aria-hidden style={{ color: 'var(--color-fg-subtle)' }}>·</span>
            <FooterStat label="since" value={formatShortDate(t.started_at)} />
          </>
        )}
        <span
          className="ml-auto font-[var(--font-mono)] text-[var(--color-fg-muted)] group-hover:text-[var(--color-accent-ember)] transition-colors"
          style={{ fontSize: 13 }}
        >
          enter →
        </span>
      </footer>
    </Link>
  );
}

function FooterStat({ label, value }: { label: string; value: string | number }) {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 font-[var(--font-mono)] tabular-nums"
      style={{ fontSize: 12, color: 'var(--color-fg-muted)' }}
    >
      <span
        className="text-[var(--color-fg-primary)]"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '0.12em',
        }}
      >
        {label}
      </span>
    </span>
  );
}

function EmptyState() {
  return (
    <section
      className="relative overflow-hidden rounded-[var(--radius-lg)] flex flex-col items-center justify-center text-center"
      style={{
        background: 'var(--color-bg-surface)',
        border: '1px solid rgba(244,185,66,0.10)',
        padding: '72px 24px',
      }}
    >
      {/* Hex watermark */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: '50%', left: '50%',
          transform: 'translate(-50%, -55%)',
          fontSize: 240,
          color: 'rgba(244,185,66,0.04)',
          fontFamily: 'serif',
          lineHeight: 1,
        }}
      >
        ⬡
      </div>

      <div
        className="relative font-[var(--font-mono)] text-[var(--color-fg-muted)] mb-3"
        style={{
          fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em',
        }}
      >
        quiet hall
      </div>
      <h3
        className="relative m-0 font-[var(--font-display)] text-[var(--color-fg-primary)]"
        style={{
          fontSize: 28, fontWeight: 600, letterSpacing: '-0.01em',
        }}
      >
        No tournaments are running right now.
      </h3>
      <p
        className="relative mt-2 font-[var(--font-display)] italic text-[var(--color-fg-muted)] max-w-[420px]"
        style={{ fontSize: 15 }}
      >
        The lanterns are warm, the boards are clean — new rounds will appear here as tournament directors open them.
      </p>
      <Link
        href="/archive"
        className="relative inline-flex items-center gap-2 mt-6 font-[var(--font-mono)] text-[var(--color-accent-ember)] hover:underline"
        style={{
          fontSize: 13,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
        }}
      >
        see the archive <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
