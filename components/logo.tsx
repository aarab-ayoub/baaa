import { cn } from '@/lib/utils';

// the mark: three peers on a podium, 1st place in green. same shapes as app/icon.svg
// (32x32 grid), framed tighter for the header
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="4 5 24 22" aria-hidden="true" className={cn('size-6 flex-none', className)}>
      <g className="fill-ink">
        <circle cx="8" cy="13" r="3" />
        <rect x="5" y="18" width="6" height="8" rx="1.5" />
        <circle cx="24" cy="16" r="3" />
        <rect x="21" y="21" width="6" height="5" rx="1.5" />
      </g>
      <g className="fill-green">
        <circle cx="16" cy="9" r="3" />
        <rect x="13" y="14" width="6" height="12" rx="1.5" />
      </g>
    </svg>
  );
}

// `compact`: just the mark on phones, where the header also holds the tabs
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      <span className={cn('text-[30px] leading-[36px] font-semibold tracking-[-0.75px] text-ink', compact && 'phone:hidden')}>Peerboard</span>
    </span>
  );
}
