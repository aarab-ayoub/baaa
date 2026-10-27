import { COALITION_BONUS } from '@/lib/xp';
import { cn, fmt } from '@/lib/utils';
import { clampMark, PILL, PILL_ON } from './marks';

export type Picked = { key: number; id: number; name: string; xp: number; mark: number; bonus: boolean };

export const gained = (p: Picked) => Math.round(((p.xp * p.mark) / 100) * (p.bonus ? COALITION_BONUS : 1));

// the projects added so far; editing a mark keeps what you typed in the box
export function PickedList({ picked, onChange, onRemove }: { picked: Picked[]; onChange: (key: number, over: Partial<Picked>) => void; onRemove: (key: number) => void }) {
  return (
    <ul className="m-0 mt-[14px] list-none p-0">
      {picked.map((p) => (
        <li key={p.key} className="flex items-center gap-[14px] border-b border-[#f2f2f2] px-[4px] py-[10px] phone:flex-wrap phone:gap-[6px]">
          <div className="min-w-0 flex-1 text-[14px] phone:basis-full">
            <div className="overflow-hidden text-ellipsis whitespace-nowrap">{p.name}</div>
            <div className="text-[12px] text-[#9a9a9a]">{fmt(p.xp) + ' xp'}</div>
          </div>
          <div className="flex items-center gap-[6px] phone:ml-auto">
            <input
              type="number"
              min={0}
              max={125}
              step={1}
              defaultValue={p.mark}
              aria-label={'mark for ' + p.name}
              className={cn(PILL, 'box-border w-[54px] px-[6px] py-[4px] text-center focus:border-[#1a1a1a]')}
              onChange={(e) => onChange(p.key, { mark: clampMark(e.target.value) })}
            />
            <button
              type="button"
              title="coalition 1st bonus"
              aria-pressed={p.bonus}
              className={cn(PILL, 'cursor-pointer hover:border-[#bbb]', p.bonus && PILL_ON)}
              onClick={() => onChange(p.key, { bonus: !p.bonus })}
            >
              +4.2%
            </button>
            <span className="w-[70px] text-right text-[13px] font-medium tabular-nums">{'+' + fmt(gained(p))}</span>
            <button
              type="button"
              title="remove"
              aria-label={'remove ' + p.name}
              className="border-0 bg-transparent py-0 pr-[2px] pl-[6px] text-[18px] text-[#c0c0c0]"
              onClick={() => onRemove(p.key)}
            >
              ×
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
