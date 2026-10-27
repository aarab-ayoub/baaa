import 'server-only';

// next can load a module once for pages and again for route handlers or startup, so
// state that must exist once per server (caches, sessions, the api queue) lives here
export function once<T>(name: string, make: () => T): T {
  const g = globalThis as typeof globalThis & { __peerboard?: Record<string, unknown> };
  g.__peerboard ??= {};
  return (g.__peerboard[name] ??= make()) as T;
}
