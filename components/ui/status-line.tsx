import type { ReactNode } from 'react';

// the line under the filters: how many there are (or what's happening), when the data
// was fetched, and room for controls such as the view toggle
export function StatusLine({ text, updated, children }: { text: string; updated?: string; children?: ReactNode }) {
  return (
    <div className="mt-[6px] mb-[10px] flex min-h-[30px] items-center gap-3 text-[14px]">
      <span className="text-[#8a8a8a]">{text}</span>
      <span className="ml-auto text-[13px] text-[#8a8a8a]">{updated}</span>
      {children}
    </div>
  );
}
