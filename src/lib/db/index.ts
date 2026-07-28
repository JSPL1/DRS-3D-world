import 'server-only';

import Database from 'better-sqlite3';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { seedIfEmpty } from './seed';

/**
 * SQLite connection.
 *
 * Held on globalThis so Next.js' dev-mode module reloading doesn't open a new
 * file handle on every hot reload.
 */

const globalForDb = globalThis as unknown as { __drsDb?: Database.Database };

function resolveDbPath(): string {
  if (process.env.DATABASE_PATH) return resolve(process.env.DATABASE_PATH);
  const dir = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : resolve(process.cwd(), 'data');
  return join(dir, 'drs.sqlite');
}

function createConnection(): Database.Database {
  const path = resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);

  // WAL gives us concurrent reads while a write is in flight — the difference
  // between a snappy admin panel and one that stalls behind every save.
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  migrate(db);
  addMissingColumns(db);
  seedIfEmpty(db);
  ensureSettings(db);
  ensureColorPalette(db);
  purgeDemoRecords(db);
  return db;
}

/**
 * Earlier builds seeded ninety days of invented orders and three sample
 * quotes. They no longer are, but a database created by one of those builds
 * still carries them, and the studio has to run this panel for real — an
 * invented order is indistinguishable from a customer's once both are sitting
 * in the same list.
 *
 * The match is on the exact demo addresses and references the old seed used,
 * never "everything older than X": a real order must never be caught by this.
 * The flag makes it a one-shot, so a customer who genuinely uses example.com
 * isn't wiped on the next boot.
 */
function purgeDemoRecords(db: Database.Database) {
  // Version, not a boolean: the first pass took the orders and quotes, the
  // second the leftover demo notifications and log lines that described them.
  const PURGE_VERSION = '2';
  const flag = db
    .prepare(`SELECT value FROM settings WHERE key = 'demo_records_purged'`)
    .get() as { value: string } | undefined;
  if (flag?.value === PURGE_VERSION) return;

  const demoBuyers = [
    'customer@example.com', 'sourav@example.com', 'procurement@kiit.example',
    'purchase@rsp.example', 'meera@clinic.example', 'studio@bbsr.example',
  ];
  const demoQuoteRefs = ['QT-24801', 'QT-24802', 'QT-24803'];

  db.transaction(() => {
    const buyerSlots = demoBuyers.map(() => '?').join(',');
    db.prepare(
      `DELETE FROM order_items WHERE order_id IN
         (SELECT id FROM orders WHERE customer_email IN (${buyerSlots}))`,
    ).run(...demoBuyers);
    db.prepare(`DELETE FROM orders WHERE customer_email IN (${buyerSlots})`).run(...demoBuyers);

    db.prepare(
      `DELETE FROM quotes WHERE reference IN (${demoQuoteRefs.map(() => '?').join(',')})`,
    ).run(...demoQuoteRefs);

    // The notifications and log lines the old seed wrote to make the panel
    // look busy. Matched on their exact seeded titles so a real notification
    // can never be caught by this.
    const demoNotifications = [
      'New quote request', 'Order marked shipped', 'New lead',
      'Low stock', 'Backup completed',
    ];
    db.prepare(
      `DELETE FROM notifications WHERE title IN (${demoNotifications.map(() => '?').join(',')})`,
    ).run(...demoNotifications);

    const demoLogs = [
      'Added "Anatomical Heart — Surgical Planning Model"',
      'Moved DRS-482910 to shipped',
      'Approved review by Subrat M.',
      'Changed GST percentage to 18',
      'Created FESTIVE500',
      'Signed in from Bhubaneswar',
    ];
    db.prepare(
      `DELETE FROM activity_logs WHERE detail IN (${demoLogs.map(() => '?').join(',')})`,
    ).run(...demoLogs);

    db.prepare(
      `INSERT OR REPLACE INTO settings (key, value, "group")
       VALUES ('demo_records_purged', ?, 'system')`,
    ).run(PURGE_VERSION);
  })();
}

/**
 * `CREATE TABLE IF NOT EXISTS` can't add a column to a table that already
 * exists, so schema additions to live tables are applied here. SQLite has no
 * `ADD COLUMN IF NOT EXISTS`, hence the pragma check.
 */
function addMissingColumns(db: Database.Database) {
  const additions: Array<[string, string, string]> = [
    ['order_items', 'color_name', 'TEXT'],
    ['order_items', 'color_hex', 'TEXT'],
    ['orders', 'placed_via', "TEXT NOT NULL DEFAULT 'website'"],
    // Set the moment a customer passes the emailed code. Null means the
    // account exists but has never proved it owns the address.
    ['users', 'email_verified_at', 'TEXT'],

    // Who entered a product, and whether an administrator has signed it off.
    // The name is denormalised on purpose: it has to survive the staff member
    // leaving and their account being removed.
    ['products', 'created_by', 'INTEGER'],
    ['products', 'created_by_name', 'TEXT'],
    ['products', 'updated_by_name', 'TEXT'],
    // 'approved' is the default so every product that already exists stays on
    // the site — the rule applies to what is entered from now on.
    ['products', 'approval_status', "TEXT NOT NULL DEFAULT 'approved'"],
    ['products', 'approved_by_name', 'TEXT'],
    ['products', 'approved_at', 'TEXT'],
    ['products', 'review_note', 'TEXT'],
  ];

  for (const [table, column, definition] of additions) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  // Accounts created before sign-in existed were made by the studio and are
  // trusted; only self-registered accounts have to pass the code.
  db.exec(
    `UPDATE users SET email_verified_at = created_at
     WHERE email_verified_at IS NULL AND status = 'active'`,
  );

  // Sign-in accepts a mobile number, so a number can only belong to one
  // account. Deliberately not in schema.sql: that file runs on every boot
  // against the live database, and a duplicate number left over from before
  // this rule existed would abort the migration and take the site down. Here
  // the failure is contained — sign-in by email keeps working either way.
  try {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone
         ON users(phone) WHERE phone IS NOT NULL AND phone <> ''`,
    );
  } catch (error) {
    console.error(
      '[drs] could not make users.phone unique — resolve the duplicate numbers in Admin → Users. Sign-in by mobile is disabled until then.',
      error,
    );
  }
}

/**
 * The six standard finishes the studio offers. Seeded once; the admin can
 * deactivate or extend the list afterwards without it being re-added.
 */
function ensureColorPalette(db: Database.Database) {
  const existing = db.prepare('SELECT COUNT(*) AS c FROM colors').get() as { c: number };
  if (existing.c > 0) return;

  const insert = db.prepare(
    `INSERT OR IGNORE INTO colors (name, hex, sort_order) VALUES (?, ?, ?)`,
  );
  const palette: Array<[string, string]> = [
    ['Matte Black', '#1b1b1f'],
    ['Pearl White', '#f2f2ef'],
    ['Flame Orange', '#ff6b00'],
    ['Antique Bronze', '#8c6239'],
    ['Deep Blue', '#1f4e9c'],
    ['Forest Green', '#1f6b45'],
  ];

  db.transaction(() => {
    palette.forEach(([name, hex], i) => insert.run(name, hex, i));
  })();

  linkDefaultProductColors(db);
}

/**
 * Gives every physical product the studio's standard palette, and attaches the
 * studio's own photographs to the pieces they actually show. Runs once, when
 * the palette is first created — the admin's per-product choices afterwards
 * are never overwritten.
 */
function linkDefaultProductColors(db: Database.Database) {
  // ORDER BY matters: the first colour becomes each product's default, and an
  // unordered SELECT made that arbitrary between installs.
  const colors = db
    .prepare('SELECT id, name FROM colors ORDER BY sort_order, id')
    .all() as Array<{ id: number; name: string }>;

  const products = db
    .prepare(`SELECT id, slug FROM products`)
    .all() as Array<{ id: number; slug: string }>;

  // Services and made-to-order work have no colour choice to offer.
  const noColour = new Set(['rapid-prototype-service-concept-model']);

  // Real photographs from the studio, mapped to the finish they show.
  const photos: Record<string, Partial<Record<string, string>>> = {
    'custom-couple-statue-from-your-photos': {
      'Pearl White': '/sample/screenshot-2026-07-26-010448.png',
      'Antique Bronze': '/sample/screenshot-2026-07-26-010606.png',
    },
    'hanuman-statue-heritage-edition': {
      'Antique Bronze': '/sample/hanuman-3d-model.jpg',
      'Matte Black': '/sample/screenshot-2026-07-26-010501.png',
      'Pearl White': '/sample/screenshot-2026-07-26-010523.png',
    },
    'voronoi-table-lamp': {
      'Pearl White': '/sample/screenshot-2026-07-26-010606.png',
      'Flame Orange': '/sample/screenshot-2026-07-26-010757.png',
    },
  };

  const link = db.prepare(
    `INSERT OR IGNORE INTO product_colors (product_id, color_id, image_url, is_default, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  );

  db.transaction(() => {
    for (const product of products) {
      if (noColour.has(product.slug)) continue;

      const productPhotos = photos[product.slug] ?? {};
      colors.forEach((color, index) => {
        link.run(
          product.id,
          color.id,
          productPhotos[color.name] ?? null,
          index === 0 ? 1 : 0,
          index,
        );
      });
    }
  })();
}

/**
 * Settings introduced after a database was first seeded won't exist in it.
 * Insert any missing keys with their defaults so an upgraded install behaves
 * like a fresh one, without disturbing values the admin has already set.
 */
function ensureSettings(db: Database.Database) {
  const defaults: Array<[string, string, string]> = [
    ['site_theme', 'dark', 'appearance'],
    ['site_logo_url', '', 'appearance'],
    ['site_logo_light_url', '', 'appearance'],
    ['site_favicon_url', '', 'appearance'],
    ['site_cursor', 'system', 'appearance'],

    // Outgoing mail. Blank until the studio fills it in; every code-sending
    // flow reports a clear "not configured" error until then rather than
    // silently succeeding.
    ['smtp_host', '', 'email'],
    ['smtp_port', '587', 'email'],
    ['smtp_secure', 'false', 'email'],
    ['smtp_user', '', 'email'],
    ['smtp_pass', '', 'email'],
    ['smtp_from_name', 'DRS 3D WORLD', 'email'],
    ['smtp_from_address', '', 'email'],
  ];

  const insert = db.prepare(
    `INSERT OR IGNORE INTO settings (key, value, "group") VALUES (?, ?, ?)`,
  );
  db.transaction(() => {
    for (const [key, value, group] of defaults) insert.run(key, value, group);
  })();
}

function migrate(db: Database.Database) {
  const schemaPath = join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  if (!existsSync(schemaPath)) {
    throw new Error(`[drs] schema.sql not found at ${schemaPath}`);
  }
  db.exec(readFileSync(schemaPath, 'utf8'));
}

export function getDb(): Database.Database {
  if (!globalForDb.__drsDb) {
    globalForDb.__drsDb = createConnection();
  }
  return globalForDb.__drsDb;
}

/* ---------- Small typed query helpers ---------- */

export function all<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function one<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function run(sql: string, params: unknown[] = []) {
  return getDb()
    .prepare(sql)
    .run(...(params as never[]));
}

export function count(sql: string, params: unknown[] = []): number {
  const row = one<{ c: number }>(sql, params);
  return row?.c ?? 0;
}

/** JSON columns are stored as TEXT; decode defensively so bad data can't 500 a page. */
export function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value.trim() === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
