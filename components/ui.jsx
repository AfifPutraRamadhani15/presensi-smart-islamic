'use client';
import { useEffect, useState } from 'react';

export function Card({ className = '', children }) { return <div className={`card ${className}`}>{children}</div>; }

export function Btn({ variant = 'primary', className = '', ...p }) { return <button {...p} className={`btn btn-${variant} ${className}`} />; }

export function Field({ label, children, className = '' }) {
  return <div className={className}><label className="label">{label}</label>{children}</div>;
}

export function PageHead({ title, desc, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
      <div><h1 className="text-xl md:text-2xl font-extrabold text-dark">{title}</h1>{desc && <p className="text-sm text-ink/60">{desc}</p>}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4" onClick={onClose}>
      <div className={`bg-white w-full ${wide ? 'md:max-w-3xl' : 'md:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-3xl md:rounded-2xl shadow-2xl`} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-3 border-b border-emerald/10 z-10">
          <h3 className="font-bold text-dark">{title}</h3>
          <button onClick={onClose} className="text-2xl leading-none px-2" aria-label="Tutup">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const h = (e) => {
      const id = Math.random();
      setItems((x) => [...x, { id, ...e.detail }]);
      setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4000);
    };
    window.addEventListener('psi-toast', h);
    return () => window.removeEventListener('psi-toast', h);
  }, []);
  return (
    <div className="fixed top-3 right-3 z-[60] space-y-2 max-w-[90vw]">
      {items.map((i) => (
        <div key={i.id} className={`px-4 py-2 rounded-xl shadow-lg text-sm font-semibold text-white ${i.type === 'err' ? 'bg-red-600' : 'bg-primary'}`}>{i.msg}</div>
      ))}
    </div>
  );
}

export function Spinner() { return <div className="p-8 text-center text-sm text-ink/60 animate-pulse">Memuat…</div>; }

export function Empty({ children = 'Belum ada data.' }) { return <div className="p-8 text-center text-sm text-ink/50">{children}</div>; }

export function Table({ heads, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-emerald/10">
      <table className="w-full min-w-max"><thead><tr>{heads.map((h) => <th key={h} className="th">{h}</th>)}</tr></thead><tbody>{children}</tbody></table>
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'primary' }) {
  const t = tone === 'gold' ? 'bg-gold text-ink' : tone === 'light' ? 'bg-white text-dark border border-emerald/20' : 'gloss';
  return (
    <div className={`rounded-2xl p-4 shadow-soft ${t}`}>
      <div className="relative text-xs font-semibold opacity-80">{label}</div>
      <div className="relative text-2xl md:text-3xl font-extrabold">{value}</div>
      {sub && <div className="relative text-xs opacity-80">{sub}</div>}
    </div>
  );
}

export async function confirmBox(msg) { return typeof window !== 'undefined' && window.confirm(msg); }
