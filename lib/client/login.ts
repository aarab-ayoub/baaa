import { useSyncExternalStore } from 'react';

// on our way to 42 to log in: every login button shows it, and a second click does nothing.
// 42 and the way back can take a few seconds, during which the page itself doesn't change
let busy = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();
const set = (on: boolean) => {
  busy = on;
  clearTimeout(timer);
  // if nothing happened after a while (no network), the button works again
  if (on) timer = setTimeout(() => set(false), 20_000);
  for (const l of listeners) l();
};

// back from 42 with the back button: the page comes back as it was left, so no longer busy
if (typeof window !== 'undefined') addEventListener('pageshow', (e) => e.persisted && set(false));

export function useLoggingIn() {
  const on = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => busy,
    () => false
  );
  return [on, () => set(true)] as const;
}
