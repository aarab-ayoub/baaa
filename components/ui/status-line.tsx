// the line under the filters: how many there are (or what's happening), and when
// the data was fetched
export function StatusLine({ text, updated }: { text: string; updated?: string }) {
  return (
    <div className="mt-[6px] mb-[8px] flex min-h-[20px] items-baseline gap-3 text-[14px]">
      <span className="text-[#8a8a8a]">{text}</span>
      <span className="ml-auto text-[13px] text-[#8a8a8a]">{updated}</span>
    </div>
  );
}
