import { NextRequest } from 'next/server';

/**
 * On-brand generated placeholder imagery.
 *
 * The studio's real photography drops in later by swapping the stored URLs —
 * until then this keeps every tile looking deliberate instead of broken, with
 * no external image host and nothing to bundle.
 */

export const dynamic = 'force-static';
export const revalidate = 31536000;

const PALETTE = [
  ['#ff6b00', '#722c00'],
  ['#ff8433', '#16161a'],
  ['#e85d00', '#0a0a0c'],
  ['#ff9d63', '#2a2a32'],
  ['#bf4a00', '#050506'],
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c] as string,
  );
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const title = (sp.get('title') ?? 'DRS 3D WORLD').slice(0, 80);
  const seed = Number(sp.get('seed') ?? 0);
  const w = Math.min(Math.max(Number(sp.get('w') ?? 1200), 64), 2400);
  const h = Math.min(Math.max(Number(sp.get('h') ?? 900), 64), 2400);

  const n = hash(title) + seed;
  const [c1, c2] = PALETTE[n % PALETTE.length];
  const rot = (n % 60) - 30;

  // A few isometric-ish plates suggesting a part on a build surface.
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.26;
  const layers = 5 + (n % 4);
  const plates = Array.from({ length: layers }, (_, i) => {
    const t = i / layers;
    const s = size * (1 - t * 0.45);
    const y = cy + size * 0.45 - i * (size * 0.16);
    const o = (0.18 + t * 0.5).toFixed(2);
    return `<ellipse cx="${cx}" cy="${y.toFixed(1)}" rx="${s.toFixed(1)}" ry="${(s * 0.42).toFixed(1)}" fill="url(#lg)" opacity="${o}"/>`;
  }).join('');

  const label = escapeXml(title);
  const fontSize = Math.max(14, Math.min(w, h) * 0.045);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="#050506"/>
    </linearGradient>
    <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${rot} 0.5 0.5)">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0H0V44" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${plates}
  <rect x="0" y="${h - 4}" width="${w}" height="4" fill="${c1}" opacity="0.85"/>
  <text x="${w / 2}" y="${h - fontSize * 1.6}" text-anchor="middle"
        font-family="Segoe UI, system-ui, sans-serif" font-size="${fontSize}" font-weight="600"
        fill="#ffffff" fill-opacity="0.9">${label}</text>
  <text x="${w / 2}" y="${h - fontSize * 0.55}" text-anchor="middle"
        font-family="Segoe UI, system-ui, sans-serif" font-size="${(fontSize * 0.46).toFixed(1)}"
        letter-spacing="${(fontSize * 0.14).toFixed(1)}" fill="${c1}" fill-opacity="0.95">DRS 3D WORLD</text>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
