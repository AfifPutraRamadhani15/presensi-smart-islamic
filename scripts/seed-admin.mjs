import './env.mjs';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { console.error('Isi SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env.local'); process.exit(1); }
if (!ADMIN_USERNAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 10) { console.error('Isi ADMIN_USERNAME dan ADMIN_PASSWORD (min. 10 karakter) di .env.local'); process.exit(1); }

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
const { error } = await db.from('admins').upsert({ username: ADMIN_USERNAME.toLowerCase(), full_name: 'Administrator', password_hash: hash, is_active: true }, { onConflict: 'username' });
if (error) { console.error('Gagal:', error.message, '\nPastikan sql/schema.sql sudah dijalankan.'); process.exit(1); }
console.log(`✔ Admin "${ADMIN_USERNAME}" siap. Segera ganti password lewat menu Pengaturan setelah login.`);
