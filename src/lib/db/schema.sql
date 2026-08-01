-- ============================================================
-- DRS 3D WORLD — SQLite schema
-- Idempotent: safe to run on every boot.
-- ============================================================

PRAGMA foreign_keys = ON;

-- ---------- Identity & access ------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'customer'
                CHECK (role IN ('admin','manager','sales','customer','viewer')),
  status        TEXT    NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','suspended','pending')),
  avatar_url    TEXT,
  -- Bumped on password change / forced logout: invalidates every issued JWT.
  token_version INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
-- The unique index on users(phone) is created in db/index.ts, not here: this
-- file runs on every boot including against existing databases, and a
-- duplicate number left over from before sign-in-by-mobile would abort the
-- whole migration and take the site down with it.

CREATE TABLE IF NOT EXISTS otp_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   TEXT    NOT NULL,
  purpose     TEXT    NOT NULL DEFAULT 'password_reset'
              CHECK (purpose IN ('password_reset','email_verify','login_2fa')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TEXT    NOT NULL,
  consumed_at TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_codes(user_id, purpose);

-- Short-lived ticket proving "this user just passed OTP", so the reset
-- screen can't be reached by guessing a URL.
CREATE TABLE IF NOT EXISTS reset_tickets (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT    NOT NULL UNIQUE,
  expires_at TEXT    NOT NULL,
  used_at    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Catalogue --------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  parent_id   INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  image_url   TEXT,
  icon        TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  seo_title   TEXT,
  seo_description TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS brands (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  slug       TEXT    NOT NULL UNIQUE,
  logo_url   TEXT,
  website    TEXT,
  description TEXT,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT    NOT NULL,
  slug            TEXT    NOT NULL UNIQUE,
  sku             TEXT    NOT NULL UNIQUE,
  category_id     INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  brand_id        INTEGER REFERENCES brands(id) ON DELETE SET NULL,
  short_description TEXT,
  description     TEXT,
  features        TEXT,           -- JSON array of strings
  specifications  TEXT,           -- JSON array of {label,value}

  price           REAL    NOT NULL DEFAULT 0,
  discount_price  REAL,
  currency        TEXT    NOT NULL DEFAULT 'INR',
  stock           INTEGER NOT NULL DEFAULT 0,
  availability    TEXT    NOT NULL DEFAULT 'in_stock'
                  CHECK (availability IN ('in_stock','made_to_order','out_of_stock','preorder')),

  -- Manufacturing attributes
  length_mm       REAL,
  width_mm        REAL,
  height_mm       REAL,
  weight_g        REAL,
  material        TEXT,
  print_technology TEXT,          -- FDM / SLA / SLS / MJF ...
  print_time_hours REAL,
  layer_height_mm REAL,
  infill_percent  INTEGER,
  color           TEXT,

  -- Merchandising flags
  is_featured     INTEGER NOT NULL DEFAULT 0,
  is_trending     INTEGER NOT NULL DEFAULT 0,
  is_popular      INTEGER NOT NULL DEFAULT 0,
  is_new_arrival  INTEGER NOT NULL DEFAULT 0,
  is_best_seller  INTEGER NOT NULL DEFAULT 0,
  visibility      TEXT    NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public','private','hidden')),
  status          TEXT    NOT NULL DEFAULT 'published'
                  CHECK (status IN ('draft','published','archived')),

  -- Media & downloads
  video_url       TEXT,           -- 5s MP4 hover loop
  youtube_url     TEXT,
  brochure_url    TEXT,           -- PDF
  stl_url         TEXT,
  file_3mf_url    TEXT,
  obj_url         TEXT,
  qr_code_url     TEXT,

  -- SEO
  seo_title       TEXT,
  seo_description TEXT,
  meta_keywords   TEXT,

  rating_avg      REAL    NOT NULL DEFAULT 0,
  rating_count    INTEGER NOT NULL DEFAULT 0,
  view_count      INTEGER NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, visibility);
CREATE INDEX IF NOT EXISTS idx_products_flags ON products(is_featured, is_trending, is_best_seller);

CREATE TABLE IF NOT EXISTS product_images (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url        TEXT    NOT NULL,
  alt        TEXT,
  kind       TEXT    NOT NULL DEFAULT 'gallery'
             CHECK (kind IN ('gallery','360','before','after','thumbnail')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  width      INTEGER,
  height     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_product_images ON product_images(product_id, kind, sort_order);

-- ---------- Colour variants ---------------------------------
-- The studio's standard filament/resin palette. Admin curates this list; each
-- product then opts into the subset it can actually be printed in.
CREATE TABLE IF NOT EXISTS colors (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  hex        TEXT    NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_colors (
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color_id    INTEGER NOT NULL REFERENCES colors(id) ON DELETE CASCADE,
  -- Optional photograph of this product in this colour; falls back to the
  -- product's main gallery image when absent.
  image_url   TEXT,
  price_delta REAL    NOT NULL DEFAULT 0,
  is_default  INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, color_id)
);
CREATE INDEX IF NOT EXISTS idx_product_colors ON product_colors(product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_relations (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  related_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, related_id)
);

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tag        TEXT    NOT NULL,
  PRIMARY KEY (product_id, tag)
);

-- ---------- Commerce ---------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number   TEXT    NOT NULL UNIQUE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name  TEXT    NOT NULL,
  customer_email TEXT    NOT NULL,
  customer_phone TEXT,
  shipping_address TEXT,
  subtotal       REAL    NOT NULL DEFAULT 0,
  discount       REAL    NOT NULL DEFAULT 0,
  tax            REAL    NOT NULL DEFAULT 0,
  shipping       REAL    NOT NULL DEFAULT 0,
  total          REAL    NOT NULL DEFAULT 0,
  coupon_code    TEXT,
  status         TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','printing','post_processing','shipped','completed','cancelled','refunded')),
  payment_status TEXT    NOT NULL DEFAULT 'unpaid'
                 CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  payment_method TEXT,
  notes          TEXT,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT    NOT NULL,
  sku          TEXT,
  quantity     INTEGER NOT NULL DEFAULT 1,
  unit_price   REAL    NOT NULL DEFAULT 0,
  total        REAL    NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  code          TEXT    NOT NULL UNIQUE,
  description   TEXT,
  type          TEXT    NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  value         REAL    NOT NULL DEFAULT 0,
  min_order     REAL    NOT NULL DEFAULT 0,
  max_discount  REAL,
  usage_limit   INTEGER,
  used_count    INTEGER NOT NULL DEFAULT 0,
  starts_at     TEXT,
  expires_at    TEXT,
  is_active     INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Content ----------------------------------------

CREATE TABLE IF NOT EXISTS banners (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  video_url   TEXT,
  cta_label   TEXT,
  cta_href    TEXT,
  placement   TEXT    NOT NULL DEFAULT 'home_hero',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  starts_at   TEXT,
  ends_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blogs (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,
  slug            TEXT    NOT NULL UNIQUE,
  excerpt         TEXT,
  content         TEXT,
  cover_url       TEXT,
  author_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  category        TEXT,
  tags            TEXT,       -- JSON array
  reading_minutes INTEGER NOT NULL DEFAULT 3,
  status          TEXT    NOT NULL DEFAULT 'published'
                  CHECK (status IN ('draft','published','archived')),
  view_count      INTEGER NOT NULL DEFAULT 0,
  seo_title       TEXT,
  seo_description TEXT,
  published_at    TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blog_comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  blog_id    INTEGER NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  author_name TEXT   NOT NULL,
  author_email TEXT,
  body       TEXT    NOT NULL,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS gallery_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT,
  caption     TEXT,
  url         TEXT    NOT NULL,
  thumb_url   TEXT,
  media_type  TEXT    NOT NULL DEFAULT 'image'
              CHECK (media_type IN ('image','video','360','before_after','customer_photo')),
  before_url  TEXT,
  after_url   TEXT,
  category    TEXT,
  tags        TEXT,
  width       INTEGER,
  height      INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS videos (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  title        TEXT    NOT NULL,
  description  TEXT,
  youtube_url  TEXT,
  file_url     TEXT,
  thumb_url    TEXT,
  duration_sec INTEGER,
  category     TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS testimonials (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  author_name  TEXT    NOT NULL,
  author_role  TEXT,
  company      TEXT,
  avatar_url   TEXT,
  quote        TEXT    NOT NULL,
  rating       INTEGER NOT NULL DEFAULT 5,
  is_featured  INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT    NOT NULL,
  rating      INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  title       TEXT,
  body        TEXT,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faqs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  question   TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  category   TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active  INTEGER NOT NULL DEFAULT 1,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Leads, enquiries & quotes ----------------------

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  subject    TEXT,
  message    TEXT,
  source     TEXT    NOT NULL DEFAULT 'contact_form',
  file_url   TEXT,
  status     TEXT    NOT NULL DEFAULT 'new'
             CHECK (status IN ('new','contacted','qualified','won','lost')),
  assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status, created_at);

CREATE TABLE IF NOT EXISTS quotes (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  reference       TEXT    NOT NULL UNIQUE,
  user_id         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_name   TEXT,
  customer_email  TEXT,
  customer_phone  TEXT,
  file_name       TEXT,
  file_url        TEXT,
  -- Geometry derived from the uploaded mesh
  volume_cm3      REAL,
  bbox_x_mm       REAL,
  bbox_y_mm       REAL,
  bbox_z_mm       REAL,
  triangle_count  INTEGER,
  surface_area_cm2 REAL,
  -- Chosen print parameters
  material        TEXT,
  technology      TEXT,
  layer_height_mm REAL,
  infill_percent  INTEGER,
  quantity        INTEGER NOT NULL DEFAULT 1,
  needs_support   INTEGER NOT NULL DEFAULT 0,
  -- Cost breakdown
  weight_g        REAL,
  print_hours     REAL,
  material_cost   REAL,
  machine_cost    REAL,
  labour_cost     REAL,
  electricity_cost REAL,
  support_cost    REAL,
  profit          REAL,
  gst             REAL,
  delivery        REAL,
  total           REAL,
  status          TEXT    NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','reviewed','sent','accepted','rejected')),
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- System -----------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  "group"    TEXT NOT NULL DEFAULT 'general',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS homepage_sections (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  key        TEXT    NOT NULL UNIQUE,
  title      TEXT    NOT NULL,
  subtitle   TEXT,
  config     TEXT,       -- JSON blob for the section's own settings
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  body       TEXT,
  type       TEXT    NOT NULL DEFAULT 'info'
             CHECK (type IN ('info','success','warning','error','order','lead','quote')),
  href       TEXT,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_name  TEXT,
  action      TEXT    NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  detail      TEXT,
  ip_address  TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS page_views (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  path       TEXT    NOT NULL,
  referrer   TEXT,
  country    TEXT,
  device     TEXT,
  session_id TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at);

CREATE TABLE IF NOT EXISTS media (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name   TEXT    NOT NULL,
  url         TEXT    NOT NULL,
  mime_type   TEXT,
  size_bytes  INTEGER,
  width       INTEGER,
  height      INTEGER,
  folder      TEXT    NOT NULL DEFAULT 'general',
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ---------- Redesign additions ------------------------------
-- The heart icon on a product card. One row per (customer, product); the
-- unique index is what makes "toggle" idempotent from the API.
CREATE TABLE IF NOT EXISTS wishlists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlists_user_product ON wishlists(user_id, product_id);
