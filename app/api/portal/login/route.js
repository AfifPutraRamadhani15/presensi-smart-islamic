'use client';
import { useState } from 'react';
import { useApi, api, toast, STATUS_COLOR, STATUS_TEXT, ACT_TEXT } from '@/lib/client';
import { Card, PageHead, Spinner, Stat, Table } from '@/components/ui';
import { TwoBar, TwoLine, Compare, ClassBar, PctLine } from '@/components/Charts';

const EMPTY_ACT = { hadir: 0, terlambat: 0, tidak_hadir: 0, has_session: false };

const waktu = (iso) =>
  new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// Konfirmasi akun siswa: akun baru harus disetujui admin sebelum bisa login.
function Approvals() {
  const { data, error, reload } = useApi('/api/siswa/persetujuan');
  const [tab, setTab] = useState('menunggu');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const all = data?.rows || [];
  const nWait = all.filter((r) => r.status === 'menunggu').length;
  const nRej = all.filter((r) => r.status === 'ditolak').length;
  const list = all.filter((r) => r.status === tab);

  async function act(ids, action) {
    if (!ids.length || busy) return;
    if (
      action === 'tolak' &&
      !window.confirm(ids.length > 1 ? `Tolak ${ids.length} akun ini?` : 'Tolak akun ini?')
    ) {
      return;
    }
    setBusy(true);
    setErr('');
    try {
      const r = await api('/api/siswa/persetujuan', {
        method: 'POST',
        body: { ids, action },
      });
      toast(action === 'setujui' ? `${r.count} akun disetujui` : `${r.count} akun ditolak`);
      await reload();
    } catch (e) {
      setErr(e.message || 'Gagal memproses persetujuan akun.');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="card text-red-600 text-sm mb-4">
        Gagal memuat konfirmasi akun siswa: {error}
      </div>
    );
  }
  if (!all.length) return null;

  return (
    <Card className={`mb-4 ${nWait ? '!bg-gold/20' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-dark">🕒 Konfirmasi Akun Siswa</h3>
        <div className="flex gap-1 p-1 rounded-xl bg-white/80">
          {[
            ['menunggu', `Menunggu (${nWait})`],
            ['ditolak', `Ditolak (${nRej})`],
          ].map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                tab === k ? 'gloss' : 'text-dark'
              }`}
            >
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink/60 mt-1">
        {tab === 'menunggu'
          ? 'Siswa di bawah ini belum bisa login sebelum kamu menyetujui akunnya.'
          : 'Akun yang ditolak tetap tersimpan dan bisa disetujui kembali.'}
      </p>

      {err && (
        <div
          role="alert"
          className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-2"
        >
          ⚠ {err}
        </div>
      )}

      {tab === 'menunggu' && nWait > 1 && (
        <button
          type="button"
          disabled={busy}
          onClick={() => act(list.map((r) => r.id), 'setujui')}
          className="btn btn-primary !py-1.5 !px-3 text-xs mt-3"
        >
          ✔ Setujui semua ({nWait})
        </button>
      )}

      {!list.length ? (
        <div className="text-sm text-ink/50 py-6 text-center">
          Tidak ada akun di daftar ini.
        </div>
      ) : (
        <ul className="divide-y divide-emerald/10 mt-2">
          {list.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
              <div className="min-w-0 flex-1 basis-48">
                <div className="font-bold text-sm text-ink truncate">{r.nama}</div>
                <div className="text-[11px] text-ink/60 truncate">
                  NIS {r.nis} · {r.kelas} · daftar {waktu(r.created_at)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => act([r.id], 'setujui')}
                  className="btn btn-primary !py-1.5 !px-3 text-xs"
                >
                  Setujui
                </button>
                {tab === 'menunggu' && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => act([r.id], 'tolak')}
                    className="btn btn-danger !py-1.5 !px-3 text-xs"
                  >
                    Tolak
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { data: d, error, loading, reload } = useApi('/api/dashboard');
  if (loading) return <Spinner />;
  if (error) return <div className="card text-red-600">Gagal memuat: {error}</div>;
  if (!d) return <div className="card text-red-600">Data dashboard kosong. Coba muat ulang.</div>;

  const t = d.today || {};
  const zuhur = { ...EMPTY_ACT, ...(t.zuhur || {}) };
  const wirid = { ...EMPTY_ACT, ...(t.wirid || {}) };
  const totals = d.totals || { students: 0, classes: 0, active: 0 };
  const notifs = d.notifs || [];
  const recent = d.recent || [];
  const perClass = d.perClass || [];
  const box = 'h-64';

  return (
    <>
      <PageHead title="Dashboard" desc="Data real-time dari database">
        <button type="button" className="btn btn-ghost" onClick={reload}>
          ↻ Muat ulang
        </button>
      </PageHead>

      <Approvals />

      {notifs.length > 0 && (
        <Card className="mb-4 !bg-gold/20">
          <div className="flex justify-between">
            <b className="text-sm">🔔 Notifikasi</b>
            <button
              type="button"
              className="text-xs underline"
              onClick={async () => {
                await api('/api/notifikasi', { method: 'PUT' });
                reload();
              }}
            >
              Tandai dibaca
            </button>
          </div>
          {notifs.map((n) => (
            <div key={n.id} className="text-sm mt-1">
              • <b>{n.title}</b> {n.body}
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Total Siswa" value={totals.students ?? 0} sub={`${totals.active ?? 0} aktif`} />
        <Stat label="Total Kelas" value={totals.classes ?? 0} tone="light" />
        <Stat label="Persentase Hadir Hari Ini" value={`${d.pctToday ?? 0}%`} tone="gold" />
        <Stat label="Terlambat Hari Ini" value={d.late_today ?? 0} tone="light" />
        <Stat
          label="Hadir Salat Zuhur"
          value={zuhur.hadir + zuhur.terlambat}
          sub={zuhur.has_session ? `Tidak hadir: ${zuhur.tidak_hadir}` : 'Belum ada sesi'}
        />
        <Stat
          label="Hadir Wirid Remaja"
          value={wirid.hadir + wirid.terlambat}
          sub={wirid.has_session ? `Tidak hadir: ${wirid.tidak_hadir}` : 'Belum ada sesi'}
        />
        <Stat label="Tidak Hadir Zuhur" value={zuhur.tidak_hadir} tone="light" />
        <Stat label="Tidak Hadir Wirid" value={wirid.tidak_hadir} tone="light" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card>
          <h3 className="font-bold text-dark mb-2">Kehadiran Harian (14 hari)</h3>
          <div className={box}>
            <TwoBar data={d.daily || []} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-dark mb-2">Kehadiran Mingguan (8 minggu)</h3>
          <div className={box}>
            <TwoLine data={d.weekly || []} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-dark mb-2">Kehadiran Bulanan (6 bulan)</h3>
          <div className={box}>
            <TwoBar data={d.monthly || []} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-dark mb-2">Perbandingan Bulan Ini</h3>
          <div className={box}>
            <Compare data={d.compare || []} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-dark mb-2">% Kehadiran per Kelas (bulan ini)</h3>
          <div className={box}>
            <ClassBar rows={perClass.slice(0, 12)} />
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-dark mb-2">Perkembangan Kedisiplinan</h3>
          <div className={box}>
            <PctLine data={d.discipline || []} />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-bold text-dark mb-2">Aktivitas Terbaru</h3>
        <Table heads={['Nama', 'NIS', 'Kelas', 'Kegiatan', 'Jam', 'Status', 'Metode']}>
          {recent.map((r) => (
            <tr key={r.id}>
              <td className="td font-semibold">{r.students?.full_name}</td>
              <td className="td">{r.students?.nis}</td>
              <td className="td">{r.students?.classes?.name || '-'}</td>
              <td className="td">{ACT_TEXT[r.attendance_sessions?.activity]}</td>
              <td className="td">
                {new Date(r.checked_at)
                  .toLocaleTimeString('id-ID', {
                    timeZone: 'Asia/Jakarta',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })
                  .replace(':', '.')}
              </td>
              <td className="td">
                <span className={`badge ${STATUS_COLOR[r.status]}`}>
                  {STATUS_TEXT[r.status]}
                </span>
              </td>
              <td className="td">{r.method === 'face' ? 'Wajah' : 'Manual'}</td>
            </tr>
          ))}
          {!recent.length && (
            <tr>
              <td className="td text-center text-ink/50" colSpan={7}>
                Belum ada presensi.
              </td>
            </tr>
          )}
        </Table>
      </Card>
    </>
  );
}