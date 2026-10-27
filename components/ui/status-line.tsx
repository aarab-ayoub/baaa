// the line under the filters: how many there are (or what's happening), and when
// the data was fetched
export function StatusLine({ text, updated }: { text: string; updated?: string }) {
  return (
    <div className="mt-[4px] mb-[8px] flex min-h-[18px] items-baseline gap-3 text-[13px]">
      <span className="text-[#8a8a8a]">{text}</span>
      <span className="ml-auto text-[12px] text-[#8a8a8a]">{updated}</span>
    </div>
  );
}
