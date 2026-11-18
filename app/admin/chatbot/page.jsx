'use client';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import { Card, PageHead } from '@/components/ui';

const SUGGEST = ['Berapa jumlah siswa yang hadir Salat Zuhur hari ini?', 'Kelas mana yang tingkat kehadirannya paling tinggi?', 'Siapa saja siswa yang sering tidak hadir?', 'Bagaimana persentase kehadiran bulan ini?', 'Buatkan ringkasan laporan Wirid Remaja', 'Buatkan pesan pemberitahuan kepada orang tua'];

export default function Chatbot() {
  const [msgs, setMsgs] = useState([{ role: 'bot', text: 'Assalamu\'alaikum! Saya ISLAMIC ATTENDANCE AI. Tanyakan data kehadiran Salat Zuhur & Wirid Remaja.' }]);
  const [q, setQ] = useState(''), [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);
  async function send(text) {
    const m = (text ?? q).trim(); if (!m || busy) return;
    setQ(''); setMsgs((x) => [...x, { role: 'me', text: m }]); setBusy(true);
    try { const r = await api('/api/chatbot', { method: 'POST', body: { message: m } }); setMsgs((x) => [...x, { role: 'bot', text: r.text, mode: r.mode }]); }
    catch (e) { setMsgs((x) => [...x, { role: 'bot', text: '⚠ ' + e.message }]); }
    setBusy(false);
  }
  return (
    <>
      <PageHead title="ISLAMIC ATTENDANCE AI" desc="Menjawab hanya dari data presensi yang valid di database" />
      <Card className="flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'me' ? 'justify-end' : ''}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${m.role === 'me' ? 'gloss' : 'bg-light text-ink'}`}><span className="relative">{m.text}</span>{m.mode && <div className="text-[10px] opacity-60 mt-1">mode: {m.mode === 'ai' ? 'AI' : 'berbasis aturan'}</div>}</div>
            </div>
          ))}
          {busy && <div className="text-sm text-ink/50 animate-pulse">Menganalisis data…</div>}
          <div ref={end} />
        </div>
        <div className="flex flex-wrap gap-1 my-2">{SUGGEST.map((s) => <button key={s} className="badge bg-light text-dark hover:bg-emerald/30" onClick={() => send(s)}>{s}</button>)}</div>
        <div className="flex gap-2"><input className="input" value={q} maxLength={500} placeholder="Tulis pertanyaan…" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} /><button className="btn btn-primary" onClick={() => send()} disabled={busy}>Kirim</button></div>
      </Card>
    </>
  );
}
