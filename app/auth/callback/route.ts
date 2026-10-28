import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';
import { API, CURSUS, FT_SECRET, FT_UID, REDIRECT_URI } from '@/lib/server/config';
import { cookie, redirect } from '@/lib/server/http';
import { localImage } from '@/lib/server/images';
import { SESSION_MS, startSession } from '@/lib/server/sessions';
import { PHOTO_OVERRIDES } from '@/lib/server/students';
import type { Me } from '@/lib/types';

const FAILED = '/?login=failed';
const DENIED = '/?login=denied';

type ApiMe = {
  login: string;
  kind?: string;
  usual_full_name?: string;
  displayname?: string;
  pool_year?: string;
  image?: { link?: string; versions?: { micro?: string; small?: string } };
  cursus_users?: { cursus_id: number; level: number }[];
  campus_users?: { campus_id: number; is_primary: boolean }[];
  campus?: { id: number }[];
};

function sameToken(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// step 2: 42 sends the student back here with a code
export async function GET(req: NextRequest) {
  const clear = cookie('oauth_state', '', 0);
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const expected = req.cookies.get('oauth_state')?.value;
    // state must match the cookie we set, or someone is trying to log you in as them
    if (!code || !state || !expected || !sameToken(state, expected) || !/^[\w-]{1,200}$/.test(code)) return redirect(FAILED, [clear]);

    const tr = await fetch(`${API}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: FT_UID, client_secret: FT_SECRET, code, redirect_uri: REDIRECT_URI }),
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!tr.ok) return redirect(FAILED, [clear]);
    const { access_token } = await tr.json();

    const mr = await fetch(`${API}/v2/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    if (!mr.ok) return redirect(FAILED, [clear]);
    const me: ApiMe = await mr.json();
    // 42's own students and staff only: partner (external) accounts see nothing
    if (me.kind !== 'student' && me.kind !== 'admin') return redirect(DENIED, [clear]);
    const cu =(me.cursus_users || []).find((c) => c.cursus_id === CURSUS);
    const user: Me = {
      login: me.login,
      name: me.usual_full_name || me.displayname || '',
      img: PHOTO_OVERRIDES[me.login] || localImage(me.image?.versions?.small || me.image?.versions?.micro || me.image?.link),
      level: cu ? cu.level : null,
      promo: me.pool_year || '',
      campus: (me.campus_users || []).find((c) => c.is_primary)?.campus_id || me.campus?.[0]?.id || null,
    };

    const sid = startSession(user);
    return redirect('/', [clear, cookie('sid', sid, SESSION_MS / 1000)]);
  } catch (e) {
    console.error('login:', (e as Error).message);
    return redirect(FAILED, [clear]);
  }
}
