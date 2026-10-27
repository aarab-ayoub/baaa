import { Dot } from '@/components/ui/dot';
import { countryName, flag } from '@/lib/countries';
import type { Campus, Move, MoveStatus } from '@/lib/types';
import { month } from '@/lib/utils';

export const MOVES: Record<MoveStatus, [label: string, color: string]> = {
  moving: ['In progress', '#d69e2e'],
  arrived: ['Arrived', '#38a169'],
};

function Place({ c }: { c?: Campus }) {
  return (
    <span className="whitespace-nowrap">
      <span aria-hidden="true" className="mr-[5px]">
        {flag(c?.country)}
      </span>
      {c ? c.name : '?'}
    </span>
  );
}

// "🇲🇦 Khouribga → 🇫🇷 Paris", with the countries underneath like a student's full name
export function TripCell({ from, to }: { from?: Campus; to?: Campus }) {
  const a = countryName(from?.country);
  const b = countryName(to?.country);
  return (
    <div>
      <div className="phone:whitespace-normal">
        <Place c={from} />
        <span className="mx-[7px] text-[#b0b0b0]">→</span>
        <Place c={to} />
      </div>
      <div className="text-[13px] text-[#8a8a8a] phone:hidden">{a === b ? a : `${a} → ${b}`}</div>
    </div>
  );
}

// "● In progress" / "● Arrived"
export function MoveCell({ m }: { m: Move }) {
  const [label, color] = MOVES[m.status];
  return (
    <span className="whitespace-nowrap">
      <Dot color={color} />
      {label}
    </span>
  );
}

// when it started (in progress) or when they got there (arrived): "Oct 2026"
export function MoveDate({ m }: { m: Move }) {
  return <span className="text-[#8a8a8a] tabular-nums">{month(m.at)}</span>;
}

// where they're going, as on the cards: "🇫🇷 France"
export function Destination({ to }: { to?: Campus }) {
  return (
    <span className="truncate" title={to ? `${to.name}, ${to.country}` : undefined}>
      <span aria-hidden="true" className="mr-[5px]">
        {flag(to?.country)}
      </span>
      {countryName(to?.country)}
    </span>
  );
}
