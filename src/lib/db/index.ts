import 'server-only';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import mysql from 'mysql2/promise';

import { seedIfEmpty } from './seed';

/**
 * MySQL connection pool.
 *
 * Held on globalThis so Next.js' dev-mode module reloading doesn't open a new
 * pool on every hot reload.
 */

const globalForDb = globalThis as unknown as { __drsPool?: mysql.Pool; __drsReady?: Promise<void> };

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    // MySQL returns DATETIME/TIMESTAMP columns as JS Date objects by default;
    // the app was written against SQLite's plain "YYYY-MM-DD HH:MM:SS" text
    // columns, so every date-handling call site expects a string. Keeping
    // them as strings here avoids touching every one of those call sites.
    dateStrings: true,
    decimalNumbers: true,
  });
}

export function getPool(): mysql.Pool {
  if (!globalForDb.__drsPool) {
    globalForDb.__drsPool = createPool();
  }
  return globalForDb.__drsPool;
}

/** Runs once per process: schema, additive migrations, seed, settings, cleanup. */
function ready(): Promise<void> {
  if (!globalForDb.__drsReady) {
    globalForDb.__drsReady = initialise();
  }
  return globalForDb.__drsReady;
}

async function initialise(): Promise<void> {
  const pool = getPool();
  await migrate(pool);
  await addMissingColumns(pool);
  await seedIfEmpty(pool);
  await ensureSettings(pool);
  await ensureColorPalette(pool);
  await purgeDemoRecords(pool);
}

/**
 * schema.sql runs on every boot. `CREATE TABLE IF NOT EXISTS` is naturally
 * idempotent; MySQL has no `CREATE INDEX IF NOT EXISTS`, so a rerun's
 * "Duplicate key name" (1061) and "Duplicate entry" for unique indexes are
 * swallowed here instead.
 */
async function migrate(pool: mysql.Pool) {
  const schemaPath = join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf8');
  const statements = splitStatements(sql);

  const conn = await pool.getConnection();
  try {
    for (const statement of statements) {
      try {
        await conn.query(statement);
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === 'ER_DUP_KEYNAME' || code === 'ER_DUP_FIELDNAME') continue;
        throw error;
      }
    }
  } finally {
    conn.release();
  }
}

/** Splits on statement-terminating semicolons; none of our DDL uses `;` inside strings. */
function splitStatements(sql: string): string[] {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
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
async function purgeDemoRecords(pool: mysql.Pool) {
  const PURGE_VERSION = '2';
  const [rows] = await pool.query<mysql.RowDataPacket[]>(
    `SELECT value FROM settings WHERE \`key\` = 'demo_records_purged'`,
  );
  if (rows[0]?.value === PURGE_VERSION) return;

  const demoBuyers = [
    'customer@example.com', 'sourav@example.com', 'procurement@kiit.example',
    'purchase@rsp.example', 'meera@clinic.example', 'studio@bbsr.example',
  ];
  const demoQuoteRefs = ['QT-24801', 'QT-24802', 'QT-24803'];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const buyerSlots = demoBuyers.map(() => '?').join(',');
    await conn.query(
      `DELETE oi FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.customer_email IN (${buyerSlots})`,
      demoBuyers,
    );
    await conn.query(`DELETE FROM orders WHERE customer_email IN (${buyerSlots})`, demoBuyers);

    await conn.query(
      `DELETE FROM quotes WHERE reference IN (${demoQuoteRefs.map(() => '?').join(',')})`,
      demoQuoteRefs,
    );

    const demoNotifications = [
      'New quote request', 'Order marked shipped', 'New lead',
      'Low stock', 'Backup completed',
    ];
    await conn.query(
      `DELETE FROM notifications WHERE title IN (${demoNotifications.map(() => '?').join(',')})`,
      demoNotifications,
    );

    const demoLogs = [
      'Added "Anatomical Heart — Surgical Planning Model"',
      'Moved DRS-482910 to shipped',
      'Approved review by Subrat M.',
      'Changed GST percentage to 18',
      'Created FESTIVE500',
      'Signed in from Bhubaneswar',
    ];
    await conn.query(`DELETE FROM activity_logs WHERE detail IN (${demoLogs.map(() => '?').join(',')})`, demoLogs);

    await conn.query(
      `INSERT INTO settings (\`key\`, value, \`group\`) VALUES ('demo_records_purged', ?, 'system')
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [PURGE_VERSION],
    );

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Schema additions applied after the initial 31-table set was drawn up.
 * `ALTER TABLE ... ADD COLUMN` isn't guarded by `IF NOT EXISTS` on every
 * MySQL version in the wild, so existence is checked against
 * information_schema first.
 */
async function addMissingColumns(pool: mysql.Pool) {
  const additions: Array<[string, string, string]> = [
    ['orders', 'placed_via', "VARCHAR(32) NOT NULL DEFAULT 'website'"],
    ['users', 'email_verified_at', 'DATETIME'],
    ['orders', 'gift_wrap', 'TINYINT(1) NOT NULL DEFAULT 0'],
    ['orders', 'gift_wrap_fee', 'DOUBLE NOT NULL DEFAULT 0'],
    ['orders', 'gift_note', 'TEXT'],
    ['orders', 'delivery_lat', 'DOUBLE'],
    ['orders', 'delivery_lng', 'DOUBLE'],
    ['orders', 'delivery_landmark', 'TEXT'],
    ['orders', 'shipping_method', "VARCHAR(32) NOT NULL DEFAULT 'standard'"],
    ['users', 'loyalty_points', 'INT NOT NULL DEFAULT 0'],
    ['users', 'oauth_google_id', 'VARCHAR(255)'],
    ['users', 'oauth_facebook_id', 'VARCHAR(255)'],
  ];

  for (const [table, column, definition] of additions) {
    const [rows] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, column],
    );
    if (rows.length === 0) {
      await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  }

  // Accounts created before sign-in existed were made by the studio and are
  // trusted; only self-registered accounts have to pass the code.
  await pool.query(
    `UPDATE users SET email_verified_at = created_at
      WHERE email_verified_at IS NULL AND status = 'active'`,
  );

  // Sign-in accepts a mobile number, so a number can only belong to one
  // account. Deliberately not in schema.sql: that file runs on every boot
  // against the live database, and a duplicate number left over from before
  // this rule existed would abort the migration and take the site down. Here
  // the failure is contained — sign-in by email keeps working either way.
  try {
    const [idx] = await pool.query<mysql.RowDataPacket[]>(
      `SELECT INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_phone'`,
    );
    if (idx.length === 0) {
      // MySQL has no partial/filtered unique index, so empty-string numbers
      // are normalised to NULL first — NULL is exempt from uniqueness.
      await pool.query(`UPDATE users SET phone = NULL WHERE phone = ''`);
      await pool.query(`CREATE UNIQUE INDEX idx_users_phone ON users(phone)`);
    }
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
async function ensureColorPalette(pool: mysql.Pool) {
  const [rows] = await pool.query<mysql.RowDataPacket[]>('SELECT COUNT(*) AS c FROM colors');
  if (rows[0].c > 0) return;

  const palette: Array<[string, string]> = [
    ['Matte Black', '#1b1b1f'],
    ['Pearl White', '#f2f2ef'],
    ['Flame Orange', '#ff6b00'],
    ['Antique Bronze', '#8c6239'],
    ['Deep Blue', '#1f4e9c'],
    ['Forest Green', '#1f6b45'],
  ];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [i, [name, hex]] of palette.entries()) {
      await conn.query(
        `INSERT IGNORE INTO colors (name, hex, sort_order) VALUES (?, ?, ?)`,
        [name, hex, i],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  await linkDefaultProductColors(pool);
}

/**
 * Gives every physical product the studio's standard palette, and attaches the
 * studio's own photographs to the pieces they actually show. Runs once, when
 * the palette is first created — the admin's per-product choices afterwards
 * are never overwritten.
 */
async function linkDefaultProductColors(pool: mysql.Pool) {
  const [colors] = await pool.query<mysql.RowDataPacket[]>(
    'SELECT id, name FROM colors ORDER BY sort_order, id',
  );
  const [products] = await pool.query<mysql.RowDataPacket[]>('SELECT id, slug FROM products');

  const noColour = new Set(['rapid-prototype-service-concept-model']);

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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const product of products) {
      if (noColour.has(product.slug as string)) continue;

      const productPhotos = photos[product.slug as string] ?? {};
      for (const [index, color] of colors.entries()) {
        await conn.query(
          `INSERT IGNORE INTO product_colors (product_id, color_id, image_url, is_default, sort_order)
           VALUES (?, ?, ?, ?, ?)`,
          [
            product.id,
            color.id,
            productPhotos[color.name as string] ?? null,
            index === 0 ? 1 : 0,
            index,
          ],
        );
      }
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/**
 * Settings introduced after a database was first seeded won't exist in it.
 * Insert any missing keys with their defaults so an upgraded install behaves
 * like a fresh one, without disturbing values the admin has already set.
 */
async function ensureSettings(pool: mysql.Pool) {
  const defaults: Array<[string, string, string]> = [
    ['site_theme', 'light', 'appearance'],
    ['site_logo_url', '/brand/logo.png', 'appearance'],
    ['site_logo_light_url', '/brand/logo.png', 'appearance'],
    ['site_favicon_url', '/brand/logo.png', 'appearance'],
    ['site_cursor', 'system', 'appearance'],

    ['hero_3d_enabled', 'true', 'appearance'],
    ['hero_3d_play_mode', 'scroll', 'appearance'],
    ['hero_3d_scroll_vh', '720', 'appearance'],
    ['hero_3d_time_seconds', '14', 'appearance'],

    ['smtp_host', '', 'email'],
    ['smtp_port', '587', 'email'],
    ['smtp_secure', 'false', 'email'],
    ['smtp_user', '', 'email'],
    ['smtp_pass', '', 'email'],
    ['smtp_from_name', 'DRS 3D WORLD', 'email'],
    ['smtp_from_address', '', 'email'],

    ['shipping_standard_fee', '250', 'shipping'],
    ['shipping_standard_days', '5-7 working days', 'shipping'],
    ['shipping_express_fee', '600', 'shipping'],
    ['shipping_express_days', '2-3 working days', 'shipping'],
    ['shipping_priority_fee', '1200', 'shipping'],
    ['shipping_priority_days', 'Next working day', 'shipping'],

    ['gift_wrap_fee', '149', 'shipping'],

    ['company_gstin', '', 'commerce'],
    ['delivery_partner', 'DRS 3D WORLD Delivery', 'shipping'],

    ['oauth_google_client_id', '', 'integrations'],
    ['oauth_google_client_secret', '', 'integrations'],
    ['oauth_facebook_app_id', '', 'integrations'],
    ['oauth_facebook_app_secret', '', 'integrations'],
    ['razorpay_key_id', '', 'integrations'],
    ['razorpay_key_secret', '', 'integrations'],
    ['whatsapp_phone_id', '', 'integrations'],
    ['whatsapp_access_token', '', 'integrations'],
  ];

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value, group] of defaults) {
      await conn.query(
        `INSERT IGNORE INTO settings (\`key\`, value, \`group\`) VALUES (?, ?, ?)`,
        [key, value, group],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

/* ---------- Small typed query helpers ---------- */
// Every call site across the app now awaits these — MySQL, unlike the old
// SQLite connection, has no synchronous query path.

export async function all<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ready();
  const [rows] = await getPool().query<mysql.RowDataPacket[]>(sql, params);
  return rows as T[];
}

export async function one<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const rows = await all<T>(sql, params);
  return rows[0];
}

export async function run(sql: string, params: unknown[] = []) {
  await ready();
  const [result] = await getPool().query<mysql.ResultSetHeader>(sql, params);
  return { lastInsertRowid: result.insertId, changes: result.affectedRows };
}

export async function count(sql: string, params: unknown[] = []): Promise<number> {
  const row = await one<{ c: number }>(sql, params);
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
