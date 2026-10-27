import { cn } from '@/lib/utils';

// the small round buttons and boxes of the calculator
export const PILL = 'rounded-[999px] border border-[#e3e3e3] bg-white px-[11px] py-[4px] text-[12px] leading-[1.4] text-[#555]';
export const PILL_ON = 'border-ink bg-ink text-white hover:border-ink';

export const PRESETS = [100, 115, 125];
export const clampMark = (v: unknown) => Math.min(125, Math.max(0, Math.round(Number(v) || 0)));

// 100 / 115 / 125, or any other mark typed in the last box
export function Marks({ mark, other, onPreset, onOther }: { mark: number; other: string; onPreset: (m: number) => void; onOther: (text: string) => void }) {
  return (
    <div className="inline-flex gap-[4px]" role="group" aria-label="mark">
      {PRESETS.map((m) => (
        <button key={m} type="button" className={cn(PILL, 'cursor-pointer hover:border-[#bbb]', mark === m && PILL_ON)} onClick={() => onPreset(m)}>
          {m}
        </button>
      ))}
      <input
        type="number"
        min={0}
        max={125}
        step={1}
        placeholder="other"
        aria-label="other mark"
        className={cn(PILL, 'box-border w-[72px] text-center focus:border-ink')}
        value={other}
        onChange={(e) => onOther(e.target.value)}
      />
    </div>
  );
}

export function BonusToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <label className="cursor-pointer select-none" title="+4.2% xp when your coalition is 1st on your campus at the moment the project is validated">
      <input type="checkbox" className="peer pointer-events-none absolute opacity-0" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span
        className={cn(
          PILL,
          'inline-block peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white',
          'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#9ac]'
        )}
      >
        Coalition 1st +4.2%
      </span>
    </label>
  );
}
