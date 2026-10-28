import { cn } from '@/lib/utils';

// a grey shape where something is still on its way, pulsing gently like a heartbeat (still,
// for people who asked their system for less motion)
export function Bone({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('inline-block max-w-full rounded-[6px] bg-[#ececec] align-middle motion-safe:animate-pulse', className)} />;
}

// a student cell still on its way: the photo, the login and the full name under it
export function StudentBone() {
  return (
    <span className="flex items-center gap-3">
      <Bone className="size-[40px] flex-none rounded-full" />
      <span className="flex flex-col gap-[7px]">
        <Bone className="h-[13px] w-[92px]" />
        <Bone className="h-[11px] w-[140px] phone:hidden" />
      </span>
    </span>
  );
}

// a student card still on its way, the same shape as the real one
export function CardBone({ footer }: { footer?: boolean }) {
  return (
    <>
      <span className="flex items-center justify-between">
        <Bone className="h-[12px] w-[28px]" />
        <Bone className="h-[14px] w-[40px]" />
      </span>
      <span className="mt-1 flex justify-center">
        <Bone className="size-[72px] rounded-full" />
      </span>
      <span className="mt-3 flex flex-col items-center gap-[7px]">
        <Bone className="h-[14px] w-[90px]" />
        <Bone className="h-[11px] w-[120px]" />
      </span>
      {footer && (
        <span className="mt-3 flex items-center justify-between border-t border-[#f0f0f0] pt-3">
          <Bone className="h-[12px] w-[70px]" />
          <Bone className="h-[12px] w-[56px]" />
        </span>
      )}
    </>
  );
}
