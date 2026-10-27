import { useEffect, useState } from 'react';

export type ListView = 'table' | 'cards';

const KEY = 'list-view';
let known: ListView | null = null; // read once per page load

// how the lists are shown, table or cards: the browser remembers it (both lists share it).
// the first render matches the server's (table); the saved choice comes in right after,
// before any data has arrived, and later views start from it directly
export function useListView() {
  const [view, setView] = useState<ListView>(() => known ?? 'table');
  useEffect(() => {
    if (known) return;
    try {
      known = localStorage.getItem(KEY) === 'cards' ? 'cards' : 'table';
    } catch {
      known = 'table';
    }
    setView(known);
  }, []);
  const choose = (v: ListView) => {
    known = v;
    setView(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {}
  };
  return [view, choose] as const;
}
