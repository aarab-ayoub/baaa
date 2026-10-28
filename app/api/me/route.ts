import type { NextRequest } from 'next/server';
import { send, sessionOf } from '@/lib/server/http';

export function GET(req: NextRequest) {
  return send({ user: sessionOf(req)?.user ?? null });
}
