/**
 * The database schema, as a string rather than a file.
 *
 * It used to be read from schema.sql at boot with readFileSync. On a host that
 * deploys only the build output — or runs the server from a different working
 * directory — that file is not there, the read throws, and because the result
 * of the one-time initialisation is cached, *every* request afterwards fails
 * with it. Compiling the schema into the bundle removes the filesystem from
 * the boot path entirely.
 *
 * This is the single source of truth; schema.sql no longer exists.
 */
export const SCHEMA_SQL = `
-- ============================================================
-- DRS 3D WORLD — MySQL schema
-- Idempotent: safe to run on every boot (CREATE TABLE IF NOT EXISTS).
-- ============================================================

-- ---------- Identity & access ------------------------------

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(32),
  password_hash TEXT    NOT NULL,
  role          VARCHAR(16) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('admin','manager','sales','customer','viewer')),
  status        VARCHAR(16) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','suspended','pending')),
  avatar_url    TEXT,
  -- Bumped on password change / forced logout: invalidates every issued JWT.
  token_version INT NOT NULL DEFAULT 0,
  last_login_at DATETIME,

  -- Set the moment a customer passes the emailed code. Null means the account
  -- exists but has never proved it owns the address. Declared here as well as
  -- in addMissingColumns(): a database built from this file alone — an import
  -- into a fresh host, before the app has ever booted — must already carry
  -- every column the live data has, or the import fails on the first row.
  email_verified_at DATETIME,
  -- Loyalty: 1 point per ₹100 spent on a completed order.
  loyalty_points    INT NOT NULL DEFAULT 0,
  oauth_google_id   VARCHAR(255),
  oauth_facebook_id VARCHAR(255),

  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_users_role ON users(role);
-- The unique index on users(phone) is created in db/index.ts, not here: this
-- file runs on every boot including against existing databases, and a
-- duplicate number left over from before sign-in-by-mobile would abort the
-- whole migration and take the site down with it.

CREATE TABLE IF NOT EXISTS otp_codes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  code_hash   TEXT    NOT NULL,
  purpose     VARCHAR(32) NOT NULL DEFAULT 'password_reset'
              CHECK (purpose IN ('password_reset','email_verify','login_2fa')),
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  DATETIME NOT NULL,
  consumed_at DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_otp_user ON otp_codes(user_id, purpose);

-- Short-lived ticket proving "this user just passed OTP", so the reset
-- screen can't be reached by guessing a URL.
CREATE TABLE IF NOT EXISTS reset_tickets (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Catalogue --------------------------------------

CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  slug        VARCHAR(255) NOT NULL UNIQUE,
  parent_id   INT,
  description TEXT,
  image_url   TEXT,
  icon        VARCHAR(64),
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  seo_title   VARCHAR(255),
  seo_description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS brands (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  slug       VARCHAR(255) NOT NULL UNIQUE,
  logo_url   TEXT,
  website    TEXT,
  description TEXT,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  sku             VARCHAR(64) NOT NULL UNIQUE,
  category_id     INT,
  brand_id        INT,
  short_description TEXT,
  description     TEXT,
  features        TEXT,           -- JSON array of strings
  specifications  TEXT,           -- JSON array of {label,value}

  price           DOUBLE NOT NULL DEFAULT 0,
  discount_price  DOUBLE,
  currency        VARCHAR(8) NOT NULL DEFAULT 'INR',
  stock           INT NOT NULL DEFAULT 0,
  availability    VARCHAR(16) NOT NULL DEFAULT 'in_stock'
                  CHECK (availability IN ('in_stock','made_to_order','out_of_stock','preorder')),

  -- Manufacturing attributes
  length_mm       DOUBLE,
  width_mm        DOUBLE,
  height_mm       DOUBLE,
  weight_g        DOUBLE,
  material        VARCHAR(255),
  print_technology VARCHAR(32),   -- FDM / SLA / SLS / MJF ...
  print_time_hours DOUBLE,
  layer_height_mm DOUBLE,
  infill_percent  INT,
  color           VARCHAR(64),

  -- Merchandising flags
  is_featured     TINYINT(1) NOT NULL DEFAULT 0,
  is_trending     TINYINT(1) NOT NULL DEFAULT 0,
  is_popular      TINYINT(1) NOT NULL DEFAULT 0,
  is_new_arrival  TINYINT(1) NOT NULL DEFAULT 0,
  is_best_seller  TINYINT(1) NOT NULL DEFAULT 0,
  visibility      VARCHAR(16) NOT NULL DEFAULT 'public'
                  CHECK (visibility IN ('public','private','hidden')),
  status          VARCHAR(16) NOT NULL DEFAULT 'published'
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
  seo_title       VARCHAR(255),
  seo_description TEXT,
  meta_keywords   TEXT,

  rating_avg      DOUBLE NOT NULL DEFAULT 0,
  rating_count    INT NOT NULL DEFAULT 0,
  view_count      INT NOT NULL DEFAULT 0,
  sort_order      INT NOT NULL DEFAULT 0,

  -- Who entered a product, and whether an administrator has signed it off.
  -- The name is denormalised on purpose: it has to survive the staff member
  -- leaving and their account being removed.
  created_by        INT,
  created_by_name   VARCHAR(255),
  updated_by_name   VARCHAR(255),
  approval_status   VARCHAR(16) NOT NULL DEFAULT 'approved',
  approved_by_name  VARCHAR(255),
  approved_at       DATETIME,
  review_note       TEXT,

  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status, visibility);
CREATE INDEX idx_products_flags ON products(is_featured, is_trending, is_best_seller);

CREATE TABLE IF NOT EXISTS product_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  url        TEXT    NOT NULL,
  alt        TEXT,
  kind       VARCHAR(16) NOT NULL DEFAULT 'gallery'
             CHECK (kind IN ('gallery','360','before','after','thumbnail')),
  sort_order INT NOT NULL DEFAULT 0,
  width      INT,
  height     INT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_product_images ON product_images(product_id, kind, sort_order);

-- ---------- Colour variants ---------------------------------
-- The studio's standard filament/resin palette. Admin curates this list; each
-- product then opts into the subset it can actually be printed in.
CREATE TABLE IF NOT EXISTS colors (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL UNIQUE,
  hex        VARCHAR(16) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_colors (
  product_id  INT NOT NULL,
  color_id    INT NOT NULL,
  -- Optional photograph of this product in this colour; falls back to the
  -- product's main gallery image when absent.
  image_url   TEXT,
  price_delta DOUBLE NOT NULL DEFAULT 0,
  is_default  TINYINT(1) NOT NULL DEFAULT 0,
  sort_order  INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, color_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_product_colors ON product_colors(product_id, sort_order);

CREATE TABLE IF NOT EXISTS product_relations (
  product_id INT NOT NULL,
  related_id INT NOT NULL,
  PRIMARY KEY (product_id, related_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (related_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_tags (
  product_id INT NOT NULL,
  tag        VARCHAR(255) NOT NULL,
  PRIMARY KEY (product_id, tag),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Commerce ---------------------------------------

CREATE TABLE IF NOT EXISTS orders (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  order_number   VARCHAR(64) NOT NULL UNIQUE,
  user_id        INT,
  customer_name  VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(32),
  shipping_address TEXT,
  subtotal       DOUBLE NOT NULL DEFAULT 0,
  discount       DOUBLE NOT NULL DEFAULT 0,
  tax            DOUBLE NOT NULL DEFAULT 0,
  shipping       DOUBLE NOT NULL DEFAULT 0,
  total          DOUBLE NOT NULL DEFAULT 0,
  coupon_code    VARCHAR(64),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','printing','post_processing','shipped','completed','cancelled','refunded')),
  payment_status VARCHAR(16) NOT NULL DEFAULT 'unpaid'
                 CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  payment_method VARCHAR(32),
  notes          TEXT,

  placed_via     VARCHAR(32) NOT NULL DEFAULT 'website',
  gift_wrap        TINYINT(1) NOT NULL DEFAULT 0,
  gift_wrap_fee    DOUBLE NOT NULL DEFAULT 0,
  gift_note        TEXT,
  delivery_lat     DOUBLE,
  delivery_lng     DOUBLE,
  delivery_landmark TEXT,
  shipping_method  VARCHAR(32) NOT NULL DEFAULT 'standard',

  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_orders_status ON orders(status, created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT NOT NULL,
  product_id   INT,
  product_name VARCHAR(255) NOT NULL,
  sku          VARCHAR(64),
  quantity     INT NOT NULL DEFAULT 1,
  unit_price   DOUBLE NOT NULL DEFAULT 0,
  total        DOUBLE NOT NULL DEFAULT 0,
  color_name   VARCHAR(255),
  color_hex    VARCHAR(16),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coupons (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  code          VARCHAR(64) NOT NULL UNIQUE,
  description   TEXT,
  type          VARCHAR(16) NOT NULL DEFAULT 'percent' CHECK (type IN ('percent','fixed')),
  value         DOUBLE NOT NULL DEFAULT 0,
  min_order     DOUBLE NOT NULL DEFAULT 0,
  max_discount  DOUBLE,
  usage_limit   INT,
  used_count    INT NOT NULL DEFAULT 0,
  starts_at     DATETIME,
  expires_at    DATETIME,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Content ----------------------------------------

CREATE TABLE IF NOT EXISTS banners (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  video_url   TEXT,
  cta_label   VARCHAR(255),
  cta_href    TEXT,
  placement   VARCHAR(32) NOT NULL DEFAULT 'home_hero',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  starts_at   DATETIME,
  ends_at     DATETIME,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blogs (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  title           VARCHAR(255) NOT NULL,
  slug            VARCHAR(255) NOT NULL UNIQUE,
  excerpt         TEXT,
  content         LONGTEXT,
  cover_url       TEXT,
  author_id       INT,
  category        VARCHAR(255),
  tags            TEXT,       -- JSON array
  reading_minutes INT NOT NULL DEFAULT 3,
  status          VARCHAR(16) NOT NULL DEFAULT 'published'
                  CHECK (status IN ('draft','published','archived')),
  view_count      INT NOT NULL DEFAULT 0,
  seo_title       VARCHAR(255),
  seo_description TEXT,
  published_at    DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS blog_comments (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  blog_id    INT NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_email VARCHAR(255),
  body       TEXT    NOT NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (blog_id) REFERENCES blogs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS gallery_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255),
  caption     TEXT,
  url         TEXT    NOT NULL,
  thumb_url   TEXT,
  media_type  VARCHAR(20) NOT NULL DEFAULT 'image'
              CHECK (media_type IN ('image','video','360','before_after','customer_photo')),
  before_url  TEXT,
  after_url   TEXT,
  category    VARCHAR(255),
  tags        TEXT,
  width       INT,
  height      INT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS videos (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  youtube_url  TEXT,
  file_url     TEXT,
  thumb_url    TEXT,
  duration_sec INT,
  category     VARCHAR(255),
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS testimonials (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  author_name  VARCHAR(255) NOT NULL,
  author_role  VARCHAR(255),
  company      VARCHAR(255),
  avatar_url   TEXT,
  quote        TEXT    NOT NULL,
  rating       INT NOT NULL DEFAULT 5,
  is_featured  TINYINT(1) NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  product_id  INT NOT NULL,
  user_id     INT,
  author_name VARCHAR(255) NOT NULL,
  rating      INT NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  title       VARCHAR(255),
  body        TEXT,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faqs (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  question   TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  category   VARCHAR(255),
  sort_order INT NOT NULL DEFAULT 0,
  is_active  TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Leads, enquiries & quotes ----------------------

CREATE TABLE IF NOT EXISTS leads (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(255) NOT NULL,
  email      VARCHAR(255),
  phone      VARCHAR(32),
  company    VARCHAR(255),
  subject    VARCHAR(255),
  message    TEXT,
  source     VARCHAR(32) NOT NULL DEFAULT 'contact_form',
  file_url   TEXT,
  status     VARCHAR(16) NOT NULL DEFAULT 'new'
             CHECK (status IN ('new','contacted','qualified','won','lost')),
  assigned_to INT,
  notes      TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_leads_status ON leads(status, created_at);

CREATE TABLE IF NOT EXISTS quotes (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  reference       VARCHAR(64) NOT NULL UNIQUE,
  user_id         INT,
  customer_name   VARCHAR(255),
  customer_email  VARCHAR(255),
  customer_phone  VARCHAR(32),
  file_name       VARCHAR(255),
  file_url        TEXT,
  -- Geometry derived from the uploaded mesh
  volume_cm3      DOUBLE,
  bbox_x_mm       DOUBLE,
  bbox_y_mm       DOUBLE,
  bbox_z_mm       DOUBLE,
  triangle_count  INT,
  surface_area_cm2 DOUBLE,
  -- Chosen print parameters
  material        VARCHAR(255),
  technology      VARCHAR(32),
  layer_height_mm DOUBLE,
  infill_percent  INT,
  quantity        INT NOT NULL DEFAULT 1,
  needs_support   TINYINT(1) NOT NULL DEFAULT 0,
  -- Cost breakdown
  weight_g        DOUBLE,
  print_hours     DOUBLE,
  material_cost   DOUBLE,
  machine_cost    DOUBLE,
  labour_cost     DOUBLE,
  electricity_cost DOUBLE,
  support_cost    DOUBLE,
  profit          DOUBLE,
  gst             DOUBLE,
  delivery        DOUBLE,
  total           DOUBLE,
  status          VARCHAR(16) NOT NULL DEFAULT 'new'
                  CHECK (status IN ('new','reviewed','sent','accepted','rejected')),
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- System -----------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  \`key\`      VARCHAR(255) PRIMARY KEY,
  value      TEXT,
  \`group\`    VARCHAR(64) NOT NULL DEFAULT 'general',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS homepage_sections (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  \`key\`      VARCHAR(255) NOT NULL UNIQUE,
  title      VARCHAR(255) NOT NULL,
  subtitle   TEXT,
  config     TEXT,       -- JSON blob for the section's own settings
  sort_order INT NOT NULL DEFAULT 0,
  is_enabled TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT,
  title      VARCHAR(255) NOT NULL,
  body       TEXT,
  type       VARCHAR(16) NOT NULL DEFAULT 'info'
             CHECK (type IN ('info','success','warning','error','order','lead','quote')),
  href       TEXT,
  is_read    TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS activity_logs (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT,
  actor_name  VARCHAR(255),
  action      VARCHAR(255) NOT NULL,
  entity_type VARCHAR(64),
  entity_id   INT,
  detail      TEXT,
  ip_address  VARCHAR(64),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS page_views (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  path       VARCHAR(512) NOT NULL,
  referrer   TEXT,
  country    VARCHAR(64),
  device     VARCHAR(32),
  session_id VARCHAR(64),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX idx_page_views_created ON page_views(created_at);

CREATE TABLE IF NOT EXISTS media (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  file_name   VARCHAR(255) NOT NULL,
  url         TEXT    NOT NULL,
  mime_type   VARCHAR(128),
  size_bytes  INT,
  width       INT,
  height      INT,
  folder      VARCHAR(64) NOT NULL DEFAULT 'general',
  uploaded_by INT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------- Redesign additions ------------------------------
-- The heart icon on a product card. One row per (customer, product); the
-- unique index is what makes "toggle" idempotent from the API.
-- ---------- Uploaded file contents ---------------------------
-- The bytes of every admin upload, not just a row describing one.
--
-- Uploads used to be written to a directory beside the application. This host
-- erases the application directory on every deploy, so a logo uploaded on
-- Monday was a broken image on Tuesday — the settings row still pointed at a
-- file that no longer existed. The database is the only storage here that
-- outlives a deploy, so the file itself lives in it.
--
-- LONGBLOB, but the upload endpoint caps a file at 5 MB long before this.
CREATE TABLE IF NOT EXISTS upload_files (
  name       VARCHAR(255) PRIMARY KEY,
  mime_type  VARCHAR(128) NOT NULL,
  size_bytes INT NOT NULL,
  bytes      LONGBLOB NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wishlists (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  product_id INT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX idx_wishlists_user_product ON wishlists(user_id, product_id);

`;
