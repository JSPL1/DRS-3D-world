import 'server-only';

import { one } from '@/lib/db';

/**
 * Product codes, issued by the system.
 *
 * They used to be typed in, which meant they were sometimes duplicated,
 * sometimes left in an inconsistent house style, and always one more field
 * between a staff member and a saved product. Nothing in the shop derives
 * meaning from the code — it identifies a row — so there is no reason for a
 * person to compose it.
 *
 * `DRS-00001` upwards. Numbered from the highest code already issued rather
 * than from a row count, so deleting a product never re-issues its number:
 * an old invoice and the catalogue must not disagree about what DRS-00042 is.
 */

const PREFIX = 'DRS-';
const WIDTH = 5;

export async function nextSku(): Promise<string> {
  // Only codes in this exact shape are considered. Older hand-written ones
  // (DRS-ST-HNM-001) are left out of the sequence rather than parsed.
  const highest = await one<{ sku: string }>(
    `SELECT sku FROM products
     WHERE sku REGEXP '^${PREFIX}[0-9]{5}$'
     ORDER BY sku DESC LIMIT 1`,
  );

  const current = highest ? Number(highest.sku.slice(PREFIX.length)) : 0;
  let next = current + 1;

  // A hand-written code could still occupy the slot we are about to issue.
  for (;;) {
    const candidate = `${PREFIX}${String(next).padStart(WIDTH, '0')}`;
    const taken = await one<{ id: number }>(`SELECT id FROM products WHERE sku = ?`, [candidate]);
    if (!taken) return candidate;
    next += 1;
  }
}
