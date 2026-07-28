/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // better-sqlite3 is a native module — it must stay outside the server bundle.
  serverExternalPackages: ['better-sqlite3'],
  images: {
    formats: ['image/avif', 'image/webp'],

    // Next 16 requires local image sources to be declared explicitly.
    // `search` is an exact-match field, not a glob — omitting it is what
    // permits arbitrary query strings, which the generated tiles rely on.
    localPatterns: [
      { pathname: '/api/tile' },
      { pathname: '/uploads/**' },
      { pathname: '/sample/**' },
    ],

    // The placeholder tiles at /api/tile are generated SVG, and the image
    // optimiser rejects SVG with a 400 unless this is on — which silently
    // broke every generated product image.
    //
    // The documented mitigations are applied together: images are served
    // under a CSP that forbids scripts and sandboxes the document, and no
    // remote hosts are allowed at all, so the only SVG that can reach the
    // optimiser is the one this app generates itself.
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion', 'recharts'],
    // Serialize static-generation workers to one at a time. Left at the
    // default (one worker per CPU), Next.js's build spikes memory well past
    // what small/shared hosts allow — each worker loads the full app and the
    // database driver independently. Trades build wall-clock time for a
    // build that completes at all in a constrained-memory environment.
    cpus: 1,
    workerThreads: false,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
