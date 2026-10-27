import { memory } from './memory';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

// GET one of our api routes; a 401 means the session is over
export async function fetcher<T>(path: string): Promise<T> {
  const r = await fetch(path, { credentials: 'same-origin', cache: 'no-cache' });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) memory.onUnauthorized();
  if (!r.ok) throw new ApiError(j.error || 'request failed (' + r.status + ')', r.status);
  return j as T;
}
