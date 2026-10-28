import { cn } from '@/lib/utils';

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

// a planned project is one you mean to validate: 50 to 125
export const planMark = (v: unknown) => Math.min(125, Math.max(50, Math.round(Number(v)) || 100));

const BADGE = 'inline-flex h-[22px] flex-none items-center rounded-full px-[9px] text-[12px] font-semibold whitespace-nowrap';

// met, met once the plan is done, or not met
export function Verdict({ ok, withPlan }: { ok: boolean; withPlan: boolean }) {
  if (ok) return <span className={cn(BADGE, 'bg-green text-ink')}>OK</span>;
  if (withPlan) return <span className={cn(BADGE, 'border border-green bg-white text-[#3f7d23]')}>OK with plan</span>;
  return <span className={cn(BADGE, 'bg-[#fbeceb] text-[#b3261e]')}>KO</span>;
}

// how far along: what's done in ink, what the plan adds in green
export function Bar({ have, plan = 0, need }: { have: number; plan?: number; need: number }) {
  const done = Math.min(100, (have / need) * 100);
  const more = Math.min(100 - done, (plan / need) * 100);
  return (
    <div aria-hidden="true" className="relative h-[6px] overflow-hidden rounded-full bg-[#efefef]">
      <div className="absolute inset-y-0 left-0 bg-ink" style={{ width: `${done}%` }} />
      {more > 0 && <div className="absolute inset-y-0 bg-green" style={{ left: `${done}%`, width: `${more}%` }} />}
    </div>
  );
}

// add a project to the plan, or take it out
export function PlanButton({ planned, name, onClick }: { planned: boolean; name: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={planned ? 'Take it out of the plan' : 'Plan it'}
      aria-label={planned ? `take ${name} out of the plan` : `plan ${name}`}
      onClick={onClick}
      className={cn(
        'inline-flex size-[26px] flex-none items-center justify-center rounded-full border border-[#e3e3e3] bg-white p-0 text-[16px] leading-none text-[#555] hover:border-ink hover:text-ink',
        planned && 'border-green bg-green text-ink hover:border-ink'
      )}
    >
      {planned ? '×' : '+'}
    </button>
  );
}
