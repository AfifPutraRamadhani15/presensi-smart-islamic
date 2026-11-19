/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const longCache = [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }];
    return [
      { source: '/models/:path*', headers: longCache },
      { source: '/vendor/:path*', headers: longCache },
      { source: '/icons/:path*', headers: longCache },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          // Kamera hanya boleh dipakai oleh origin sendiri
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=()' },
        ],
      },
    ];
  },
};