'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { useApp } from '@/components/app-shell';
import { CampusSelect } from '@/components/campus-select';
import { LevelLink } from '@/components/level-link';
import { StudentCard } from '@/components/student-card';
import { StudentCell } from '@/components/student-cell';
import { Destination, MoveCell, MoveDate, MOVES, TripCell } from '@/components/transfers/cells';
import { CardGrid } from '@/components/ui/card-grid';
import { DataTable, type Column } from '@/components/ui/data-table';
import { FilterBar } from '@/components/ui/filter-bar';
import { FilterSelect, type ChoiceGroup } from '@/components/ui/filter-select';
import { Pager } from '@/components/ui/pager';
import { SearchBox } from '@/components/ui/search-box';
import { StatusLine } from '@/components/ui/status-line';
import { ViewToggle } from '@/components/ui/view-toggle';
import { COUNTRY_CODES, countryName, flag } from '@/lib/countries';
import { memory } from '@/lib/client/memory';
import { go } from '@/lib/client/nav';
import { useListView } from '@/lib/client/view';
import type { Campus, Move, MoveStatus, Transfers } from '@/lib/types';
import { movesHref, movesState, type MovesState } from '@/lib/url-state';
import { PER_PAGE } from '@/lib/utils';

type Side = 'from' | 'to';

export function TransfersView() {
  const params = useSearchParams();
  const { me, defaultCampus, highlight } = useApp();
  const s = movesState(params, defaultCampus);
  const here = movesHref(s);
  const { data: campuses } = useSWR<Campus[]>('/api/campuses');
  const { data, error } = useSWR<Transfers>(`/api/transfers/${s.campus}`);
  const [query, setQuery] = useState(memory.movesQuery);
  const [view, setView] = useListView();
  const byId = useMemo(() => new Map((campuses ?? []).map((c) => [c.id, c])), [campuses]);
  const promos = useMemo(() => [...new Set((data?.students ?? []).map((u) => u.promo).filter(Boolean))].sort().reverse(), [data]);

  useEffect(() => {
    memory.shownCampus = s.campus;
    memory.lastMoves = s;
  }, [here]);

  // an origin / destination filter is a campus id ("1") or a whole country ("FR")
  const at = (id: number, f: string) => !f || (/^\d+$/.test(f) ? id === Number(f) : COUNTRY_CODES[byId.get(id)?.country ?? ''] === f);

  // filtered list; `skip` leaves one filter out, to count what each of its choices would give
  const q = query.trim().toLowerCase();
  const filtered = (skip?: Side | 'move') =>
    (data?.students ?? []).filter(
      (u) =>
        (skip === 'from' || at(u.from, s.from)) &&
        (skip === 'to' || at(u.to, s.to)) &&
        (skip === 'move' || !s.move || u.status === s.move) &&
        (!s.promo || u.promo === s.promo) &&
        (!q || u.login.includes(q) || u.name.toLowerCase().includes(q))
    );

  // every campus seen on that side of a move, by country, plus the whole country when it has several
  const places = (side: Side): ChoiceGroup[] => {
    const seen = new Set((data?.students ?? []).map((u) => u[side]));
    const rows = filtered(side);
    const count = (f: string) => rows.filter((u) => at(u[side], f)).length;
    const groups = new Map<string, Campus[]>();
    for (const c of byId.values()) {
      if (!seen.has(c.id)) continue;
      if (!groups.has(c.country)) groups.set(c.country, []);
      groups.get(c.country)!.push(c);
    }
    return [...groups].map(([country, list]) => {
      const cc = COUNTRY_CODES[country];
      const choices = list.map((c) => ({ value: String(c.id), label: `${flag(country)} ${c.name} (${count(String(c.id))})` }));
      if (cc && list.length > 1) choices.unshift({ value: cc, label: `${flag(country)} All of ${countryName(country)} (${count(cc)})` });
      return { label: countryName(country), choices };
    });
  };

  const all = filtered();
  const byStatus = filtered('move');
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(s.page, pages);

  const columns: Column<Move>[] = [
    { head: 'Student', cell: (u) => <StudentCell u={u} /> },
    { head: 'Transfer', cell: (u) => <TripCell from={byId.get(u.from)} to={byId.get(u.to)} /> },
  ];
  if (!s.promo) columns.push({ head: 'Promo', className: 'phone:hidden', cell: (u) => u.promo });
  columns.push(
    { head: 'Level', className: 'text-right tabular-nums phone:hidden', cellClassName: 'font-semibold', cell: (u) => <LevelLink level={u.level} /> },
    { head: 'Status', cell: (u) => <MoveCell m={u} /> },
    { head: 'Date', className: 'phone:hidden', cell: (u) => <MoveDate m={u} /> }
  );
  const tone = (u: Move) => ({ hl: u.login === highlight, mine: me?.login === u.login, gone: !!u.bh });
  const shown = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  let text: string;
  if (!data) text = error ? 'Something went wrong: ' + error.message : 'Loading…';
  else if (all.length) text = `${all.length} student${all.length > 1 ? 's' : ''}`;
  else text = data.students.length ? 'Nobody here with these filters.' : 'Nobody is moving to or from this campus.';

  const set = (over: Partial<MovesState>) => go(movesHref({ ...s, ...over, page: over.page ?? 1 }));

  return (
    <section>
      <FilterBar>
        <CampusSelect campuses={campuses} value={s.campus} onChange={(c) => set({ campus: c, from: '', to: '', move: '', promo: '' })} />
        <FilterSelect label="origin" placeholder={data ? 'Origin' : undefined} value={s.from} groups={data ? places('from') : []} onChange={(f) => set({ from: f })} />
        <FilterSelect label="destination" placeholder={data ? 'Destination' : undefined} value={s.to} groups={data ? places('to') : []} onChange={(t) => set({ to: t })} />
        <FilterSelect
          label="status"
          placeholder={data ? 'Status' : undefined}
          value={s.move}
          choices={data ? (Object.keys(MOVES) as MoveStatus[]).map((k) => ({ value: k, label: `${MOVES[k][0]} (${byStatus.filter((u) => u.status === k).length})` })) : []}
          onChange={(m) => set({ move: m as MovesState['move'] })}
        />
        <FilterSelect label="promo" placeholder={data ? 'Promo' : undefined} value={s.promo} choices={promos.map((y) => ({ value: y, label: y }))} onChange={(y) => set({ promo: y })} />
        {/* the search narrows the list as you type */}
        <SearchBox
          label="search a login"
          placeholder="Search a login"
          value={query}
          onChange={(v) => {
            setQuery((memory.movesQuery = v));
            if (s.page > 1) set({ page: 1 });
          }}
        />
      </FilterBar>
      <StatusLine text={text}>
        <ViewToggle view={view} onChange={setView} />
      </StatusLine>
      {data && view === 'cards' && (
        <CardGrid
          rows={shown}
          rowKey={(u) => u.login}
          tone={tone}
          card={(u) => (
            <StudentCard u={u}>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#f0f0f0] pt-3 text-[13px]">
                <MoveCell m={u} />
                <Destination to={byId.get(u.to)} />
              </div>
            </StudentCard>
          )}
        />
      )}
      {data && view === 'table' && (
        <div className="overflow-x-auto">
          <DataTable columns={columns} rows={shown} rowKey={(u) => u.login} tone={tone} />
        </div>
      )}
      <Pager page={page} pages={data ? pages : 1} href={(n) => movesHref({ ...s, page: n })} />
    </section>
  );
}
