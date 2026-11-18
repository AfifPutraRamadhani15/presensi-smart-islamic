import { handle } from '@/lib/http';
import { destroySession, getAdmin } from '@/lib/auth';
import { audit } from '@/lib/log';

export const POST = handle(async (req) => {
  await audit(await getAdmin(), 'LOGOUT', null, req);
  destroySession();
  return { ok: true };
});
