// Fungsi murni (tanpa dependensi) agar mudah diuji.
export function euclid(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return Math.sqrt(s);
}

// Mencocokkan 1 descriptor ke seluruh wajah terdaftar.
// Diterima hanya jika jarak terbaik <= threshold DAN selisih dengan siswa lain >= margin.
export function bestMatch(items, descriptor, threshold, margin) {
  const per = new Map();
  for (const it of items) {
    const d = euclid(descriptor, it.vec);
    if (!per.has(it.student_id) || d < per.get(it.student_id)) per.set(it.student_id, d);
  }
  const sorted = [...per.entries()].sort((a, b) => a[1] - b[1]);
  if (!sorted.length) return { matched: false, reason: 'empty' };
  const [id, dist] = sorted[0];
  const second = sorted[1]?.[1];
  if (dist > threshold) return { matched: false, distance: dist, reason: 'far' };
  if (second !== undefined && second - dist < margin) return { matched: false, distance: dist, reason: 'ambiguous' };
  return { matched: true, student_id: id, distance: dist };
}

export function render(tpl, v) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? `{${k}}`));
}

export function normalizePhone(p) {
  let n = String(p || '').replace(/[^\d]/g, '');
  if (n.startsWith('0')) n = '62' + n.slice(1);
  if (n.startsWith('8')) n = '62' + n;
  return /^62\d{8,13}$/.test(n) ? n : null;
}

