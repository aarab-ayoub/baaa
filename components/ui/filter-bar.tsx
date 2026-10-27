import type { ReactNode } from 'react';

// the row of filters above a list
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-[10px] flex flex-wrap gap-2">{children}</div>;
}
