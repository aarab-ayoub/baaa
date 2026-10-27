'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useApp } from '@/components/app-shell';
import { CampusSelect } from '@/components/campus-select';
import { LevelLink } from '@/components/level-link';
import { StudentCard } from '@/components/student-card';
import { StudentCell } from '@/components/student-cell';
import { CardGrid } from '@/components/ui/card-grid';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dot } from '@/components/ui/dot';
import { FilterBar } from '@/components/ui/filter-bar';
import { FilterSelect } from '@/components/ui/filter-select';
import { Pager } from '@/components/ui/pager';
import { SearchBox } from '@/components/ui/search-box';
import { StatusLine } from '@/components/ui/status-line';
import { ViewToggle } from '@/components/ui/view-toggle';
import { memory } from '@/lib/client/memory';
import { go } from '@/lib/client/nav';
import { useListView } from '@/lib/client/view';
import type { Campus, Ranking, RankedStudent } from '@/lib/types';
import { rankHref, rankState, type RankState } from '@/lib/url-state';
import { clock, PER_PAGE } from '@/lib/utils';

type Row = { u: RankedStudent; rank: number };

const STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'absorbed', label: 'Blackholed' },
];

// filtered + ranked list. students arrive sorted by level; equal level = equal rank
function ranked(students: RankedStudent[], s: Pick<RankState, 'promo' | 'coal' | 'status'>) {
  const out: Row[] = [];
  let rank = 0;
  for (const u of students) {
    if (s.promo && u.promo !== s.promo) continue;
    if (s.coal && u.coal !== s.coal) continue;
    if ((s.status === 'absorbed') !== !!u.bh) continue;
    if (!out.length || u.level !== out[out.length - 1].u.level) rank = out.length + 1;
    out.push({ u, rank });
  }
  return out;
}

export function RankingView() {
  const router = useRouter();
  const params = useSearchParams();
  const { me, defaultCampus, highlight, setHighlight } = useApp();
  const s = rankState(params, defaultCampus);
  const here = rankHref(s);
  const { data: campuses } = useSWR<Campus[]>('/api/campuses');
  const { data: raw, error } = useSWR<Ranking>(`/api/ranking/${s.campus}`);
  const [query, setQuery] = useState(memory.rankQuery);
  const [view, setView] = useListView();
  const [notice, setNotice] = useState<{ text: string; at: string } | null>(null);
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  const data = useMemo(() => {
    if (!raw) return null;
    return {
      ...raw,
      coal: new Map(raw.coalitions.map((c) => [c.id, c])),
      order: [...raw.coalitions].sort((a, b) => b.score - a.score),
      promos: [...new Set(raw.students.map((u) => u.promo).filter(Boolean))].sort().reverse(),
    };
  }, [raw]);
  const all = useMemo(() => (data ? ranked(data.students, s) : []), [data, s.promo, s.coal, s.status]);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(s.page, pages);

  useEffect(() => {
    memory.shownCampus = s.campus;
    memory.lastRank = s;
    if (data) memory.ranking = data;
  }, [here, data]);

  // first visit: open your own promo with your row highlighted (once, when the page opens)
  useEffect(() => {
    if (!memory.firstVisit) return;
    memory.firstVisit = false;
    if (!me) return;
    memory.landing = rankHref({ campus: defaultCampus, promo: me.promo || '', coal: 0, status: 'active', page: 1 });
    memory.scrollPending = true;
    setHighlight(me.login);
    // the router's own replace: this early, next hasn't hooked into the history api yet
    router.replace(memory.landing, { scroll: false });
  }, []);

  // then bring the highlighted row into view, on the page it's on
  useEffect(() => {
    if (!data || !memory.scrollPending) return;
    if (memory.landing && memory.landing !== here) return; // still on the way to your promo
    memory.landing = null;
    if (me && highlight === me.login && s.page === 1) {
      const i = all.findIndex((r) => r.u.login === me.login);
      if (i >= PER_PAGE) return void go(rankHref({ ...s, page: Math.floor(i / PER_PAGE) + 1 }));
    }
    memory.scrollPending = false;
    document.querySelector('[data-hl]')?.scrollIntoView({ block: 'center' });
  });

  function find(q: string) {
    if (!data || !q) return;
    const u = data.students.find((x) => x.login === q);
    if (!u) return setNotice({ text: `No "${q}" on this campus.`, at: here });
    let t: RankState = s;
    let i = all.findIndex((r) => r.u === u);
    if (i < 0) {
      // not in this view: drop the filters that hide them
      t = { ...s, promo: '', coal: 0, status: u.bh ? 'absorbed' : 'active' };
      i = ranked(data.students, t).findIndex((r) => r.u === u);
    }
    setNotice(null);
    setHighlight(q);
    memory.scrollPending = true;
    if (!go(rankHref({ ...t, page: Math.floor(i / PER_PAGE) + 1 }))) redraw();
  }

  const columns: Column<Row>[] = [
    { head: '#', className: 'text-right tabular-nums', cellClassName: 'w-[40px] text-[#8a8a8a]', cell: (r) => String(r.rank) },
    { head: 'Student', cell: (r) => <StudentCell u={r.u} /> },
  ];
  if (!s.coal) {
    columns.push({
      head: 'Coalition',
      className: 'phone:hidden',
      cell: (r) => {
        const c = data?.coal.get(r.u.coal!);
        return c ? <span><Dot color={c.color} />{c.name}</span> : '';
      },
    });
  }
  if (!s.promo) columns.push({ head: 'Promo', cell: (r) => r.u.promo });
  columns.push({ head: 'Level', className: 'text-right tabular-nums', cellClassName: 'font-semibold', cell: (r) => <LevelLink level={r.u.level} /> });
  const tone = (r: Row) => ({ hl: r.u.login === highlight, mine: me?.login === r.u.login, gone: !!r.u.bh });
  const shown = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  let text: string;
  if (notice?.at === here) text = notice.text;
  else if (!data) text = error ? 'Something went wrong: ' + error.message : 'Loading… the first time a campus opens it can take ~20s.';
  else text = all.length ? `${all.length} student${all.length > 1 ? 's' : ''}` : 'Nobody here with these filters.';

  return (
    <section>
      <FilterBar>
        <CampusSelect campuses={campuses} value={s.campus} onChange={(c) => go(rankHref({ campus: c, promo: '', coal: 0, status: 'active', page: 1 }))} />
        <FilterSelect
          label="promo"
          placeholder={data ? 'Promo' : undefined}
          value={s.promo}
          choices={data?.promos.map((y) => ({ value: y, label: y }))}
          onChange={(y) => go(rankHref({ ...s, promo: y, page: 1 }))}
        />
        <FilterSelect
          label="coalition"
          placeholder={data ? 'Coalition' : undefined}
          value={s.coal ? String(s.coal) : ''}
          choices={data?.order.map((c) => ({ value: String(c.id), label: c.name }))}
          onChange={(k) => go(rankHref({ ...s, coal: Number(k) || 0, page: 1 }))}
        />
        <FilterSelect label="status" strong value={s.status} choices={STATUSES} onChange={(v) => go(rankHref({ ...s, status: v as RankState['status'], page: 1 }))} />
        <SearchBox
          label="search a login"
          placeholder="Search a login"
          value={query}
          onChange={(v) => setQuery((memory.rankQuery = v))}
          onSubmit={() => find(query.trim().toLowerCase())}
        />
      </FilterBar>
      <StatusLine text={text} updated={data ? 'updated ' + clock(data.fetchedAt) : ''}>
        <ViewToggle view={view} onChange={setView} />
      </StatusLine>
      {data && view === 'cards' && <CardGrid rows={shown} rowKey={(r) => r.u.login} tone={tone} card={(r) => <StudentCard u={r.u} rank={r.rank} />} />}
      {data && view === 'table' && <DataTable columns={columns} rows={shown} rowKey={(r) => r.u.login} tone={tone} />}
      <Pager page={page} pages={data ? pages : 1} href={(n) => rankHref({ ...s, page: n })} />
    </section>
  );
}
