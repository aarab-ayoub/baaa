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
      <div className="text-[12px] text-[#8a8a8a] phone:hidden">{a === b ? a : `${a} → ${b}`}</div>
    </div>
  );
}

// "● In progress since Oct 2026" / "● Arrived Oct 2026"
export function MoveCell({ m }: { m: Move }) {
  const [label, color] = MOVES[m.status];
  return (
    <span>
      <Dot color={color} />
      {label}{' '}
      <span className="ml-[4px] text-[12px] text-[#8a8a8a] phone:hidden">{(m.status === 'moving' ? 'since ' : '') + month(m.at)}</span>
    </span>
  );
}
