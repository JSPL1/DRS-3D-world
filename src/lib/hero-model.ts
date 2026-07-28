import 'server-only';

import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The sculpted mesh the hero printer prints, if the studio has supplied one.
 *
 * Everything else in the print queue is generated from primitives in code. A
 * devotional sculpt cannot be: the crown, the jewellery, the drapery and the
 * face are hand-sculpted detail with no procedural shorthand, so code can only
 * ever produce a figure-shaped approximation of it. The studio already owns
 * the real mesh — this looks for it.
 *
 * Drop the file at `public/models/hanuman.glb` (preferred — far smaller over
 * the wire) or `public/models/hanuman.stl`. Nothing else is required: the
 * loader centres it, stands it up, and scales it to the plate. If no file is
 * there, the procedural stand-in keeps printing.
 */

const CANDIDATES = ['hanuman.glb', 'hanuman.gltf', 'hanuman.stl'] as const;

export function getHeroSculptUrl(): string | null {
  for (const name of CANDIDATES) {
    if (existsSync(join(process.cwd(), 'public', 'models', name))) {
      return `/models/${name}`;
    }
  }
  return null;
}
