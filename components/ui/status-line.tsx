import type { ReactNode } from 'react';
import { Bone } from '@/components/ui/skeleton';

// the line under the filters: how many there are (or what's happening; a grey bar while
// that's still unknown), and room on the right for controls such as the view toggle
export function StatusLine({ text, children }: { text: string | null; children?: ReactNode }) {
  return (
    <div className="mt-[6px] mb-[10px] flex min-h-[30px] items-center gap-3 text-[14px]">
      {text == null ? <Bone className="h-[14px] w-[96px]" /> : <span className="text-[#8a8a8a]">{text}</span>}
      {children && <div className="ml-auto flex items-center gap-3">{children}</div>}
    </div>
  );
}
