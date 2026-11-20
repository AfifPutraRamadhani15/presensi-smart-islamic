import { handle } from '@/lib/http';
import { destroyStudentSession } from '@/lib/studentAuth';

export const POST = handle(async () => { destroyStudentSession(); return { ok: true }; });