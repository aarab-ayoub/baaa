'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useApp } from '@/components/app-shell';
import { fetcher } from '@/lib/client/fetcher';
import { memory } from '@/lib/client/memory';
import type { Project } from '@/lib/types';
import { cn, fmt } from '@/lib/utils';
import { levelToXp, MAX_LEVEL, XP_TABLE, xpToLevel } from '@/lib/xp';
import { BonusToggle, clampMark, Marks, PRESETS } from './marks';
import { gained, PickedList, type Picked } from './picked-list';
import { ProjectPicker } from './project-picker';

const SAVE_KEY = 'calc-v1';
const BIG = 'text-[44px] font-bold leading-[1.1] tracking-[-0.03em] tabular-nums phone:text-[34px]';
const SMALL = 'min-h-[16px] text-[12px] text-[#8a8a8a]';
let keys = 0;

// plain text box so it always reads "11.80" (a number box would show "11,8" on french browsers)
const fix = (level: number) => Math.min(MAX_LEVEL, Math.max(0, Number(level) || 0)).toFixed(2);
const readLevel = (text: string) => {
  const v = parseFloat(text.replace(',', '.'));
  return Math.min(MAX_LEVEL, Math.max(0, Number.isFinite(v) ? v : 0));
};
const LEVEL = /^\d{1,2}(\.\d+)?$/;

// the picked list survives reloads (per browser, nothing sent anywhere)
function restore() {
  const saved = { picked: [] as Picked[], mark: 100, bonus: false };
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return saved;
    saved.picked = (s.picked || [])
      .filter((p: Picked) => p && typeof p.name === 'string' && Number.isFinite(p.xp))
      .map((p: Picked) => ({ key: keys++, id: p.id, name: p.name, xp: p.xp, mark: clampMark(p.mark), bonus: !!p.bonus }));
    saved.mark = clampMark(s.mark ?? 100);
    saved.bonus = !!s.bonus;
  } catch {}
  return saved;
}

export function CalculatorView() {
  const params = useSearchParams();
  const { me } = useApp();
  const { data: projects, error } = useSWR<Project[]>('/api/projects');
  const [saved] = useState(restore);
  const l = params.get('l');
  const [cur, setCur] = useState(() => fix(l && LEVEL.test(l) ? Number(l) : (memory.level ?? me?.level ?? 0)));
  const [mark, setMark] = useState(saved.mark);
  const [other, setOther] = useState(PRESETS.includes(saved.mark) ? '' : String(saved.mark)); // a preset lights its button, anything else lives in the "other" box
  const [bonus, setBonus] = useState(saved.bonus);
  const [picked, setPicked] = useState(saved.picked);
  const [fillText, setFillText] = useState('');
  const [fillMsg, setFillMsg] = useState('');

  useEffect(() => {
    if (l && LEVEL.test(l)) setCur(fix(Number(l)));
  }, [l]);
  useEffect(() => {
    memory.level = readLevel(cur);
  }, [cur]);
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ picked: picked.map(({ key, ...p }) => p), mark, bonus }));
    } catch {}
  }, [picked, mark, bonus]);

  // the campus already loaded has it for free, otherwise ask the api
  async function fill(e: React.FormEvent) {
    e.preventDefault();
    const q = fillText.trim().toLowerCase();
    if (!q) return;
    const loaded = memory.ranking;
    let u: { login: string; level: number } | undefined = loaded?.students.find((x) => x.login === q);
    if (!u) {
      setFillMsg('Looking up ' + q + '…');
      try {
        u = await fetcher<{ login: string; level: number }>('/api/user/' + encodeURIComponent(q));
      } catch (err) {
        setFillMsg(q + ': ' + (err as Error).message);
        return;
      }
    }
    setCur(fix(u.level));
    setFillText('');
    let text = `Using ${u.login}'s level.`;
    const student = loaded?.students.find((x) => x === u);
    if (loaded && student) {
      // the coalition bonus only applies while your coalition is 1st on the campus
      const leads = !!student.coal && loaded.order[0]?.id === student.coal;
      setBonus(leads);
      if (leads) text += ' Their coalition is 1st right now, so the bonus is on.';
    }
    setFillMsg(text);
  }

  const now = readLevel(cur);
  const start = levelToXp(now);
  const total = picked.reduce((n, p) => n + gained(p), 0);
  const endXp = Math.min(start + total, XP_TABLE[MAX_LEVEL]);
  const end = xpToLevel(endXp);
  // bar = progress inside the level you end up in; grey part is where you start from
  const lvl = Math.min(MAX_LEVEL - 1, Math.floor(end));
  const lo = XP_TABLE[lvl];
  const hi = XP_TABLE[lvl + 1];
  const pct = (x: number) => Math.max(0, Math.min(100, ((x - lo) / (hi - lo)) * 100));
  const nowPct = start >= lo ? pct(start) : 0;
  const endPct = pct(endXp);

  const addMsg = error ? 'Could not load projects: ' + error.message : projects ? '' : 'Loading projects…';

  return (
    <section>
      <div className="pt-[28px] pb-[8px] text-center">
        <div className="flex items-baseline justify-center gap-[14px]">
          <input
            id="cur"
            type="text"
            maxLength={5}
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            aria-label="current level"
            className={cn(BIG, 'w-[2.9em] rounded-none border-0 border-b-2 border-dashed border-[#ddd] bg-transparent p-0 pb-[2px] text-right text-[#1a1a1a] [-moz-appearance:textfield] focus:border-b-ink')}
            value={cur}
            onChange={(e) => setCur(e.target.value)}
            onBlur={() => setCur(fix(readLevel(cur)))}
          />
          <span className="text-[26px] text-[#c8c8c8]" aria-hidden="true">
            →
          </span>
          <span className={cn(BIG, 'min-w-[2.9em] text-left text-[#d0d0d0] transition-[color] duration-200 ease-[ease]', total > 0 && 'text-ink')}>{end.toFixed(2)}</span>
        </div>
        <div className="relative mx-auto mt-[18px] h-[6px] max-w-[420px] overflow-hidden rounded-[999px] bg-[#efefef]" aria-hidden="true">
          <div className="absolute top-0 bottom-0 left-0 bg-[#cfcfcf] transition-[width,left] duration-[250ms] ease-[ease]" style={{ width: nowPct + '%' }} />
          <div
            className="absolute top-0 bottom-0 left-0 bg-coral transition-[width,left] duration-[250ms] ease-[ease]"
            style={{ left: nowPct + '%', width: Math.max(0, endPct - nowPct) + '%' }}
          />
        </div>
        <p className="mt-[10px] mb-0 min-h-[18px] text-[13px] text-[#8a8a8a]">
          {total > 0 && (
            <>
              <span className="font-medium text-[#1a1a1a]">{`+${(end - now).toFixed(2)} levels · +${fmt(total)} xp`}</span>
              <span className="text-[#c0c0c0]"> · </span>
            </>
          )}
          <span>{end >= MAX_LEVEL ? 'max level' : `${fmt(hi - endXp)} xp to level ${lvl + 1}`}</span>
        </p>
        <form className="mx-auto mt-[14px] max-w-[220px]" onSubmit={fill}>
          <input
            type="search"
            placeholder="use another login's level"
            maxLength={32}
            autoComplete="off"
            spellCheck={false}
            aria-label="use another login's level"
            className="rounded-[999px] border-transparent bg-[#f5f5f5] px-[12px] py-[5px] text-center text-[12px] focus:border-[#d6d6d6] focus:bg-white"
            value={fillText}
            onChange={(e) => setFillText(e.target.value)}
          />
        </form>
        <p className={cn(SMALL, 'mt-[6px] mb-0')}>{fillMsg}</p>
      </div>

      <div className="mt-[26px] rounded-[12px] border border-[#e3e3e3] focus-within:border-[#c8c8c8]">
        <ProjectPicker projects={projects} onAdd={(p) => setPicked([...picked, { key: keys++, id: p.id, name: p.name, xp: p.xp, mark, bonus }])} />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f0f0f0] px-[10px] py-[8px]">
          <Marks
            mark={mark}
            other={other}
            onPreset={(m) => {
              setMark(m);
              setOther('');
              document.getElementById('proj')?.focus();
            }}
            onOther={(text) => {
              setOther(text);
              setMark(text === '' ? 100 : clampMark(text));
            }}
          />
          <BonusToggle on={bonus} onChange={setBonus} />
        </div>
      </div>
      <p className={cn(SMALL, 'mt-[4px] mb-[10px]')}>{addMsg}</p>

      <PickedList
        picked={picked}
        onChange={(key, over) => setPicked(picked.map((p) => (p.key === key ? { ...p, ...over } : p)))}
        onRemove={(key) => setPicked(picked.filter((p) => p.key !== key))}
      />
      {picked.length >= 2 && (
        <div className="pt-[8px] text-right">
          <button type="button" className="border-0 bg-transparent px-[4px] py-0 text-[12px] text-[#999] hover:text-[#c0392b]" onClick={() => setPicked([])}>
            clear all
          </button>
        </div>
      )}
      {!picked.length && <p className="pt-[30px] pb-[10px] text-center text-[13px] text-[#8a8a8a]">Add a project to see where it takes you.</p>}
    </section>
  );
}
