import { db, fetchAll } from './db';
import { decryptJSON } from './crypto';
import { bestMatch } from './pure';
export { bestMatch, euclid } from './pure';

let cache = { at: 0, items: [] };

export function invalidateFaceCache() { cache = { at: 0, items: [] }; }

async function loadEmbeddings() {
  if (Date.now() - cache.at < 60_000 && cache.items.length) return cache.items;
  const rows = await fetchAll(() =>
    db().from('face_data').select('student_id, embedding_enc, students!inner(status)').eq('students.status', 'aktif').order('id'));
  const items = [];
  for (const r of rows) {
    try { items.push({ student_id: r.student_id, vec: decryptJSON(r.embedding_enc) }); } catch {}
  }
  cache = { at: Date.now(), items };
  return items;
}

export async function matchDescriptor(descriptor, threshold, margin) {
  return bestMatch(await loadEmbeddings(), descriptor, threshold, margin);
}
