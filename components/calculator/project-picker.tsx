import { useRef, useState } from 'react';
import type { Project } from '@/lib/types';
import { cn, fmt } from '@/lib/utils';

const ITEM = 'flex cursor-pointer justify-between gap-3 rounded-[6px] px-[10px] py-[8px] text-[14px] hover:bg-[#f3f3f3]';

// project search: type, arrows to move, enter or click to add
export function ProjectPicker({ projects, onAdd }: { projects?: Project[]; onAdd: (p: Project) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [results, setResults] = useState<Project[] | null>(null); // null: closed
  const [active, setActive] = useState(0);

  const close = () => setResults(null);
  const search = (value: string) => {
    const q = value.trim().toLowerCase();
    if (!projects || !q) return close();
    const starts: Project[] = [];
    const has: Project[] = [];
    for (const p of projects) {
      const n = p.name.toLowerCase();
      if (n.startsWith(q)) starts.push(p);
      else if (n.includes(q)) has.push(p);
    }
    setResults(starts.concat(has).slice(0, 8));
    setActive(0);
  };
  const add = (p: Project) => {
    onAdd(p);
    setText('');
    close();
    input.current?.focus();
  };

  return (
    <div className="relative">
      <input
        ref={input}
        id="proj"
        type="search"
        placeholder="Add a project"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={!!results}
        aria-controls="proj-results"
        aria-autocomplete="list"
        aria-label="add a project"
        className="rounded-[12px_12px_0_0] border-0 px-[14px] py-[12px] text-[15px]"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          search(e.target.value);
        }}
        onFocus={(e) => search(e.target.value)}
        onBlur={() => setTimeout(close, 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!results?.length) return;
            setActive((active + (e.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length);
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results?.[active]) add(results[active]);
          } else if (e.key === 'Escape') {
            close();
          }
        }}
      />
      {results && (
        <ul
          id="proj-results"
          role="listbox"
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-[5] m-0 max-h-[320px] list-none overflow-auto rounded-[10px] border border-[#e3e3e3] bg-white p-[4px] shadow-[0_8px_24px_rgba(0,0,0,.08)]"
        >
          {results.length ? (
            results.map((p, i) => (
              <li
                key={p.id}
                role="option"
                aria-selected={i === active}
                className={cn(ITEM, i === active && 'bg-[#f3f3f3]')}
                onMouseDown={(e) => {
                  e.preventDefault(); // keep focus in the input
                  add(p);
                }}
              >
                <span>{p.name}</span>
                <span className="text-[#8a8a8a]">{fmt(p.xp) + ' xp'}</span>
              </li>
            ))
          ) : (
            <li className={cn(ITEM, 'cursor-default text-[#8a8a8a] hover:bg-transparent')}>No project with that name</li>
          )}
        </ul>
      )}
    </div>
  );
}
