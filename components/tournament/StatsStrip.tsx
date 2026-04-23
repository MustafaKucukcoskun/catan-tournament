import { StatTile } from '@/components/ui/StatTile';

interface Props {
  players: number;
  activeMatches: number;
  finishedMatches: number;
  avgVp: number;
  round: string;
  duration: string;
}

export function StatsStrip(props: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <StatTile label="Oyuncular" value={props.players} />
      <StatTile label="Aktif Maç" value={props.activeMatches} live={props.activeMatches > 0} />
      <StatTile label="Biten" value={props.finishedMatches} />
      <StatTile label="Ort. VP" value={props.avgVp.toFixed(1)} />
      <StatTile label="Tur" value={props.round} />
      <StatTile label="Süre" value={props.duration} />
    </div>
  );
}
