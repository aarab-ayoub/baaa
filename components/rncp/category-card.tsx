'use client';

import { Bar, fmt, planMark, PlanButton, Verdict } from '@/components/rncp/parts';
import { PISCINES, step, tally, type Category, type Plan, type RncpData, type Step } from '@/lib/rncp';
import { cn } from '@/lib/utils';

type Row = Step & { id: number; name: string; mark?: number };

// done first, then planned, then under way, then the rest, each in 42's order
const order = (r: Row) => (r.done ? 0 : r.planned ? 1 : r.busy ? 2 : 3);

// one category of the title: how far you are, and its projects, each one plannable
export function CategoryCard({ category, data, plan, onPlan }: { category: Category; data: RncpData; plan: Plan; onPlan: (id: number, mark: number | null) => void }) {
  const t = tally(category, data, plan);
  const rows: Row[] = category.ids
    .filter((id) => data.catalog[id])
    .map((id) => ({ id, name: data.catalog[id].name, mark: data.projects[PISCINES[id]?.last ?? id]?.mark, ...step(id, data, plan) }))
    .sort((a, b) => order(a) - order(b));
  const unit = category.count > 1 ? 'projects' : 'project';
  const plus = (n: number, text: string) => (n > 0 ? ` + ${text}` : '');
  return (
    <div className="min-w-0 rounded-[14px] border border-[#ececec] bg-white">
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="m-0 text-[17px] font-semibold">{category.name}</h3>
          <Verdict ok={t.ok} withPlan={t.okWithPlan} />
        </div>
        <div className="mt-[4px] mb-2 flex flex-wrap gap-x-4 text-[13px] text-[#8a8a8a] tabular-nums">
          {category.xp > 0 && <span>{`${fmt(t.xp)}${plus(t.planXp, fmt(t.planXp))} / ${fmt(category.xp)} XP`}</span>}
          <span>{`${t.count}${plus(t.planCount, `${t.planCount} planned`)} / ${category.count} ${unit}`}</span>
        </div>
        <Bar have={category.xp ? t.xp : t.count} plan={category.xp ? t.planXp : t.planCount} need={category.xp || category.count} />
      </div>
      <ul className="m-0 list-none border-t border-[#f0f0f0] p-0">
        {rows.map((r) => (
          <li key={r.id} className={cn('flex min-h-[40px] items-center gap-2 border-b border-[#f5f5f5] px-4 py-[5px] text-[14px] last:border-b-0', r.planned && 'bg-[#f3faef]')}>
            <span aria-hidden="true" className={cn('size-[8px] flex-none rounded-full', r.done ? 'bg-[#38a169]' : r.planned ? 'bg-green' : r.busy ? 'bg-[#d69e2e]' : 'bg-[#dcdcdc]')} />
            <span className={cn('min-w-0 flex-1 truncate', r.done && 'font-medium')} title={r.name}>
              {r.name}
            </span>
            {r.done && <span className="text-[12px] text-[#8a8a8a] tabular-nums">{r.mark}</span>}
            {r.busy && !r.planned && <span className="text-[12px] text-[#b7791f]">in progress</span>}
            {r.planned && (
              <input
                type="number"
                min={50}
                max={125}
                defaultValue={plan[r.id]}
                aria-label={`mark you expect for ${r.name}`}
                title="the mark you expect"
                onChange={(e) => onPlan(r.id, planMark(e.target.value))}
                onBlur={(e) => (e.target.value = String(planMark(e.target.value)))}
                className="w-[58px] flex-none px-2 py-[2px] text-right text-[13px]"
              />
            )}
            <span className={cn('w-[62px] flex-none text-right tabular-nums', !r.done && !r.planned && 'text-[#8a8a8a]')}>{fmt(r.done ? r.xp : r.planned ? r.planXp : r.baseXp)}</span>
            {r.done ? <span className="w-[26px] flex-none" /> : <PlanButton planned={r.planned} name={r.name} onClick={() => onPlan(r.id, r.planned ? null : 100)} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
