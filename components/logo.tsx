import { cn } from '@/lib/utils';

// the mark: a podium, 1st place in coral. same bars as app/icon.svg (32x32 grid),
// framed tighter for the header
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="4 5 24 22" aria-hidden="true" className={cn('size-6 flex-none', className)}>
      <rect x="5" y="12" width="6" height="14" rx="1.5" className="fill-ink" />
      <rect x="13" y="6" width="6" height="20" rx="1.5" className="fill-coral" />
      <rect x="21" y="17" width="6" height="9" rx="1.5" className="fill-ink" />
    </svg>
  );
}

// `compact`: just the mark on phones, where the header also holds the tabs
export function Logo({ compact, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <LogoMark />
      <span className={cn('text-[30px] leading-[36px] font-semibold tracking-[-0.75px] text-ink', compact && 'phone:hidden')}>42 rank</span>
    </span>
  );
}
