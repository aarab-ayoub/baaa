import 'server-only';
import { get } from './api42';
import { cached } from './cache';
import { CURSUS } from './config';

type ApiMe = { login: string; cursus_users?: { cursus_id: number; level: number }[] };

// level of one student, for the calculator's "use another login's level"
export function userLevel(login: string) {
  return cached(`user:${login}`, async (): Promise<{ login: string; level: number | null }> => {
    let u: ApiMe;
    try {
      u = (await get<ApiMe>(`/v2/users/${login}`)).data;
    } catch (e) {
      if (/-> 404$/.test((e as Error).message)) return { login, level: null };
      throw e;
    }
    const cu = (u.cursus_users || []).find((c) => c.cursus_id === CURSUS);
    return { login: u.login, level: cu ? cu.level : null };
  });
}
