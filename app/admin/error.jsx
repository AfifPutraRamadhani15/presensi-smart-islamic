'use client';

export default function AdminError({ error, reset }) {
  return (
    <div className="card m-4 text-red-700">
      <h2 className="font-bold text-lg">Terjadi kesalahan di halaman ini</h2>
      <p className="text-sm mt-2 break-words">{error?.message || 'Error tidak diketahui'}</p>
      <button className="btn btn-primary mt-4" onClick={() => reset()}>Coba lagi</button>
    </div>
  );
}