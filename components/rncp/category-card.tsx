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
    // a container: in a narrow card (five side by side) the rows keep only what fits
    <div className="@container min-w-0 rounded-[14px] border border-[#ececec] bg-white">
      <div className="px-3 pt-3 pb-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="m-0 text-[16px] leading-[22px] font-semibold">{category.name}</h3>
          <Verdict ok={t.ok} withPlan={t.okWithPlan} />
        </div>
        <div className="mt-[4px] mb-2 flex flex-wrap gap-x-3 text-[12px] text-[#8a8a8a] tabular-nums">
          {category.xp > 0 && <span>{`${fmt(t.xp)}${plus(t.planXp, fmt(t.planXp))} / ${fmt(category.xp)} XP`}</span>}
          <span>{`${t.count}${plus(t.planCount, `${t.planCount} planned`)} / ${category.count} ${unit}`}</span>
        </div>
        <Bar have={category.xp ? t.xp : t.count} plan={category.xp ? t.planXp : t.planCount} need={category.xp || category.count} />
      </div>
      <ul className="m-0 list-none border-t border-[#f0f0f0] p-0">
        {rows.map((r) => (
          <li key={r.id} className={cn('flex min-h-[36px] items-center gap-[6px] border-b border-[#f5f5f5] px-3 py-[4px] text-[13px] last:border-b-0', r.planned && 'bg-[#f3faef]')}>
            <span aria-hidden="true" title={r.busy ? 'in progress' : undefined} className={cn('size-[7px] flex-none rounded-full', r.done ? 'bg-[#38a169]' : r.planned ? 'bg-green' : r.busy ? 'bg-[#d69e2e]' : 'bg-[#dcdcdc]')} />
            {/* up to two lines, so "Work Experience I" and "II" never end up looking alike */}
            <span className={cn('line-clamp-2 min-w-0 flex-1 leading-[17px] [overflow-wrap:anywhere]', r.done && 'font-medium')} title={r.name}>
              {r.name}
            </span>
            {r.done && <span className="text-[12px] text-[#8a8a8a] tabular-nums">{r.mark}</span>}
            {r.busy && !r.planned && <span className="hidden text-[12px] whitespace-nowrap text-[#b7791f] @min-[17rem]:block">in progress</span>}
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
                className="w-[50px] flex-none px-[6px] py-[1px] text-right text-[12px]"
              />
            )}
            {/* a planned row in a narrow card shows its mark; the card's total has its xp */}
            <span className={cn('w-[48px] flex-none text-right tabular-nums', !r.done && !r.planned && 'text-[#8a8a8a]', r.planned && 'hidden @min-[15rem]:block')}>
              {fmt(r.done ? r.xp : r.planned ? r.planXp : r.baseXp)}
            </span>
            {r.done ? <span className="w-[22px] flex-none" /> : <PlanButton planned={r.planned} name={r.name} onClick={() => onPlan(r.id, r.planned ? null : 100)} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
