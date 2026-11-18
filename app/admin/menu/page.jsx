'use client';
import Link from 'next/link';
import { api } from '@/lib/client';
import { Card, PageHead } from '@/components/ui';

const L = [['/admin/kelas', '🏫 Kelas & Jurusan'], ['/admin/sesi', '🗓️ Jadwal & Sesi'], ['/admin/presensi', '✅ Rekap & Verifikasi'], ['/admin/whatsapp', '💬 WhatsApp'], ['/admin/chatbot', '🤖 AI Chatbot'], ['/admin/log', '🛡️ Log Aktivitas'], ['/admin/pengaturan', '⚙️ Pengaturan & Profil'], ['/persetujuan', '📄 Formulir Persetujuan Biometrik']];

export default function Menu() {
  return (
    <>
      <PageHead title="Menu" desc="Semua menu aplikasi" />
      <div className="grid gap-3 sm:grid-cols-2">
        {L.map(([h, t]) => <Link key={h} href={h}><Card className="font-semibold hover:bg-light/50">{t}</Card></Link>)}
      </div>
      <button className="btn btn-danger mt-6" onClick={async () => { await api('/api/auth/logout', { method: 'POST' }); location.href = '/login'; }}>Keluar</button>
    </>
  );
}
