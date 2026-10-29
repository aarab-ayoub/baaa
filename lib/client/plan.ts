import { useEffect, useState } from 'react';
import { RNCP_PROJECTS, type Plan } from '@/lib/rncp';

const KEY = 'rncp-plan';

// the projects you plan to do and the mark you expect: your own choices, kept in this
// browser so the simulation is still there next time
export function usePlan() {
  const [plan, setPlan] = useState<Plan>({});
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, unknown>;
      const clean: Plan = {};
      // only projects the page still shows (a plan from an older version may have others)
      for (const [id, mark] of Object.entries(saved)) if (RNCP_PROJECTS.has(Number(id)) && typeof mark === 'number') clean[Number(id)] = mark;
      setPlan(clean);
    } catch {}
  }, []);
  const save = (next: Plan) => {
    setPlan(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };
  return [plan, save] as const;
}
