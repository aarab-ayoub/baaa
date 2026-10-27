import { useMemo } from 'react';
import { FilterSelect, type ChoiceGroup } from '@/components/ui/filter-select';
import type { Campus } from '@/lib/types';

// every campus, grouped by country (the api list comes sorted that way)
export function CampusSelect({ campuses, value, onChange }: { campuses?: Campus[]; value: string; onChange: (id: string) => void }) {
  const groups = useMemo(() => {
    const out: ChoiceGroup[] = [];
    for (const c of campuses ?? []) {
      if (out.at(-1)?.label !== c.country) out.push({ label: c.country, choices: [] });
      out.at(-1)!.choices.push({ value: String(c.id), label: c.name });
    }
    return out;
  }, [campuses]);
  return <FilterSelect label="campus" strong value={value} groups={groups} onChange={onChange} />;
}
