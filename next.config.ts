import type { NextConfig } from 'next';

// sent with everything; the content security policy is added per request in proxy.ts
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer', // cdn hotlink protection rejects foreign referers, empty is fine
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Origin-Agent-Cluster': '?1',
  'X-DNS-Prefetch-Control': 'off',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy':
    'accelerometer=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), screen-wake-lock=(), usb=(), xr-spatial-tracking=(), interest-cohort=()',
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // the build cache once kept an old @theme and dropped new color classes; a full
    // build of this app takes ~2s, so it isn't worth it
    turbopackFileSystemCacheForBuild: false,
    // next's data cache (lib/server/cache.ts) stays in memory when we run it ourselves:
    // student data is never written to disk. on vercel it's vercel's data cache instead
    isrFlushToDisk: false,
  },
  turbopack: {
    rules: {
      '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' },
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: Object.entries(SECURITY_HEADERS).map(([key, value]) => ({ key, value })) }];
  },
};

export default nextConfig;
