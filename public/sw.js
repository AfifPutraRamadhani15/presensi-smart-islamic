// Service worker minimal: cache cangkang statis & model face-api. API TIDAK pernah di-cache.
// psi-v2: versi lama bisa menyimpan respons yang gagal (mis. 404/500) untuk file model,
// sehingga Face ID macet di "Memuat model". Nama cache diganti supaya cache lama dibuang.
const CACHE = 'psi-v2';
const PRECACHE = ['/manifest.json', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (e.request.headers.has('range')) return; // permintaan sebagian (206) tidak di-cache
  if (u.pathname.startsWith('/models/') || u.pathname.startsWith('/vendor/') || u.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => {
        // Hanya simpan respons yang benar-benar sukses.
        if (r && r.status === 200 && r.type === 'basic') {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, cp)).catch(() => {});
        }
        return r;
      }))
    );
  }
});