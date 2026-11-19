'use client';
import { Chart as C, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

C.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);
const G = '#087F5B', E = '#10B981', GOLD = '#D4AF37';
const opt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } };

export function TwoBar({ data }) {
  return <Bar options={opt} data={{ labels: data.labels, datasets: [{ label: 'Salat Zuhur', data: data.zuhur, backgroundColor: G, borderRadius: 6 }, { label: 'Wirid Remaja', data: data.wirid, backgroundColor: GOLD, borderRadius: 6 }] }} />;
}
export function TwoLine({ data }) {
  return <Line options={opt} data={{ labels: data.labels, datasets: [{ label: 'Salat Zuhur', data: data.zuhur, borderColor: G, backgroundColor: 'rgba(8,127,91,.15)', fill: true, tension: .35 }, { label: 'Wirid Remaja', data: data.wirid, borderColor: GOLD, backgroundColor: 'rgba(212,175,55,.15)', fill: true, tension: .35 }] }} />;
}
export function Compare({ data }) {
  return <Doughnut options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }} data={{ labels: ['Salat Zuhur', 'Wirid Remaja'], datasets: [{ data: [data.zuhur, data.wirid], backgroundColor: [G, GOLD] }] }} />;
}
export function ClassBar({ rows }) {
  return <Bar options={{ ...opt, indexAxis: 'y', scales: { x: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }} data={{ labels: rows.map((r) => r.name), datasets: [{ label: '% kehadiran', data: rows.map((r) => r.pct), backgroundColor: E, borderRadius: 6 }] }} />;
}
export function PctLine({ data }) {
  return <Line options={{ ...opt, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }} data={{ labels: data.labels, datasets: [{ label: '% kehadiran', data: data.values, borderColor: G, backgroundColor: 'rgba(16,185,129,.2)', fill: true, tension: .35 }] }} />;
}
