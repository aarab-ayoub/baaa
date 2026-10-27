import 'server-only';

// next can load a module once for pages and again for route handlers or startup, so
// state that must exist once per server (caches, sessions, the api queue) lives here
export function once<T>(name: string, make: () => T): T {
  const g = globalThis as typeof globalThis & { __42rank?: Record<string, unknown> };
  g.__42rank ??= {};
  return (g.__42rank[name] ??= make()) as T;
}
