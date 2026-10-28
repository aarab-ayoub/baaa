import type { ReactNode } from 'react';

// the line under the filters: how many there are (or what's happening), and room on the
// right for controls such as the view toggle
export function StatusLine({ text, children }: { text: string; children?: ReactNode }) {
  return (
    <div className="mt-[6px] mb-[10px] flex min-h-[30px] items-center gap-3 text-[14px]">
      <span className="text-[#8a8a8a]">{text}</span>
      {children && <div className="ml-auto flex items-center gap-3">{children}</div>}
    </div>
  );
}
