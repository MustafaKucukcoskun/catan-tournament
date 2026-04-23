'use server';
import { getServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { pairLeagueRound, type PairingPlayer } from '@/lib/tournament/pairing';
import { seedBracket } from '@/lib/tournament/bracket';
import { generateMap } from '@/lib/map/generator';
import type { MapRules } from '@/lib/map/validator';
import { computeLeaderboard } from '@/lib/tournament/recompute';
import { rankPlayers, detectCutoffTies } from '@/lib/tournament/tiebreaker';

export async function startTournament(tournamentId: string) {
  const sb = getServerClient();
  await sb.from('tournaments').update({
    status: 'league',
    started_at: new Date().toISOString(),
    current_round: 1,
    current_round_type: 'league',
  }).eq('id', tournamentId);
  await generateLeagueRound(tournamentId, 1);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export async function generateLeagueRound(tournamentId: string, roundNumber: number) {
  const sb = getServerClient();

  const { data: tournament } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!tournament) return { error: 'Tournament not found' };

  const { data: playersData } = await sb.from('players').select('*').eq('tournament_id', tournamentId);
  const { data: stats } = await sb.from('leaderboard_stats').select('*').eq('tournament_id', tournamentId);
  const statMap = new Map((stats ?? []).map(s => [s.player_id, s]));

  // Fetch previous league rounds' opponents to satisfy Swiss repeat-avoidance (BUG-1).
  const { data: prevLeagueRounds } = await sb.from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round_type', 'league')
    .lt('round_number', roundNumber);

  const prevOpponents = new Map<string, Set<string>>();
  if (prevLeagueRounds && prevLeagueRounds.length > 0) {
    const prevRoundIds = prevLeagueRounds.map(r => r.id);
    const { data: prevTables } = await sb.from('match_tables')
      .select('id')
      .in('round_id', prevRoundIds);
    if (prevTables && prevTables.length > 0) {
      const prevTableIds = prevTables.map(tbl => tbl.id);
      const { data: prevTPs } = await sb.from('table_players')
        .select('match_table_id, player_id')
        .in('match_table_id', prevTableIds);

      if (prevTPs) {
        const tableToPlayers = new Map<string, string[]>();
        for (const tp of prevTPs) {
          if (!tableToPlayers.has(tp.match_table_id)) tableToPlayers.set(tp.match_table_id, []);
          tableToPlayers.get(tp.match_table_id)!.push(tp.player_id);
        }
        for (const players of tableToPlayers.values()) {
          for (const pid of players) {
            if (!prevOpponents.has(pid)) prevOpponents.set(pid, new Set());
            for (const other of players) {
              if (other !== pid) prevOpponents.get(pid)!.add(other);
            }
          }
        }
      }
    }
  }

  const pairingPlayers: PairingPlayer[] = (playersData ?? []).map(p => ({
    id: p.id,
    totalVp: statMap.get(p.id)?.total_vp ?? 0,
    previousOpponents: prevOpponents.get(p.id) ?? new Set<string>(),
  }));

  const tables = pairLeagueRound({ players: pairingPlayers, roundNumber });

  const { data: round } = await sb
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      round_number: roundNumber,
      round_type: 'league',
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const map = generateMap({
      seed: `${tournamentId}-r${roundNumber}-t${i + 1}`,
      rules: tournament.map_rules as unknown as MapRules,
      retryCount: (tournament.map_rules as any)?.retry_count ?? 500,
    });
    const { data: mt } = await sb
      .from('match_tables')
      .insert({
        round_id: round!.id,
        table_number: i + 1,
        seat_count: t.seatCount,
        status: 'live',
        started_at: new Date().toISOString(),
        map_data: map as any,
        map_seed: map.seed,
      })
      .select('id')
      .single();

    const seatRows = t.players.map((p, seat) => ({
      match_table_id: mt!.id,
      player_id: p.id,
      seat_position: seat + 1,
    }));
    await sb.from('table_players').insert(seatRows);
  }

  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

export interface ScoreEntry {
  playerId: string;
  finalVp: number;
  isWinner?: boolean;
}

export async function enterScore(
  matchTableId: string,
  entries: ScoreEntry[],
  tournamentId: string
) {
  const sb = getServerClient();

  // Determine winner: highest VP unless explicit winner flag set
  const explicitWinner = entries.find(e => e.isWinner);
  const autoWinner = explicitWinner ?? entries.reduce((max, e) => e.finalVp > max.finalVp ? e : max);

  for (const e of entries) {
    await sb.from('table_players')
      .update({ final_vp: e.finalVp, is_winner: e.playerId === autoWinner.playerId })
      .eq('match_table_id', matchTableId)
      .eq('player_id', e.playerId);
  }
  await sb.from('match_tables')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', matchTableId);

  await recomputeLeaderboard(tournamentId);
  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

async function recomputeLeaderboard(tournamentId: string) {
  const sb = getServerClient();

  const { data: rounds } = await sb.from('rounds')
    .select('id,round_type')
    .eq('tournament_id', tournamentId)
    .eq('round_type', 'league');

  if (!rounds?.length) return;
  const roundIds = rounds.map(r => r.id);

  const { data: tables } = await sb.from('match_tables')
    .select('id,seat_count,status')
    .in('round_id', roundIds)
    .eq('status', 'completed');

  if (!tables?.length) return;
  const tableIds = tables.map(t => t.id);

  const { data: tps } = await sb.from('table_players')
    .select('match_table_id,player_id,final_vp,is_winner')
    .in('match_table_id', tableIds);

  const matchResults = (tables).map(t => ({
    matchTableId: t.id,
    seatCount: t.seat_count as 3 | 4,
    players: (tps ?? [])
      .filter(tp => tp.match_table_id === t.id && tp.final_vp !== null)
      .map(tp => ({
        playerId: tp.player_id,
        finalVp: tp.final_vp!,
        isWinner: tp.is_winner ?? false,
      })),
  }));

  const stats = computeLeaderboard(matchResults);
  const ranked = rankPlayers(stats);

  // Upsert each stat with rank
  for (let i = 0; i < ranked.length; i++) {
    const s = ranked[i];
    await sb.from('leaderboard_stats').upsert({
      tournament_id: tournamentId,
      player_id: s.playerId,
      matches_played: (s as any).matchesPlayed ?? 0,
      wins: s.wins,
      total_vp: s.totalVp,
      vp_percent: s.vpPercent,
      best_single_vp: s.bestSingleVp,
      rank: i + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tournament_id,player_id' });
  }
}

export async function advanceRound(tournamentId: string) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return { error: 'Not found' };

  // Mark current round completed
  await sb.from('rounds')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('tournament_id', tournamentId)
    .eq('round_number', t.current_round)
    .eq('round_type', t.current_round_type!);

  if (t.current_round_type === 'league') {
    if (t.current_round < t.league_rounds) {
      await sb.from('tournaments')
        .update({ current_round: t.current_round + 1 })
        .eq('id', tournamentId);
      await generateLeagueRound(tournamentId, t.current_round + 1);
      return { ok: true };
    }
    // Transition to elimination
    await recomputeLeaderboard(tournamentId);
    const { data: stats } = await sb.from('leaderboard_stats')
      .select('*')
      .eq('tournament_id', tournamentId)
      .order('rank', { ascending: true })
      .limit(t.elimination_count);
    const ties = detectCutoffTies(
      (stats ?? []).map(s => ({
        playerId: s.player_id, totalVp: s.total_vp, wins: s.wins,
        vpPercent: Number(s.vp_percent), bestSingleVp: s.best_single_vp, h2hWins: {},
      })),
      t.elimination_count
    );
    if (ties.length > 0) {
      return { cutoffTies: ties };  // admin modal'ı açılır
    }
    await startEliminationBracket(tournamentId, stats ?? []);
  } else {
    // Eleme turu ilerletimi — kazananları topla, yeni tur yarat
    await advanceEliminationRound(tournamentId);
  }

  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

/**
 * Admin-facing resolver for BUG-2 cutoff ties. Given the ordering chosen in the
 * modal, rewrite the leaderboard ranks for the tied cluster so subsequent calls to
 * detectCutoffTies no longer fire, then start elimination directly (skipping
 * recompute — which would overwrite our manual ranks via rankPlayers' random
 * fallback).
 */
export async function resolveTieAndAdvance(tournamentId: string, orderedPlayerIds: string[]) {
  const sb = getServerClient();
  if (orderedPlayerIds.length === 0) return { error: 'Boş sıralama' };

  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return { error: 'Turnuva bulunamadı' };

  const { data: clusterStats } = await sb.from('leaderboard_stats')
    .select('player_id, rank')
    .eq('tournament_id', tournamentId)
    .in('player_id', orderedPlayerIds);
  if (!clusterStats || clusterStats.length === 0) return { error: 'Lider tablosu kaydı bulunamadı' };

  const ranks = clusterStats.map(s => s.rank ?? Number.MAX_SAFE_INTEGER);
  const minRank = Math.min(...ranks);

  // Assign sequential ranks starting from the cluster's anchor (minRank) in the
  // admin-chosen order. This breaks the perfect tie that detectCutoffTies picked up.
  for (let i = 0; i < orderedPlayerIds.length; i++) {
    await sb.from('leaderboard_stats')
      .update({ rank: minRank + i })
      .eq('tournament_id', tournamentId)
      .eq('player_id', orderedPlayerIds[i]);
  }

  // Now fetch the top-N directly and start elimination, skipping recompute
  // (which would blow away our manual ordering). The round was already marked
  // completed by the initial advanceRound call.
  const { data: topStats } = await sb.from('leaderboard_stats')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('rank', { ascending: true })
    .limit(t.elimination_count);

  await startEliminationBracket(tournamentId, topStats ?? []);

  revalidatePath(`/t/${tournamentId}`);
  revalidatePath(`/admin/t/${tournamentId}`);
  return { ok: true };
}

async function startEliminationBracket(tournamentId: string, topN: any[]) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return;

  const players = topN.map(s => ({ id: s.player_id, rank: s.rank }));
  const tables = seedBracket(players, t.elimination_count);

  await sb.from('tournaments').update({
    status: 'elimination',
    current_round: 1,
    current_round_type: 'elimination',
  }).eq('id', tournamentId);

  const { data: round } = await sb.from('rounds').insert({
    tournament_id: tournamentId,
    round_number: 1,
    round_type: 'elimination',
    status: 'active',
    started_at: new Date().toISOString(),
  }).select('id').single();

  for (let i = 0; i < tables.length; i++) {
    const pod = tables[i];
    const map = generateMap({
      seed: `${tournamentId}-elim1-t${i + 1}`,
      rules: t.map_rules as unknown as MapRules,
      retryCount: (t.map_rules as any)?.retry_count ?? 500,
    });
    const { data: mt } = await sb.from('match_tables').insert({
      round_id: round!.id,
      table_number: i + 1,
      seat_count: 4,
      status: 'live',
      started_at: new Date().toISOString(),
      map_data: map as any,
      map_seed: map.seed,
    }).select('id').single();

    await sb.from('table_players').insert(pod.map((p, seat) => ({
      match_table_id: mt!.id,
      player_id: p.id,
      seat_position: seat + 1,
    })));
  }
}

async function advanceEliminationRound(tournamentId: string) {
  const sb = getServerClient();
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tournamentId).single();
  if (!t) return;

  const { data: rounds } = await sb.from('rounds').select('id').eq('tournament_id', tournamentId)
    .eq('round_type', 'elimination').eq('round_number', t.current_round);
  if (!rounds?.[0]) return;

  const { data: tables } = await sb.from('match_tables')
    .select('id, status')
    .eq('round_id', rounds[0].id);
  if (!tables?.length) return { error: 'Hiç eleme masası yok' };

  // BUG-12: block advance until every current table is completed.
  const allDone = tables.every(tbl => tbl.status === 'completed');
  if (!allDone) return { error: 'Tüm masalar tamamlanmadı' };

  const { data: winners } = await sb.from('table_players')
    .select('player_id,match_table_id')
    .in('match_table_id', tables.map(tbl => tbl.id))
    .eq('is_winner', true);

  const winnerIds = (winners ?? []).map(w => w.player_id);

  // BUG-12: guard against 0 winners (admin unset is_winner on all rows, impossible-but-defensive).
  if (winnerIds.length === 0) return { error: 'Hiç kazanan bulunamadı' };

  if (winnerIds.length === 1) {
    // Final — şampiyon ilan et
    await sb.from('tournaments').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    }).eq('id', tournamentId);
    return { ok: true };
  }

  // BUG-5: re-seed winners by rank through seedBracket for proper tier seeding.
  const { data: winnerStats } = await sb.from('leaderboard_stats')
    .select('player_id, rank')
    .eq('tournament_id', tournamentId)
    .in('player_id', winnerIds);

  const rankedWinners = (winnerStats ?? [])
    .filter(s => s.rank !== null)
    .map(s => ({ id: s.player_id, rank: s.rank! }))
    .sort((a, b) => a.rank - b.rank);

  // If stats are missing for some winners, fall back to inserting them with max rank to keep ordering stable.
  for (const wid of winnerIds) {
    if (!rankedWinners.find(r => r.id === wid)) {
      rankedWinners.push({ id: wid, rank: Number.MAX_SAFE_INTEGER });
    }
  }

  const podTables = seedBracket(rankedWinners, rankedWinners.length);

  const nextRoundNum = t.current_round + 1;
  await sb.from('tournaments').update({ current_round: nextRoundNum }).eq('id', tournamentId);

  const { data: newRound } = await sb.from('rounds').insert({
    tournament_id: tournamentId,
    round_number: nextRoundNum,
    round_type: 'elimination',
    status: 'active',
    started_at: new Date().toISOString(),
  }).select('id').single();

  for (let i = 0; i < podTables.length; i++) {
    const pod = podTables[i];
    const map = generateMap({
      seed: `${tournamentId}-elim${nextRoundNum}-t${i + 1}`,
      rules: t.map_rules as unknown as MapRules,
      retryCount: (t.map_rules as any)?.retry_count ?? 500,
    });
    const { data: mt } = await sb.from('match_tables').insert({
      round_id: newRound!.id,
      table_number: i + 1,
      seat_count: pod.length as 3 | 4,
      status: 'live',
      started_at: new Date().toISOString(),
      map_data: map as any,
      map_seed: map.seed,
    }).select('id').single();

    await sb.from('table_players').insert(pod.map((p, seat) => ({
      match_table_id: mt!.id,
      player_id: p.id,
      seat_position: seat + 1,
    })));
  }
  return { ok: true };
}
