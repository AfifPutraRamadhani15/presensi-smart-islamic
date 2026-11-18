// Koneksi Supabase SERVER-ONLY (service role). Jangan pernah di-import dari komponen client.
import { createClient } from '@supabase/supabase-js';

let client;
export function db() {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

// Ambil semua baris (melewati batas 1000 baris bawaan Supabase).
export async function fetchAll(buildQuery, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < pageSize) break;
  }
  return out;
}

export function must({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
