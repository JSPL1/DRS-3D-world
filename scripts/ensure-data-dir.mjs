// Guarantees the SQLite data directory exists before the app boots.
// Runs on postinstall so Render (and any fresh clone) never starts without it.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = process.env.DATA_DIR ?? resolve(process.cwd(), 'data');
mkdirSync(dir, { recursive: true });
console.log(`[drs] data directory ready: ${dir}`);
