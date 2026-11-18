'use client';
import { useState } from 'react';
import { api, useApi, toast, ACT_TEXT, today } from '@/lib/client';
import { Btn, Card, Field, Modal, PageHead, Spinner, Table, confirmBox } from '@/components/ui';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export default function Sesi() {
  const sch = useApi('/api/crud/attendance_settings'), ses = useApi('/api/crud/attendance_sessions');
  const [edit, setEdit] = useState(null);
  if (!sch.data || !ses.data) return <Spinner />;
  const t5 = (v) => (v || '').slice(0, 5);

  async function saveSch(r) {
    try { await api('/api/crud/attendance_settings', { method: 'PUT', body: r }); toast('Jadwal tersimpan'); sch.reload(); } catch (x) { toast(x.message, 'err'); }
  }
  function upd(id, patch) { sch.setData(sch.data.map((r) => (r.id === id ? { ...r, ...patch } : r))); }
  async function saveSes(e) {
    e.preventDefault();
    try { await api('/api/crud/attendance_sessions', { method: edit.id ? 'PUT' : 'POST', body: edit }); setEdit(null); ses.reload(); toast('Tersimpan'); } catch (x) { toast(x.message, 'err'); }
  }
  return (
    <>
      <PageHead title="Jadwal & Sesi Kegiatan" desc="Jadwal rutin dipakai otomatis; buat sesi khusus untuk hari tertentu"/>
      <div className="grid lg:grid-cols-2 gap-4">
        {sch.data.map((r) => (
          <Card key={r.id}>
            <div className="flex justify-between items-center"><h3 className="font-bold text-dark">{ACT_TEXT[r.activity]}</h3>
              <label className="text-sm font-semibold"><input type="checkbox" checked={r.is_active} onChange={(e) => upd(r.id, { is_active: e.target.checked })} /> Aktif</label></div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Field label="Mulai"><input type="time" className="input" value={t5(r.start_time)} onChange={(e) => upd(r.id, { start_time: e.target.value })} /></Field>
              <Field label="Terlambat setelah"><input type="time" className="input" value={t5(r.late_time)} onChange={(e) => upd(r.id, { late_time: e.target.value })} /></Field>
              <Field label="Tutup"><input type="time" className="input" value={t5(r.end_time)} onChange={(e) => upd(r.id, { end_time: e.target.value })} /></Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAYS.map((d, i) => { const on = r.active_days.includes(i + 1); return (
                <button key={d} type="button" className={`btn !py-1 ${on ? 'btn-primary' : 'btn-ghost'}`} onClick={() => upd(r.id, { active_days: on ? r.active_days.filter((x) => x !== i + 1) : [...r.active_days, i + 1].sort() })}>{d}</button>); })}
            </div>
            <Btn className="mt-3" onClick={() => saveSch(r)}>Simpan Jadwal</Btn>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="flex justify-between items-center mb-2"><h3 className="font-bold text-dark">Sesi Kegiatan</h3>
          <Btn onClick={() => setEdit({ activity: 'zuhur', session_date: today(), start_time: '12:00', late_time: '12:30', end_time: '13:30', is_open: true })}>+ Sesi Khusus</Btn></div>
        <Table heads={['Tanggal', 'Kegiatan', 'Mulai', 'Terlambat', 'Tutup', 'Status', 'Aksi']}>
          {ses.data.map((r) => (
            <tr key={r.id}><td className="td">{r.session_date}</td><td className="td">{ACT_TEXT[r.activity]}</td><td className="td">{t5(r.start_time)}</td><td className="td">{t5(r.late_time)}</td><td className="td">{t5(r.end_time)}</td>
              <td className="td">{r.is_open ? '🟢 Dibuka' : '🔴 Ditutup'}</td>
              <td className="td whitespace-nowrap"><button className="text-primary font-semibold mr-3" onClick={() => setEdit({ ...r, start_time: t5(r.start_time), late_time: t5(r.late_time), end_time: t5(r.end_time) })}>Ubah</button>
                <button className="text-red-600 font-semibold" onClick={async () => { if (await confirmBox('Hapus sesi beserta seluruh presensinya?')) { await api(`/api/crud/attendance_sessions?id=${r.id}`, { method: 'DELETE' }); ses.reload(); } }}>Hapus</button></td></tr>
          ))}
        </Table>
      </Card>
      <Modal open={!!edit} onClose={() => setEdit(null)} title="Sesi Kegiatan">
        {edit && <form onSubmit={saveSes} className="space-y-3">
          <Field label="Kegiatan"><select className="input" value={edit.activity} onChange={(e) => setEdit({ ...edit, activity: e.target.value })}><option value="zuhur">Salat Zuhur</option><option value="wirid">Wirid Remaja</option></select></Field>
          <Field label="Tanggal"><input type="date" className="input" value={edit.session_date} onChange={(e) => setEdit({ ...edit, session_date: e.target.value })} required /></Field>
          <div className="grid grid-cols-3 gap-2">
            {[['start_time', 'Mulai'], ['late_time', 'Terlambat'], ['end_time', 'Tutup']].map(([k, l]) => <Field key={k} label={l}><input type="time" className="input" value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} required /></Field>)}
          </div>
          <label className="text-sm font-semibold"><input type="checkbox" checked={edit.is_open} onChange={(e) => setEdit({ ...edit, is_open: e.target.checked })} /> Sesi dibuka</label>
          <Field label="Catatan"><input className="input" value={edit.note || ''} onChange={(e) => setEdit({ ...edit, note: e.target.value })} /></Field>
          <Btn className="w-full">Simpan</Btn>
        </form>}
      </Modal>
    </>
  );
}
