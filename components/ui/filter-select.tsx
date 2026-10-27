import { cn } from '@/lib/utils';

export type Choice = { value: string; label: string };
export type ChoiceGroup = { label: string; choices: Choice[] };

// a native select from the filter bar. its empty choice is just the field name, and
// picking it clears the filter: grey while it shows that, dark once something is picked
// (`strong` ones, like the campus, are always dark)
export function FilterSelect({
  label,
  placeholder,
  value,
  choices = [],
  groups = [],
  strong,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string;
  choices?: Choice[];
  groups?: ChoiceGroup[];
  strong?: boolean;
  onChange: (value: string) => void;
}) {
  const option = (c: Choice) => (
    <option key={c.value} value={c.value}>
      {c.label}
    </option>
  );
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn('flex-[0_1_auto] text-[#8a8a8a] [&_option]:text-[#1a1a1a]', (strong || value) && 'text-[#1a1a1a]')}
    >
      {placeholder != null && <option value="">{placeholder}</option>}
      {choices.map(option)}
      {groups.map((g) => (
        <optgroup key={g.label} label={g.label}>
          {g.choices.map(option)}
        </optgroup>
      ))}
    </select>
  );
}
