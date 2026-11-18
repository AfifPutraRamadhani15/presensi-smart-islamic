import './env.mjs';
import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TABLES = ['admins', 'departments', 'academic_years', 'classes', 'students', 'parent_contacts', 'face_data', 'attendance_settings', 'attendance_sessions', 'attendance_records', 'whatsapp_templates', 'whatsapp_logs', 'notifications', 'chatbot_logs', 'app_settings', 'activity_logs', 'recognition_logs'];
const dir = `backups/${new Date().toISOString().replace(/[:.]/g, '-')}`;
fs.mkdirSync(dir, { recursive: true });
for (const t of TABLES) {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(t).select('*').range(from, from + 999);
    if (error) { console.error(t, error.message); break; }
    all.push(...data); if (data.length < 1000) break;
  }
  fs.writeFileSync(`${dir}/${t}.json`, JSON.stringify(all));
  console.log(`✔ ${t}: ${all.length} baris`);
}
console.log(`\nBackup tersimpan di ${dir}/ (berisi data pribadi & embedding terenkripsi — simpan di tempat aman).`);
