// called once when the server starts, before it takes any request
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const { boot } = await import('./lib/server/boot');
  boot();
}
