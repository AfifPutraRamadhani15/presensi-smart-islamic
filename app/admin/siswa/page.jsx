'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, useApi, toast, downloadXlsx } from '@/lib/client';
import { Btn, Card, Empty, Field, Modal, PageHead, Spinner, Table, confirmBox } from '@/components/ui';
import FaceRegister from '@/components/FaceRegister';

const EMPTY = { nis: '', nisn: '', full_name: '', gender: 'L', birth_place: '', birth_date: '', class_id: '', address: '', status: 'aktif', parent_name: '', whatsapp: '', consent_wa: false };

export default function Siswa() {
  const [f, setF] = useState({ q: '', class_id: '', department_id: '', status: '' });
  const qs = useMemo(() => new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString(), [f]);
  const { data, loading, reload } = useApi(`/api/siswa?${qs}`);
  const cls = useApi('/api/crud/classes'), dep = useApi('/api/crud/departments');
  const [edit, setEdit] = useState(null), [view, setView] = useState(null), [face, setFace] = useState(null), [imp, setImp] = useState(null);
  const [qDebounce, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setF((x) => ({ ...x, q: qDebounce })), 350); return () => clearTimeout(t); }, [qDebounce]);

  async function save(e) {
    e.preventDefault();
    try {
      await api(edit.id ? `/api/siswa/${edit.id}` : '/api/siswa', { method: edit.id ? 'PUT' : 'POST', body: edit });
      toast('Data siswa tersimpan'); setEdit(null); reload();
    } catch (x) { toast(x.message, 'err'); }
  }
  async function del(s) {
    if (!(await confirmBox(`Hapus ${s.full_name}? Data wajah dan RIWAYAT PRESENSI siswa ini ikut terhapus permanen. (Alternatif: ubah status menjadi nonaktif.)`))) return;
    try { await api(`/api/siswa/${s.id}`, { method: 'DELETE' }); toast('Siswa dihapus'); reload(); } catch (x) { toast(x.message, 'err'); }
  }
  async function delFace(s) {
    if (!(await confirmBox(`Hapus data wajah ${s.full_name}? Siswa tidak bisa presensi wajah sampai didaftarkan ulang.`))) return;
    try { await api(`/api/siswa/${s.id}/wajah`, { method: 'DELETE' }); toast('Data wajah dihapus'); reload(); } catch (x) { toast(x.message, 'err'); }
  }
  function openEdit(s) {
    setEdit(s ? { ...s, parent_name: s.parent?.parent_name || '', whatsapp: s.parent?.whatsapp || '', consent_wa: !!s.parent?.consent_wa, birth_date: s.birth_date || '' } : { ...EMPTY });
  }
  async function exportX() {
    await downloadXlsx('data-siswa.xlsx', (data || []).map((s) => ({ NIS: s.nis, NISN: s.nisn, Nama: s.full_name, JK: s.gender, Kelas: s.classes?.name, Jurusan: s.departments?.name, 'Tahun Ajaran': s.academic_years?.name, Status: s.status, 'Orang Tua': s.parent?.parent_name, WhatsApp: s.parent?.whatsapp, 'Sampel Wajah': s.face_samples })), 'Siswa');
  }
  async function template() {
    await downloadXlsx('template-import-siswa.xlsx', [{ nis: '12345', nisn: '', nama: 'Contoh Siswa', jk: 'L', tempat_lahir: 'Tapan', tanggal_lahir: '2009-05-17', kelas: 'XI PPLG 1', alamat: '', orang_tua: 'Bapak Contoh', whatsapp: '081234567890' }], 'Siswa');
  }
  async function pickFile(e) {
    const file = e.target.files[0]; if (!file) return;
    const XLSX = await import('xlsx');
    const wb = XLSX.read(await file.arrayBuffer());
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false });
    setImp({ rows, result: null }); e.target.value = '';
  }
  async function doImport() {
    try { const r = await api('/api/siswa/import', { method: 'POST', body: { rows: imp.rows } }); setImp({ ...imp, result: r }); reload(); } catch (x) { toast(x.message, 'err'); }
  }
  const rows = data || [];
  return (
    <>
      <PageHead title="Data Siswa" desc={`${rows.length} siswa`}>
        <Btn onClick={() => openEdit(null)}>+ Tambah Siswa</Btn>
        <label className="btn btn-ghost cursor-pointer">⬆ Impor Excel<input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={pickFile} /></label>
        <Btn variant="ghost" onClick={exportX}>⬇ Ekspor Excel</Btn>
        <Btn variant="ghost" onClick={() => window.print()}>🖨 PDF/Cetak</Btn>
      </PageHead>
      <Card className="mb-4 no-print"><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <input className="input" placeholder="Cari nama / NIS…" value={qDebounce} onChange={(e) => setQ(e.target.value)} />
        <select className="input" value={f.class_id} onChange={(e) => setF({ ...f, class_id: e.target.value })}><option value="">Semua kelas</option>{(cls.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="input" value={f.department_id} onChange={(e) => setF({ ...f, department_id: e.target.value })}><option value="">Semua jurusan</option>{(dep.data || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Semua status</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>
      </div></Card>
      <Card>
        {loading ? <Spinner /> : !rows.length ? <Empty>Belum ada siswa. Tambah manual atau impor Excel.</Empty> : (
          <Table heads={['Foto', 'NIS', 'Nama', 'Kelas', 'Jurusan', 'Status', 'Wajah', 'Aksi']}>
            {rows.map((s) => (
              <tr key={s.id}>
                <td className="td">{s.face_samples ? <img src={`/api/siswa/${s.id}/foto?v=${encodeURIComponent(s.updated_at)}`} alt="" className="w-10 h-10 rounded-full object-cover bg-light" /> : <div className="w-10 h-10 rounded-full bg-light" />}</td>
                <td className="td">{s.nis}</td><td className="td font-semibold">{s.full_name}</td><td className="td">{s.classes?.name || '-'}</td><td className="td">{s.departments?.name || '-'}</td>
                <td className="td"><span className={`badge ${s.status === 'aktif' ? 'bg-emerald/20 text-dark' : 'bg-gray-200'}`}>{s.status}</span></td>
                <td className="td">{s.face_samples ? <span className="badge bg-emerald/20 text-dark">✔ {s.face_samples} sampel</span> : <span className="badge bg-red-100 text-red-700">Belum</span>}</td>
                <td className="td whitespace-nowrap space-x-3">
                  <button className="text-primary font-semibold" onClick={() => setView(s)}>Detail</button>
                  <button className="text-primary font-semibold" onClick={() => openEdit(s)}>Ubah</button>
                  <button className="text-primary font-semibold" onClick={() => setFace(s)}>{s.face_samples ? 'Daftar Ulang' : 'Daftarkan'} Wajah</button>
                  <button className="text-red-600 font-semibold" onClick={() => del(s)}>Hapus</button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Ubah Siswa' : 'Tambah Siswa'} wide>
        {edit && <form onSubmit={save} className="grid sm:grid-cols-2 gap-3">
          <Field label="NIS *"><input className="input" value={edit.nis} onChange={(e) => setEdit({ ...edit, nis: e.target.value })} required /></Field>
          <Field label="NISN"><input className="input" value={edit.nisn || ''} onChange={(e) => setEdit({ ...edit, nisn: e.target.value })} /></Field>
          <Field label="Nama Lengkap *" className="sm:col-span-2"><input className="input" value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} required /></Field>
          <Field label="Jenis Kelamin"><select className="input" value={edit.gender || ''} onChange={(e) => setEdit({ ...edit, gender: e.target.value })}><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></Field>
          <Field label="Status"><select className="input" value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select></Field>
          <Field label="Tempat Lahir"><input className="input" value={edit.birth_place || ''} onChange={(e) => setEdit({ ...edit, birth_place: e.target.value })} /></Field>
          <Field label="Tanggal Lahir"><input type="date" className="input" value={edit.birth_date || ''} onChange={(e) => setEdit({ ...edit, birth_date: e.target.value })} /></Field>
          <Field label="Kelas (jurusan & tahun ajaran mengikuti kelas)" className="sm:col-span-2"><select className="input" value={edit.class_id || ''} onChange={(e) => setEdit({ ...edit, class_id: e.target.value })}><option value="">— pilih kelas —</option>{(cls.data || []).map((c) => <option key={c.id} value={c.id}>{c.name} {c.departments?.name ? `· ${c.departments.name}` : ''} {c.academic_years?.name ? `· ${c.academic_years.name}` : ''}</option>)}</select></Field>
          <Field label="Alamat" className="sm:col-span-2"><input className="input" value={edit.address || ''} onChange={(e) => setEdit({ ...edit, address: e.target.value })} /></Field>
          <Field label="Nama Orang Tua/Wali"><input className="input" value={edit.parent_name} onChange={(e) => setEdit({ ...edit, parent_name: e.target.value })} /></Field>
          <Field label="WhatsApp Orang Tua (08xx / 628xx)"><input className="input" inputMode="tel" value={edit.whatsapp} onChange={(e) => setEdit({ ...edit, whatsapp: e.target.value })} /></Field>
          <label className="sm:col-span-2 text-sm font-semibold"><input type="checkbox" checked={edit.consent_wa} onChange={(e) => setEdit({ ...edit, consent_wa: e.target.checked })} /> Orang tua/wali menyetujui menerima notifikasi WhatsApp</label>
          <Btn className="sm:col-span-2">Simpan</Btn>
        </form>}
      </Modal>

      <Modal open={!!view} onClose={() => setView(null)} title="Detail Siswa">
        {view && <div className="text-sm space-y-1">
          {view.face_samples > 0 && <img src={`/api/siswa/${view.id}/foto?v=${encodeURIComponent(view.updated_at)}`} alt="" className="w-28 h-28 rounded-2xl object-cover mb-2" />}
          {[['NIS', view.nis], ['NISN', view.nisn], ['Nama', view.full_name], ['JK', view.gender], ['TTL', `${view.birth_place || '-'}, ${view.birth_date || '-'}`], ['Kelas', view.classes?.name], ['Jurusan', view.departments?.name], ['Tahun Ajaran', view.academic_years?.name], ['Alamat', view.address], ['Orang Tua', view.parent?.parent_name], ['WhatsApp', view.parent?.whatsapp], ['Persetujuan WA', view.parent?.consent_wa ? 'Ya' : 'Belum'], ['Persetujuan biometrik', view.consent_biometric ? 'Ya' : 'Belum'], ['Sampel wajah', view.face_samples]].map(([k, v]) => <div key={k}><b className="inline-block w-40">{k}</b>{v || '-'}</div>)}
          {view.face_samples > 0 && <Btn variant="danger" className="mt-3" onClick={() => { delFace(view); setView(null); }}>Hapus Data Wajah (hak penghapusan)</Btn>}
        </div>}
      </Modal>

      <Modal open={!!face} onClose={() => setFace(null)} title="Pendaftaran Wajah" wide>
        {face && <FaceRegister student={face} onDone={() => { setFace(null); reload(); }} />}
      </Modal>

      <Modal open={!!imp} onClose={() => setImp(null)} title="Impor Siswa dari Excel">
        {imp && <div className="space-y-3 text-sm">
          <p>Kolom: <code>nis, nisn, nama, jk, tempat_lahir, tanggal_lahir (YYYY-MM-DD), kelas, alamat, orang_tua, whatsapp</code>. Nama kelas harus sudah ada di menu Kelas. NIS yang sama akan diperbarui.</p>
          <p><b>{imp.rows.length}</b> baris terbaca. <button className="underline text-primary" onClick={template}>Unduh template</button></p>
          {!imp.result ? <Btn onClick={doImport} className="w-full">Mulai Impor</Btn> : <div><div className="font-bold text-dark">{imp.result.ok} berhasil, {imp.result.errors.length} gagal</div><ul className="list-disc pl-5 text-red-600 max-h-40 overflow-y-auto">{imp.result.errors.map((e, i) => <li key={i}>{e}</li>)}</ul></div>}
        </div>}
      </Modal>
    </>
  );
}
