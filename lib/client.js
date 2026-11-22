'use client';
import { useCallback, useEffect, useState } from 'react';

export async function api(url, opts = {}) {
  const init = { ...opts, headers: { ...(opts.body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) } };
  if (opts.body && typeof opts.body !== 'string') init.body = JSON.stringify(opts.body);
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  // 401 pada API login/lupa-sandi = salah sandi (tampilkan pesan, jangan redirect)
  if (r.status === 401 && typeof window !== 'undefined' && !url.includes('/auth/') && !url.includes('/portal/login') && !url.includes('/portal/lupa')) {
    window.location.href = url.includes('/api/portal') ? '/portal/login' : '/login';
  }
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
}

export function toast(msg, type = 'ok') {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('psi-toast', { detail: { msg, type } }));
}

export function useApi(url) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api(url)); setError(null); } catch (e) { setError(e.message); }
    setLoading(false);
  }, [url]);
  useEffect(() => { load(); }, [load]);
  return { data, error, loading, reload: load, setData };
}

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
export const STATUS_COLOR = { hadir: 'bg-emerald/20 text-dark', terlambat: 'bg-gold/30 text-ink', izin: 'bg-blue-100 text-blue-800', sakit: 'bg-purple-100 text-purple-800', tidak_hadir: 'bg-red-100 text-red-700' };
export const STATUS_TEXT = { hadir: 'Hadir', terlambat: 'Terlambat', izin: 'Izin', sakit: 'Sakit', tidak_hadir: 'Tidak Hadir' };
export const ACT_TEXT = { zuhur: 'Salat Zuhur', wirid: 'Wirid Remaja' };

export async function downloadXlsx(filename, rows, sheet = 'Data') {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename);
}