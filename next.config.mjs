

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // next/image is only used for local files (the logo). Member photos and
    // ui-avatars load through plain <img>, so no remote host is allowed here:
    // the old `*.supabase.co` wildcard let any Supabase project's files - SVG
    // included - be served through this site's image optimizer.
    formats: ['image/webp'],
    unoptimized: false,
    minimumCacheTTL: 60,
  },
  compress: true,
  async headers() {
    // The service worker and manifest must always be re-checked, otherwise an
    // update can take days to reach installed apps.
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'no-cache' }],
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-avatar'],
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;


