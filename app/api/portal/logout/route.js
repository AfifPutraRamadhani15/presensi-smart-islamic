import { handle } from '@/lib/http';
import { destroyStudentSession } from '@/lib/portalAuth';

export const POST = handle(async () => { destroyStudentSession(); return { ok: true }; });