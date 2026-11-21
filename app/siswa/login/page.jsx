import { redirect } from 'next/navigation';

// Login siswa digabung ke Portal Siswa (ada fitur lupa kata sandi & ganti sandi)
export default function SiswaLoginRedirect() {
  redirect('/portal/login');
}