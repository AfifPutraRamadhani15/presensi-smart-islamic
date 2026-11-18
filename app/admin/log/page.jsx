'use client';
import { useState } from 'react';
import { useApi } from '@/lib/client';
import { Card, PageHead, Spinner, Table } from '@/components/ui';

export default function Log() {
  const [tab, setTab] = useState('admin');
  const { data, loading } = useApi(`/api/logs?type=${tab}`);
  const fmt = (s) => new Date(s).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  return (
    <>
      <PageHead title="Log Aktivitas" desc="Audit aktivitas admin & log pengenalan wajah">
        <button className={`btn ${tab === 'admin' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('admin')}>Aktivitas Admin</button>
        <button className={`btn ${tab === 'face' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('face')}>Pengenalan Wajah</button>
      </PageHead>
      <Card>{loading || !data ? <Spinner /> : tab === 'admin' ? (
        <Table heads={['Waktu', 'Admin', 'Aksi', 'Detail', 'IP']}>{data.map((r) => <tr key={r.id}><td className="td">{fmt(r.created_at)}</td><td className="td">{r.admin_name || '-'}</td><td className="td font-semibold">{r.action}</td><td className="td">{r.detail}</td><td className="td">{r.ip}</td></tr>)}</Table>
      ) : (
        <Table heads={['Waktu', 'Kegiatan', 'Hasil', 'Siswa', 'Jarak', 'IP']}>{data.map((r) => <tr key={r.id}><td className="td">{fmt(r.created_at)}</td><td className="td">{r.activity}</td><td className="td font-semibold">{r.result}</td><td className="td">{r.students?.full_name || '-'}</td><td className="td">{r.distance != null ? Number(r.distance).toFixed(3) : '-'}</td><td className="td">{r.ip}</td></tr>)}</Table>
      )}</Card>
    </>
  );
}
