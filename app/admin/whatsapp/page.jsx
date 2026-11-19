'use client';
import { useState } from 'react';
import { api, useApi, toast } from '@/lib/client';
import { Btn, Card, Field, PageHead, Spinner, Table } from '@/components/ui';

const COLOR = { terkirim: 'bg-emerald/20 text-dark', gagal: 'bg-red-100 text-red-700', simulasi: 'bg-gold/30', menunggu: 'bg-gray-200' };

export default function WA() {
  const tpl = useApi('/api/crud/whatsapp_templates'), logs = useApi('/api/wa'), st = useApi('/api/settings');
  const [busy, setBusy] = useState('');
  if (!tpl.data || !logs.data || !st.data) return <Spinner />;
  const s = st.data.settings;
  const setS = (k, v) => st.setData({ ...st.data, settings: { ...s, [k]: v } });
  async function saveS() { try { await api('/api/settings', { method: 'PUT', body: { wa_enabled: s.wa_enabled, wa_notify_hadir: s.wa_notify_hadir, wa_notify_terlambat: s.wa_notify_terlambat, wa_notify_tidak_hadir: s.wa_notify_tidak_hadir } }); toast('Pengaturan tersimpan'); } catch (e) { toast(e.message, 'err'); } }
  async function saveT(t) { try { await api('/api/crud/whatsapp_templates', { method: 'PUT', body: t }); toast('Template tersimpan'); } catch (e) { toast(e.message, 'err'); } }
  async function resend(id) { setBusy(id); try { await api(`/api/wa/${id}`, { method: 'POST' }); logs.reload(); } catch (e) { toast(e.message, 'err'); } setBusy(''); }
  function waLink(r) {
    let n = String(r.to_number || '').replace(/[^\d]/g, '');
    if (n.startsWith('0')) n = '62' + n.slice(1);
    else if (n.startsWith('8')) n = '62' + n;
    return `https://wa.me/${n}?text=${encodeURIComponent(r.message || '')}`;
  }
  async function markSent(id) { try { await api(`/api/wa/${id}`, { method: 'PUT', body: { status: 'terkirim' } }); logs.reload(); } catch (e) { toast(e.message, 'err'); } }
  const upd = (id, patch) => tpl.setData(tpl.data.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  return (
    <>
      <PageHead title="WhatsApp Orang Tua" desc="WhatsApp Business Cloud API resmi Meta" />
      <Card className={`mb-4 ${logs.data.live ? '' : '!bg-gold/20'}`}>
        <b>{logs.data.live ? '🟢 Terhubung ke WhatsApp Cloud API' : '🟡 Mode SIMULASI'}</b>
        <p className="text-sm mt-1">{logs.data.live ? 'Pesan benar-benar dikirim. Catatan: pesan yang dimulai bisnis di luar jendela 24 jam wajib memakai template yang disetujui Meta (isi WA_TEMPLATE_NAME).' : 'WA_TOKEN / WA_PHONE_NUMBER_ID belum diisi di .env.local. Pesan hanya dicatat pada riwayat dengan status "simulasi". Lihat docs/04-WHATSAPP-AI.md untuk aktivasi.'}</p>
      </Card>
      <Card className="mb-4">
        <h3 className="font-bold text-dark mb-2">Aturan Notifikasi Otomatis</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm font-semibold">
          {[['wa_enabled', 'Aktifkan notifikasi WhatsApp'], ['wa_notify_hadir', 'Kirim saat siswa HADIR'], ['wa_notify_terlambat', 'Kirim saat siswa TERLAMBAT'], ['wa_notify_tidak_hadir', 'Kirim saat status tidak hadir/izin/sakit diverifikasi admin']].map(([k, l]) => (
            <label key={k}><input type="checkbox" checked={s[k] === '1'} onChange={(e) => setS(k, e.target.checked ? '1' : '0')} /> {l}</label>))}
        </div>
        <p className="text-xs text-ink/60 mt-2">Pesan hanya dikirim jika orang tua telah dicentang menyetujui notifikasi pada data siswa.</p>
        <Btn className="mt-3" onClick={saveS}>Simpan Aturan</Btn>
      </Card>
      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {tpl.data.map((t) => (
          <Card key={t.id}>
            <Field label={`Template: ${t.title}`}><textarea className="input" rows={12} value={t.body} onChange={(e) => upd(t.id, { body: e.target.value })} /></Field>
            <p className="text-[11px] text-ink/60 my-1">Variabel: {'{nama} {nis} {kelas} {kegiatan} {tanggal} {waktu} {status}'}</p>
            <label className="text-sm font-semibold"><input type="checkbox" checked={t.is_active} onChange={(e) => upd(t.id, { is_active: e.target.checked })} /> Aktif</label>
            <Btn className="mt-2 w-full" onClick={() => saveT(t)}>Simpan Template</Btn>
          </Card>
        ))}
      </div>
      <Card>
        <h3 className="font-bold text-dark mb-1">Riwayat Pengiriman</h3>
        <p className="text-xs text-ink/60 mb-2">Tanpa API: klik <b>Kirim via WhatsApp</b> → WhatsApp terbuka dengan nomor & pesan sudah terisi → tekan Kirim → kembali ke sini dan klik <b>Tandai terkirim</b>.</p>
        <Table heads={['Waktu', 'Siswa', 'Nomor', 'Template', 'Status', 'Keterangan', 'Aksi']}>
          {logs.data.rows.map((r) => (
            <tr key={r.id}><td className="td">{new Date(r.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</td><td className="td">{r.students?.full_name}</td><td className="td">{r.to_number}</td><td className="td">{r.template_code}</td>
              <td className="td"><span className={`badge ${COLOR[r.status]}`}>{r.status}</span></td><td className="td max-w-xs truncate">{r.error || '-'}</td>
              <td className="td whitespace-nowrap space-x-3">
                <a className="text-primary font-semibold" href={waLink(r)} target="_blank" rel="noreferrer">💬 Kirim via WhatsApp</a>
                {r.status !== 'terkirim' && <button className="text-dark font-semibold" onClick={() => markSent(r.id)}>✔ Tandai terkirim</button>}
                <button className="text-primary font-semibold" disabled={busy === r.id} onClick={() => resend(r.id)}>{busy === r.id ? '…' : 'Kirim ulang (API)'}</button></td></tr>
          ))}
        </Table>
      </Card>
    </>
  );
}