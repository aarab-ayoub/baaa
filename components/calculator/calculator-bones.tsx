import { Bone } from '@/components/ui/skeleton';

// the calculator while its code is on its way: the same layout, in grey
export function CalculatorBones() {
  return (
    <section aria-hidden="true">
      <div className="flex flex-col items-center pt-[28px] pb-[8px]">
        <span className="flex items-center gap-[14px]">
          <Bone className="h-[46px] w-[118px]" />
          <span className="text-[26px] text-[#e0e0e0]">→</span>
          <Bone className="h-[46px] w-[118px]" />
        </span>
        <Bone className="mt-[18px] h-[6px] w-full max-w-[420px] rounded-full" />
        <Bone className="mt-[12px] h-[12px] w-[150px]" />
        <Bone className="mt-[16px] h-[28px] w-[220px] rounded-full" />
      </div>
      <div className="mt-[26px] rounded-[12px] border border-[#e3e3e3]">
        <div className="px-[12px] py-[12px]">
          <Bone className="h-[16px] w-[140px]" />
        </div>
        <div className="flex items-center gap-2 border-t border-[#f0f0f0] px-[10px] py-[8px]">
          <Bone className="h-[24px] w-[46px] rounded-full" />
          <Bone className="h-[24px] w-[46px] rounded-full" />
          <Bone className="h-[24px] w-[46px] rounded-full" />
          <Bone className="ml-auto h-[24px] w-[130px] rounded-full" />
        </div>
      </div>
    </section>
  );
}
