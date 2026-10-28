import { useEffect, useState } from 'react';
import type { Coalition, Ranking, RankedStudent } from '@/lib/types';
import { FRESH_MS } from '@/lib/utils';
import { memory } from './memory';

// a campus's ranking as it arrives. a kept one comes as one json; one still being fetched
// comes line by line (lib/server/ranking.ts): the best students first, page after page, so
// the list fills from the top while the rest is on its way, and the coalitions last
export type RankingState = { data?: Ranking; partial: boolean; error?: Error };

const kept = new Map<string, { at: number; data: Ranking }>(); // the complete ones, for this page load
const order = (a: RankedStudent, b: RankedStudent) => b.level - a.level || a.login.localeCompare(b.login);

async function read(campus: string, signal: AbortSignal, show: (s: RankingState) => void) {
  const res = await fetch(`/api/ranking/${campus}`, { credentials: 'same-origin', cache: 'no-store', signal });
  if (res.status === 401) memory.onUnauthorized();
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `request failed (${res.status})`);
  const complete = (data: Ranking) => {
    kept.set(campus, { at: Date.now(), data });
    show({ data, partial: false });
  };
  if (!(res.headers.get('content-type') || '').includes('ndjson')) return complete(await res.json());

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const students: RankedStudent[] = [];
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let more = false;
    for (let i = buffer.indexOf('\n'); i >= 0; i = buffer.indexOf('\n')) {
      const line = JSON.parse(buffer.slice(0, i));
      buffer = buffer.slice(i + 1);
      if (line.error) throw new Error(line.error);
      if (line.students) {
        for (const u of line.students) students.push({ ...u, coal: null });
        more = true;
      }
      if (line.done) {
        const { fetchedAt, coalitions, members } = line.done as { fetchedAt: string; coalitions: Coalition[]; members: Record<string, number> };
        return complete({ fetchedAt, coalitions, students: students.map((u) => ({ ...u, coal: members[u.login] ?? null })).sort(order) });
      }
    }
    if (more) show({ data: { fetchedAt: '', coalitions: [], students: [...students].sort(order) }, partial: true });
  }
  throw new Error('the ranking stopped half way, try again');
}

export function useRanking(campus: string): RankingState {
  const [state, setState] = useState<RankingState & { campus?: string }>({ partial: true });
  useEffect(() => {
    const hit = kept.get(campus);
    setState({ campus, data: hit?.data, partial: !hit });
    if (hit && Date.now() - hit.at < FRESH_MS) return;
    const ctrl = new AbortController();
    // an old copy stays on screen until the new one is whole
    const show = (s: RankingState) => !ctrl.signal.aborted && !(hit && s.partial) && setState({ campus, ...s });
    read(campus, ctrl.signal, show).catch((e: Error) => {
      if (!ctrl.signal.aborted) setState({ campus, data: hit?.data, partial: false, error: e });
    });
    return () => ctrl.abort();
  }, [campus]);
  // the first render for a new campus has nothing of the old one
  if (state.campus !== campus) {
    const hit = kept.get(campus);
    return { data: hit?.data, partial: !hit };
  }
  return state;
}
