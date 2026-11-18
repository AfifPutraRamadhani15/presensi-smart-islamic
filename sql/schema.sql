-- =====================================================================
-- PRESENSI SMART ISLAMIC - Skema Database (Supabase / PostgreSQL)
-- Jalankan seluruh isi file ini di Supabase > SQL Editor > New query > Run
-- Aman dijalankan ulang (IF NOT EXISTS).
-- =====================================================================
create extension if not exists pgcrypto;

create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  full_name text not null default 'Administrator',
  password_hash text not null,
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,            -- contoh: 2026/2027
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,                    -- contoh: XI PPLG 1
  level text,                            -- X / XI / XII
  department_id uuid references departments(id) on delete set null,
  academic_year_id uuid references academic_years(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, academic_year_id)
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  nis text not null unique,
  nisn text,
  full_name text not null,
  gender text check (gender in ('L','P')),
  birth_place text,
  birth_date date,
  class_id uuid references classes(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  academic_year_id uuid references academic_years(id) on delete set null,
  address text,
  photo text,                            -- data URL JPEG kecil (<= ~30KB)
  status text not null default 'aktif' check (status in ('aktif','nonaktif')),
  consent_biometric boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_students_class on students(class_id);
create index if not exists idx_students_status on students(status);

create table if not exists parent_contacts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  parent_name text,
  whatsapp text,                         -- format 08xxx atau 628xxx
  consent_wa boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Embedding wajah (128 angka) disimpan TERENKRIPSI AES-256-GCM oleh server
create table if not exists face_data (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  embedding_enc text not null,
  sample_no int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists idx_face_student on face_data(student_id);

create table if not exists attendance_settings (
  id uuid primary key default gen_random_uuid(),
  activity text not null unique check (activity in ('zuhur','wirid')),
  start_time time not null,
  late_time time not null,               -- lewat jam ini = terlambat
  end_time time not null,                -- lewat jam ini = presensi ditutup
  active_days int[] not null default '{1,2,3,4,5}',  -- 1=Senin ... 7=Minggu
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  activity text not null check (activity in ('zuhur','wirid')),
  session_date date not null,
  start_time time not null,
  late_time time not null,
  end_time time not null,
  is_open boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity, session_date)
);

create table if not exists attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references attendance_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null check (status in ('hadir','terlambat','izin','sakit','tidak_hadir')),
  method text not null default 'face' check (method in ('face','manual')),
  confidence numeric,                    -- 0..1 (1 - jarak)
  checked_at timestamptz not null default now(),   -- waktu SERVER
  note text,
  verified_by uuid references admins(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, student_id)        -- mencegah presensi ganda
);
create index if not exists idx_rec_student on attendance_records(student_id);
create index if not exists idx_rec_session on attendance_records(session_id);

create table if not exists recognition_logs (
  id bigserial primary key,
  ip text,
  activity text,
  result text not null,                  -- success | duplicate | unknown | liveness | closed | error
  student_id uuid references students(id) on delete set null,
  distance numeric,
  created_at timestamptz not null default now()
);
create index if not exists idx_reclog_ip on recognition_logs(ip, created_at desc);

create table if not exists whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,             -- hadir | terlambat | tidak_hadir
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists whatsapp_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete set null,
  record_id uuid references attendance_records(id) on delete set null,
  to_number text,
  template_code text,
  message text not null,
  status text not null default 'menunggu' check (status in ('menunggu','terkirim','gagal','simulasi')),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  level text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chatbot_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references admins(id) on delete set null,
  question text not null,
  answer text not null,
  mode text not null default 'rule',
  created_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_logs (
  id bigserial primary key,
  admin_id uuid references admins(id) on delete set null,
  admin_name text,
  action text not null,
  detail text,
  ip text,
  created_at timestamptz not null default now()
);

-- trigger updated_at
do $$
declare t text;
begin
  foreach t in array array['admins','departments','academic_years','classes','students','parent_contacts',
    'attendance_settings','attendance_sessions','attendance_records','whatsapp_templates','whatsapp_logs',
    'notifications','app_settings']
  loop
    execute format('drop trigger if exists trg_%1$s_upd on %1$I; create trigger trg_%1$s_upd before update on %1$I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- KEAMANAN: aktifkan RLS di semua tabel TANPA policy.
-- Artinya anon key tidak bisa membaca apa pun. Hanya server (service role) yang bisa akses.
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ===================== DATA AWAL =====================
insert into attendance_settings (activity, start_time, late_time, end_time, active_days) values
  ('zuhur', '12:00', '12:30', '13:30', '{1,2,3,4,5}'),
  ('wirid', '13:00', '13:20', '14:30', '{5}')
on conflict (activity) do nothing;

insert into app_settings (key, value) values
  ('app_name','PRESENSI SMART ISLAMIC'),
  ('school_name','SMKN 1 Ranah Ampek Hulu Tapan'),
  ('school_address','Ranah Ampek Hulu Tapan, Kab. Pesisir Selatan, Sumatera Barat'),
  ('academic_year','2026/2027'),
  ('theme_primary','#087F5B'),
  ('face_threshold','0.50'),
  ('face_margin','0.04'),
  ('tts_enabled','1'),
  ('tts_template','Selamat datang, {nama}. Siswa kelas {kelas}. Presensi {kegiatan} berhasil. Anda dinyatakan {status}.'),
  ('wa_enabled','0'),
  ('wa_notify_hadir','1'),
  ('wa_notify_terlambat','1'),
  ('wa_notify_tidak_hadir','0'),
  ('ai_enabled','0'),
  ('ai_share_names','0'),
  ('disc_high','90'),
  ('disc_mid','75'),
  ('timezone','Asia/Jakarta')
on conflict (key) do nothing;

insert into whatsapp_templates (code, title, body) values
('hadir','Notifikasi Hadir',
E'Assalamu''alaikum Wr. Wb.\n\nYth. Bapak/Ibu Orang Tua/Wali.\n\nKami informasikan bahwa siswa berikut:\n\nNama: {nama}\nNIS: {nis}\nKelas: {kelas}\n\nTelah melakukan presensi kegiatan {kegiatan}.\n\nTanggal: {tanggal}\nWaktu: {waktu}\nStatus: {status}\n\nTerima kasih atas perhatian dan kerja sama Bapak/Ibu dalam mendukung kedisiplinan ibadah siswa.\n\nWassalamu''alaikum Wr. Wb.'),
('terlambat','Notifikasi Terlambat',
E'Assalamu''alaikum Wr. Wb.\n\nYth. Bapak/Ibu Orang Tua/Wali.\n\nSiswa berikut tercatat TERLAMBAT pada kegiatan {kegiatan}:\n\nNama: {nama}\nNIS: {nis}\nKelas: {kelas}\nTanggal: {tanggal}\nWaktu: {waktu}\nStatus: {status}\n\nMohon bimbingan Bapak/Ibu agar ananda lebih disiplin.\n\nWassalamu''alaikum Wr. Wb.'),
('tidak_hadir','Notifikasi Tidak Hadir',
E'Assalamu''alaikum Wr. Wb.\n\nYth. Bapak/Ibu Orang Tua/Wali.\n\nSiswa berikut tercatat {status} pada kegiatan {kegiatan}:\n\nNama: {nama}\nNIS: {nis}\nKelas: {kelas}\nTanggal: {tanggal}\n\nJika ada kekeliruan, mohon hubungi pihak sekolah.\n\nWassalamu''alaikum Wr. Wb.')
on conflict (code) do nothing;

insert into academic_years (name, is_active) values ('2026/2027', true) on conflict (name) do nothing;
