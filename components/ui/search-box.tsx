import { cn } from '@/lib/utils';

// a search field in its own form, so enter submits it without leaving the page
export function SearchBox({
  label,
  placeholder,
  value,
  onChange,
  onSubmit,
  className,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  className?: string;
}) {
  return (
    <form
      className={cn('m-0 flex-[1_1_160px]', className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <input
        type="search"
        placeholder={placeholder}
        maxLength={32}
        autoComplete="off"
        spellCheck={false}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </form>
  );
}
