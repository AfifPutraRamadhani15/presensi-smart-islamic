'use client';
import { useState } from 'react';
import { api, useApi, toast } from '@/lib/client';
import { Btn, Card, Field, Modal, PageHead, Spinner, Table, confirmBox } from '@/components/ui';

function Simple({ title, table, fields, rows, reload }) {
  const [edit, setEdit] = useState(null);
  async function save(e) {
    e.preventDefault();
    try { await api(`/api/crud/${table}`, { method: edit.id ? 'PUT' : 'POST', body: edit }); toast('Tersimpan'); setEdit(null); reload(); } catch (x) { toast(x.message, 'err'); }
  }
  async function del(r) {
    if (!(await confirmBox(`Hapus "${r.name}"?`))) return;
    try { await api(`/api/crud/${table}?id=${r.id}`, { method: 'DELETE' }); reload(); } catch (x) { toast(x.message, 'err'); }
  }
  return (
    <Card>
      <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-dark">{title}</h3><Btn onClick={() => setEdit({})}>+ Tambah</Btn></div>
      <Table heads={[...fields.map((f) => f.label), 'Aksi']}>
        {rows.map((r) => (
          <tr key={r.id}>{fields.map((f) => <td key={f.k} className="td">{f.show ? f.show(r) : String(r[f.k] ?? '-')}</td>)}
            <td className="td whitespace-nowrap"><button className="text-primary font-semibold mr-3" onClick={() => setEdit(r)}>Ubah</button><button className="text-red-600 font-semibold" onClick={() => del(r)}>Hapus</button></td></tr>
        ))}
      </Table>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Ubah ${title}` : `Tambah ${title}`}>
        <form onSubmit={save} className="space-y-3">
          {fields.filter((f) => f.input !== false).map((f) => (
            <Field key={f.k} label={f.label}>
              {f.type === 'check' ? <input type="checkbox" checked={!!edit?.[f.k]} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.checked })} />
                : f.options ? <select className="input" value={edit?.[f.k] || ''} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })}><option value="">— pilih —</option>{f.options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                : <input className="input" value={edit?.[f.k] || ''} onChange={(e) => setEdit({ ...edit, [f.k]: e.target.value })} required={f.required} />}
            </Field>
          ))}
          <Btn className="w-full">Simpan</Btn>
        </form>
      </Modal>
    </Card>
  );
}

export default function Kelas() {
  const dep = useApi('/api/crud/departments'), yr = useApi('/api/crud/academic_years'), cls = useApi('/api/crud/classes');
  const stu = useApi('/api/siswa?status=aktif');
  if (!dep.data || !yr.data || !cls.data) return <Spinner />;
  const all = () => { dep.reload(); yr.reload(); cls.reload(); };
  const size = {}; (stu.data || []).forEach((s) => { size[s.class_id] = (size[s.class_id] || 0) + 1; });
  return (
    <>
      <PageHead title="Kelas, Jurusan & Tahun Ajaran" />
      <div className="grid xl:grid-cols-2 gap-4">
        <Simple title="Jurusan" table="departments" rows={dep.data} reload={all} fields={[{ k: 'name', label: 'Nama Jurusan', required: true }]} />
        <Simple title="Tahun Ajaran" table="academic_years" rows={yr.data} reload={all} fields={[{ k: 'name', label: 'Tahun Ajaran (mis. 2026/2027)', required: true }, { k: 'is_active', label: 'Aktif', type: 'check', show: (r) => (r.is_active ? '✅ Aktif' : '-') }]} />
      </div>
      <div className="mt-4">
        <Simple title="Kelas" table="classes" rows={cls.data} reload={all} fields={[
          { k: 'name', label: 'Nama Kelas (mis. XI PPLG 1)', required: true }, { k: 'level', label: 'Tingkat (X/XI/XII)' },
          { k: 'department_id', label: 'Jurusan', options: dep.data, show: (r) => r.departments?.name || '-' },
          { k: 'academic_year_id', label: 'Tahun Ajaran', options: yr.data, show: (r) => r.academic_years?.name || '-' },
          { k: 'size', label: 'Jumlah Siswa Aktif', input: false, show: (r) => size[r.id] || 0 },
        ]} />
      </div>
    </>
  );
}
