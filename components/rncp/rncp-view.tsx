'use client';

import { useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { CategoryCard } from '@/components/rncp/category-card';
import { Bar, Verdict } from '@/components/rncp/parts';
import { Bone } from '@/components/ui/skeleton';
import { StatusLine } from '@/components/ui/status-line';
import { memory } from '@/lib/client/memory';
import { go } from '@/lib/client/nav';
import { usePlan } from '@/lib/client/plan';
import { GROUP, levelWithPlan, SUITE, tally, TITLES, TRACKS, WORK, type RncpData, type TrackId } from '@/lib/rncp';
import { cn } from '@/lib/utils';

// the level and track pickers: each row shares the full width evenly
const PICK = 'min-w-0 rounded-full border border-[#e3e3e3] bg-white px-4 py-[9px] text-center text-[14px] font-medium text-[#555] hover:border-ink hover:text-ink';
const PICK_ON = 'border-ink bg-ink text-white hover:text-white';
// every category side by side on a wide screen, two per row on a tablet, one on a phone
const COLUMNS: Record<number, string> = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' };

// the page in grey while your record is on its way: the three requirements, then a card per
// category with its rows
function RncpBones({ cards }: { cards: number }) {
  return (
    <div aria-hidden="true">
      <div className="mb-3 grid gap-px overflow-hidden rounded-[14px] border border-[#ececec] bg-[#f0f0f0] md:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col gap-[8px] bg-white px-4 py-3">
            <span className="flex items-start justify-between">
              <span className="flex flex-col gap-[7px]">
                <Bone className="h-[14px] w-[88px]" />
                <Bone className="h-[11px] w-[130px]" />
              </span>
              <Bone className="h-[22px] w-[38px] rounded-full" />
            </span>
            <Bone className="h-[14px] w-[70px]" />
            <Bone className="h-[6px] w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className={cn('grid grid-cols-2 gap-3 phone:grid-cols-1', COLUMNS[cards])}>
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="min-w-0 rounded-[14px] border border-[#ececec] bg-white">
            <div className="flex flex-col gap-[8px] px-3 pt-3 pb-3">
              <span className="flex items-center justify-between">
                <Bone className="h-[16px] w-[100px]" />
                <Bone className="h-[22px] w-[36px] rounded-full" />
              </span>
              <Bone className="h-[11px] w-[120px]" />
              <Bone className="h-[11px] w-[90px]" />
              <Bone className="mt-1 h-[6px] w-full rounded-full" />
            </div>
            <div className="border-t border-[#f0f0f0]">
              {Array.from({ length: 8 }, (_, j) => (
                <span key={j} className="flex min-h-[36px] items-center gap-[6px] border-b border-[#f5f5f5] px-3 last:border-b-0">
                  <Bone className="size-[7px] flex-none rounded-full" />
                  <Bone className="h-[12px] flex-1" />
                  <Bone className="h-[12px] w-[42px] flex-none" />
                  <Bone className="size-[22px] flex-none rounded-full" />
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// one of the general requirements: what it is and its verdict, then where you stand
function Requirement({ label, note, value, ok, withPlan, children }: { label: string; note: string; value: ReactNode; ok: boolean; withPlan: boolean; children?: ReactNode }) {
  return (
    <div className="flex flex-col bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-medium">{label}</div>
          <div className="text-[12px] text-[#8a8a8a]">{note}</div>
        </div>
        <Verdict ok={ok} withPlan={withPlan} />
      </div>
      <div className="mt-auto pt-2">
        <div className="mb-[6px] text-[14px] tabular-nums">{value}</div>
        {children}
      </div>
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
            <span className="hidden font-normal opacity-70 md:inline">{`Option ${t.option} · `}</span>
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
        <StatusLine text={error ? 'Something went wrong: ' + error.message : null} />
        {!error && <RncpBones cards={track.categories.length + 2} />}
      </section>
    );
  }

  const level = data.level;
  const planned = levelWithPlan(data, plan);
  const groups = tally(GROUP, data, plan);
  const cards = [...track.categories, SUITE, WORK];
  const tallies = cards.map((c) => tally(c, data, plan));
  const checks = [
    { ok: level >= track.level, withPlan: planned >= track.level },
    { ok: data.events >= track.events, withPlan: data.events >= track.events },
    { ok: groups.ok, withPlan: groups.okWithPlan },
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

      {/* side by side from a tablet up; the 1px gaps over a grey background are the lines between them */}
      <div className="mb-3 grid gap-px overflow-hidden rounded-[14px] border border-[#ececec] bg-[#f0f0f0] md:grid-cols-3">
        <Requirement
          label="Level"
          note="42cursus"
          value={planned > level + 0.005 ? `${level.toFixed(2)} → ${planned.toFixed(2)} with your plan / ${track.level}` : `${level.toFixed(2)} / ${track.level}`}
          ok={checks[0].ok}
          withPlan={checks[0].withPlan}
        >
          <Bar have={Math.min(level, track.level)} plan={Math.max(0, Math.min(planned, track.level) - level)} need={track.level} />
        </Requirement>
        <Requirement label="Events" note="past ones, not outside or club events" value={`${data.events} / ${track.events}`} ok={checks[1].ok} withPlan={checks[1].withPlan}>
          <Bar have={data.events} need={track.events} />
        </Requirement>
        <Requirement
          label="Group projects"
          note="outside the common core"
          value={`${groups.count}${groups.planCount ? ` + ${groups.planCount} planned` : ''} / ${GROUP.count}`}
          ok={checks[2].ok}
          withPlan={checks[2].withPlan}
        >
          <Bar have={groups.count} plan={groups.planCount} need={GROUP.count} />
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
