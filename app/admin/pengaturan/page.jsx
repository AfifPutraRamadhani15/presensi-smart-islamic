'use client';
import { useState } from 'react';
import { api, useApi, toast } from '@/lib/client';
import { Btn, Card, Field, PageHead, Spinner } from '@/components/ui';

function toDataUrl(file, max = 256) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/png'));
    };
    img.onerror = () => rej(new Error('Gambar tidak valid')); img.src = url;
  });
}

export default function Pengaturan() {
  const { data, setData, reload } = useApi('/api/settings');
  const [pw, setPw] = useState({ current: '', next: '', full_name: '' });
  if (!data) return <Spinner />;
  const s = data.settings;
  const set = (k, v) => setData({ ...data, settings: { ...s, [k]: v } });
  async function save() {
    try { await api('/api/settings', { method: 'PUT', body: s }); toast('Pengaturan tersimpan. Muat ulang halaman untuk melihat tema baru.'); } catch (e) { toast(e.message, 'err'); }
  }
  async function logo(k, e) { const f = e.target.files[0]; if (f) { try { set(k, await toDataUrl(f)); } catch (x) { toast(x.message, 'err'); } } }
  async function savePw(e) {
    e.preventDefault();
    try { await api('/api/admin/password', { method: 'POST', body: pw }); toast('Profil/password diperbarui'); setPw({ current: '', next: '', full_name: '' }); } catch (x) { toast(x.message, 'err'); }
  }
  return (
    <>
      <PageHead title="Pengaturan & Profil"><Btn onClick={save}>💾 Simpan Pengaturan</Btn></PageHead>
      <div className="grid xl:grid-cols-2 gap-4">
        <Card className="space-y-3">
          <h3 className="font-bold text-dark">Identitas Aplikasi & Sekolah</h3>
          <Field label="Nama Aplikasi"><input className="input" value={s.app_name || ''} onChange={(e) => set('app_name', e.target.value)} /></Field>
          <Field label="Nama Sekolah"><input className="input" value={s.school_name || ''} onChange={(e) => set('school_name', e.target.value)} /></Field>
          <Field label="Alamat Sekolah"><input className="input" value={s.school_address || ''} onChange={(e) => set('school_address', e.target.value)} /></Field>
          <Field label="Tahun Ajaran"><input className="input" value={s.academic_year || ''} onChange={(e) => set('academic_year', e.target.value)} /></Field>
          <Field label="Warna Tema Utama"><input type="color" className="h-10 w-24" value={s.theme_primary || '#087F5B'} onChange={(e) => set('theme_primary', e.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Logo Aplikasi">{s.logo_app && <img src={s.logo_app} alt="" className="h-12 mb-1" />}<input type="file" accept="image/*" onChange={(e) => logo('logo_app', e)} /></Field>
            <Field label="Logo Sekolah">{s.logo_school && <img src={s.logo_school} alt="" className="h-12 mb-1" />}<input type="file" accept="image/*" onChange={(e) => logo('logo_school', e)} /></Field>
          </div>
        </Card>
        <Card className="space-y-3">
          <h3 className="font-bold text-dark">Face Recognition & Suara</h3>
          <Field label={`Threshold jarak wajah: ${s.face_threshold} (lebih kecil = lebih ketat; disarankan 0.45–0.55)`}><input type="range" min="0.3" max="0.7" step="0.01" className="w-full" value={s.face_threshold} onChange={(e) => set('face_threshold', e.target.value)} /></Field>
          <Field label={`Margin pembeda antar siswa: ${s.face_margin} (mencegah salah kenali wajah mirip)`}><input type="range" min="0" max="0.15" step="0.01" className="w-full" value={s.face_margin} onChange={(e) => set('face_margin', e.target.value)} /></Field>
          <Field label="Kalimat suara ({nama} {kelas} {kegiatan} {status})"><textarea className="input" rows={3} value={s.tts_template || ''} onChange={(e) => set('tts_template', e.target.value)} /></Field>
          <p className="text-xs text-ink/60">Volume, kecepatan, dan tombol suara diatur per perangkat langsung di halaman Presensi.</p>
          <h3 className="font-bold text-dark pt-2">Kedisiplinan</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sangat Disiplin ≥ (%)"><input type="number" className="input" value={s.disc_high || ''} onChange={(e) => set('disc_high', e.target.value)} /></Field>
            <Field label="Disiplin ≥ (%)"><input type="number" className="input" value={s.disc_mid || ''} onChange={(e) => set('disc_mid', e.target.value)} /></Field>
          </div>
          <h3 className="font-bold text-dark pt-2">AI Chatbot</h3>
          <label className="text-sm font-semibold"><input type="checkbox" checked={s.ai_enabled === '1'} onChange={(e) => set('ai_enabled', e.target.checked ? '1' : '0')} /> Gunakan AI eksternal {data.env.ai ? '(API key terdeteksi ✔)' : '(AI_API_KEY belum diisi → tetap mode aturan)'}</label>
          <label className="text-sm font-semibold block"><input type="checkbox" checked={s.ai_share_names === '1'} onChange={(e) => set('ai_share_names', e.target.checked ? '1' : '0')} /> Izinkan nama siswa dikirim ke layanan AI (default: hanya NIS)</label>
        </Card>
        <Card>
          <h3 className="font-bold text-dark mb-2">Profil Admin & Ganti Password</h3>
          <form onSubmit={savePw} className="space-y-3">
            <Field label="Nama Lengkap"><input className="input" value={pw.full_name} placeholder="(biarkan kosong jika tidak diubah)" onChange={(e) => setPw({ ...pw, full_name: e.target.value })} /></Field>
            <Field label="Password saat ini"><input type="password" autoComplete="current-password" className="input" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
            <Field label="Password baru (min. 10 karakter, huruf + angka)"><input type="password" autoComplete="new-password" className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field>
            <Btn>Perbarui</Btn>
          </form>
        </Card>
        <Card><h3 className="font-bold text-dark mb-2">Status Integrasi</h3>
          <ul className="text-sm space-y-1"><li>WhatsApp Cloud API: {data.env.wa ? '🟢 terhubung' : '🟡 simulasi'}</li><li>AI API: {data.env.ai ? '🟢 API key ada' : '🟡 mode aturan'}</li><li>Jadwal & jam presensi: menu <b>Jadwal & Sesi</b></li><li>Notifikasi WA: menu <b>WhatsApp</b></li></ul></Card>
      </div>
    </>
  );
}
