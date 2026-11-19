import { db, must } from './db';

export async function getSettings() {
  // login_bg (foto besar) sengaja dikecualikan agar setiap halaman tetap ringan
  const rows = must(await db().from('app_settings').select('key,value').neq('key', 'login_bg'));
  return Object.fromEntries(rows.map((r) => [r.key, r.value ?? '']));
}

export async function setSettings(obj) {
  const rows = Object.entries(obj).map(([key, value]) => ({ key, value: String(value ?? '') }));
  if (rows.length) must(await db().from('app_settings').upsert(rows, { onConflict: 'key' }));
}

// Pengaturan aman untuk halaman publik (tanpa rahasia)
export const PUBLIC_KEYS = ['app_name','school_name','academic_year','theme_primary','tts_enabled','tts_template','logo_app','logo_school'];

export function hexToRgbTriplet(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  const h = m ? m[1] : '087F5B';
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(' ');
}