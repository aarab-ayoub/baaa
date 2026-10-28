'use client';

import { useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CategoryCard } from '@/components/rncp/category-card';
import { Bar, PlanButton, Verdict } from '@/components/rncp/parts';
import { StatusLine } from '@/components/ui/status-line';
import { memory } from '@/lib/client/memory';
import { go } from '@/lib/client/nav';
import { usePlan } from '@/lib/client/plan';
import { CORE_END, EXPERIENCES, GROUP_PROJECTS, groupProjects, levelWithPlan, step, SUITE, tally, TITLES, TRACKS, type RncpData, type TrackId } from '@/lib/rncp';
import { cn } from '@/lib/utils';

// the level and track pickers: each row shares the full width evenly
const PICK = 'min-w-0 rounded-full border border-[#e3e3e3] bg-white px-4 py-[9px] text-center text-[14px] font-medium text-[#555] hover:border-ink hover:text-ink';
const PICK_ON = 'border-ink bg-ink text-white hover:text-white';
// every category side by side on a wide screen, two per row on a tablet, one on a phone
const COLUMNS: Record<number, string> = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' };

// one line of the general requirements
function Requirement({ label, note, value, ok, withPlan, children }: { label: string; note: string; value: ReactNode; ok: boolean; withPlan: boolean; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 bg-white px-4 py-3 phone:flex-wrap phone:gap-x-3 phone:gap-y-2">
      <div className="w-[170px] flex-none phone:w-auto phone:flex-1">
        <div className="text-[14px] font-medium">{label}</div>
        <div className="text-[12px] text-[#8a8a8a]">{note}</div>
      </div>
      <div className="min-w-0 flex-1 phone:order-last phone:basis-full">
        <div className="mb-[6px] flex items-center gap-2 text-[14px] tabular-nums">{value}</div>
        {children}
      </div>
      <Verdict ok={ok} withPlan={withPlan} />
    </div>
  );
}

// can you get your RNCP title, and with what: your own record against the title's
// requirements, plus the projects you plan to do
export function RncpView() {
  const params = useSearchParams();
  const track = TRACKS.find((t) => t.id === (params.get('t') ?? memory.rncpTrack)) ?? TRACKS[0];
  const { data, error } = useSWR<RncpData>('/api/rncp');
  const [plan, setPlan] = usePlan();

  useEffect(() => {
    memory.rncpTrack = track.id;
  }, [track.id]);

  const choose = (id: TrackId) => go(`/rncp?t=${id}`);
  const onPlan = (id: number, mark: number | null) => {
    const next = { ...plan };
    if (mark == null) delete next[id];
    else next[id] = mark;
    setPlan(next);
  };

  const pickers = (
    <div className="mb-[10px] grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        {([6, 7] as const).map((n) => (
          <button key={n} type="button" aria-pressed={track.rncp === n} onClick={() => choose(TRACKS.find((t) => t.rncp === n)!.id)} className={cn(PICK, track.rncp === n && PICK_ON)}>
            {`RNCP ${n}`}
            <span className="hidden font-normal opacity-70 md:inline">{` · ${TITLES[n]}`}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TRACKS.filter((t) => t.rncp === track.rncp).map((t) => (
          <button key={t.id} type="button" aria-pressed={t.id === track.id} onClick={() => choose(t.id)} className={cn(PICK, t.id === track.id && PICK_ON)}>
            <span className="hidden md:inline">{t.name}</span>
            <span className="md:hidden">{t.short}</span>
          </button>
        ))}
      </div>
    </div>
  );

  if (!data) {
    return (
      <section>
        {pickers}
        <StatusLine text={error ? 'Something went wrong: ' + error.message : 'Loading your record…'} />
      </section>
    );
  }

  const level = data.level;
  const planned = levelWithPlan(data, plan);
  const core = step(CORE_END, data, plan);
  const groups = groupProjects(data, plan);
  const cards = [...track.categories, SUITE, { ...EXPERIENCES, count: track.experiences }];
  const tallies = cards.map((c) => tally(c, data, plan));
  const checks = [
    { ok: level >= track.level, withPlan: planned >= track.level },
    { ok: data.events >= track.events, withPlan: data.events >= track.events },
    { ok: core.done, withPlan: core.done || core.planned },
    { ok: groups.done >= GROUP_PROJECTS, withPlan: groups.done + groups.planned >= GROUP_PROJECTS },
    ...tallies.map((t) => ({ ok: t.ok, withPlan: t.okWithPlan })),
  ];
  const met = checks.filter((c) => c.ok).length;
  const metWithPlan = checks.filter((c) => c.withPlan).length;
  const plans = Object.keys(plan).length;

  let text: string;
  if (met === checks.length) text = `You meet every requirement of RNCP ${track.rncp}, ${track.name}.`;
  else if (metWithPlan === checks.length) text = `${met} of ${checks.length} requirements met. With your plan: all of them.`;
  else text = `${met} of ${checks.length} requirements met${plans ? `, ${metWithPlan} with your plan` : ''}.`;

  return (
    <section>
      {pickers}
      <StatusLine text={text}>
        {plans > 0 && (
          <button type="button" onClick={() => setPlan({})} className="rounded-full border border-[#e3e3e3] bg-white px-3 py-[3px] text-[13px] text-[#555] hover:border-ink hover:text-ink">
            Clear plan
          </button>
        )}
      </StatusLine>

      {/* two per line on a wide screen; the 1px gaps over a grey background are the lines between them */}
      <div className="mb-3 grid gap-px overflow-hidden rounded-[14px] border border-[#ececec] bg-[#f0f0f0] lg:grid-cols-2">
        <Requirement
          label="Level"
          note="42cursus"
          value={planned > level + 0.005 ? `${level.toFixed(2)} → ${planned.toFixed(2)} with your plan / ${track.level}` : `${level.toFixed(2)} / ${track.level}`}
          ok={checks[0].ok}
          withPlan={checks[0].withPlan}
        >
          <Bar have={Math.min(level, track.level)} plan={Math.max(0, Math.min(planned, track.level) - level)} need={track.level} />
        </Requirement>
        <Requirement label="Events" note="past ones you signed up for" value={`${data.events} / ${track.events}`} ok={checks[1].ok} withPlan={checks[1].withPlan}>
          <Bar have={data.events} need={track.events} />
        </Requirement>
        <Requirement
          label="Common core"
          note="ft_transcendence validated"
          value={
            <>
              <span>{core.done ? 'Done' : core.planned ? 'Planned' : 'Not yet'}</span>
              {!core.done && <PlanButton planned={core.planned} name="ft_transcendence" onClick={() => onPlan(CORE_END, core.planned ? null : 100)} />}
            </>
          }
          ok={checks[2].ok}
          withPlan={checks[2].withPlan}
        />
        <Requirement
          label="Group projects"
          note="after ft_transcendence"
          value={`${groups.done}${groups.planned ? ` + ${groups.planned} planned` : ''} / ${GROUP_PROJECTS}`}
          ok={checks[3].ok}
          withPlan={checks[3].withPlan}
        >
          <Bar have={groups.done} plan={groups.planned} need={GROUP_PROJECTS} />
        </Requirement>
      </div>

      <div data-cards className={cn('grid grid-cols-2 gap-3 phone:grid-cols-1', COLUMNS[cards.length])}>
        {cards.map((c) => (
          <CategoryCard key={c.name} category={c} data={data} plan={plan} onPlan={onPlan} />
        ))}
      </div>
    </section>
  );
}
