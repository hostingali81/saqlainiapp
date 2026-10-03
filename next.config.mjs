

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


