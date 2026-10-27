import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { API, FT_UID, REDIRECT_URI } from '@/lib/server/config';
import { cookie, redirect } from '@/lib/server/http';

// login with 42 (oauth authorization code), step 1: off to 42 with a state we'll check
export function GET(req: NextRequest) {
  // cookies are per host name, so start on the same host 42 will send us back to
  const home = new URL(REDIRECT_URI);
  if (req.headers.get('host') !== home.host) return redirect(`${home.origin}/auth/login`);
  const state = crypto.randomBytes(32).toString('base64url');
  const q = new URLSearchParams({ client_id: FT_UID, redirect_uri: REDIRECT_URI, response_type: 'code', scope: 'public', state });
  return redirect(`${API}/oauth/authorize?${q}`, [cookie('oauth_state', state, 600)]);
}
