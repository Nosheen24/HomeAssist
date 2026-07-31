-- ============================================================================
-- HomeAssist — COMPLETE Supabase Setup (run this ONE file)
-- Paste the whole file into the Supabase SQL Editor and click Run.
-- Safe to run multiple times — it never deletes existing data.
-- Includes: exec_sql function + all tables + payment/escrow system + demo data.
-- ============================================================================

-- ─── Core tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  role            VARCHAR(20)  NOT NULL DEFAULT 'customer',
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  phone           VARCHAR(50),
  location        VARCHAR(100),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS providers (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bio               TEXT,
  experience_years  INTEGER          NOT NULL DEFAULT 0,
  service_area      VARCHAR(255)     NOT NULL DEFAULT '',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  is_verified       BOOLEAN          NOT NULL DEFAULT FALSE,
  avg_rating        DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count      INTEGER          NOT NULL DEFAULT 0,
  profile_photo     TEXT,
  cnic_number       VARCHAR(20),
  cnic_front        TEXT,
  cnic_back         TEXT
);

CREATE TABLE IF NOT EXISTS service_categories (
  id    SERIAL PRIMARY KEY,
  name  VARCHAR(100) UNIQUE NOT NULL,
  icon  VARCHAR(10)  NOT NULL,
  slug  VARCHAR(50)  UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS provider_services (
  id          SERIAL PRIMARY KEY,
  provider_id INTEGER          NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id INTEGER          NOT NULL REFERENCES service_categories(id),
  title       VARCHAR(200)     NOT NULL,
  price       DOUBLE PRECISION NOT NULL,
  price_unit  VARCHAR(50)      NOT NULL DEFAULT 'fixed'
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id           SERIAL PRIMARY KEY,
  provider_id  INTEGER     NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week  INTEGER     NOT NULL,
  start_time   VARCHAR(10) NOT NULL,
  end_time     VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id                           SERIAL PRIMARY KEY,
  customer_id                  INTEGER          NOT NULL REFERENCES users(id),
  provider_id                  INTEGER          NOT NULL REFERENCES providers(id),
  service_id                   INTEGER          NOT NULL REFERENCES provider_services(id),
  status                       VARCHAR(20)      NOT NULL DEFAULT 'pending',
  scheduled_at                 TIMESTAMPTZ      NOT NULL,
  address                      VARCHAR(500)     NOT NULL,
  customer_lat                 DOUBLE PRECISION,
  customer_lng                 DOUBLE PRECISION,
  customer_location_label      VARCHAR(500),
  provider_lat                 DOUBLE PRECISION,
  provider_lng                 DOUBLE PRECISION,
  provider_location_updated_at TIMESTAMPTZ,
  distance_km                  DOUBLE PRECISION,
  eta_minutes                  INTEGER,
  problem_description          TEXT,
  created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER UNIQUE NOT NULL REFERENCES bookings(id),
  provider_id INTEGER        NOT NULL REFERENCES providers(id),
  rating      INTEGER        NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── Booking chat (customer ↔ provider, scoped to one booking) ───────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER     NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   INTEGER     NOT NULL REFERENCES users(id),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);

-- Broadcast new messages over Supabase Realtime. Guarded so re-running is safe:
-- the supabase_realtime publication already exists on Supabase projects, and a
-- table can only be added to it once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;

-- ─── Payment / escrow system ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              SERIAL PRIMARY KEY,
  booking_id      INTEGER          REFERENCES bookings(id),
  customer_id     INTEGER          REFERENCES users(id),
  provider_id     INTEGER          REFERENCES providers(id),
  amount          DOUBLE PRECISION NOT NULL,
  commission      DOUBLE PRECISION NOT NULL,
  provider_payout DOUBLE PRECISION NOT NULL,
  method          VARCHAR(20)      NOT NULL,
  status          VARCHAR(20)      NOT NULL DEFAULT 'held',
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  released_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider_id);
CREATE INDEX IF NOT EXISTS idx_transactions_booking  ON transactions(booking_id);

ALTER TABLE bookings  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20)      NOT NULL DEFAULT 'unpaid';
ALTER TABLE providers ADD COLUMN IF NOT EXISTS wallet_balance DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS total_earned   DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ─── On-demand dispatch: provider online/available flag ──────────────────────────
ALTER TABLE providers ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE;

-- ─── exec_sql RPC (lets the backend run SQL over HTTPS) ──────────────────────────
CREATE OR REPLACE FUNCTION exec_sql(
  sql_text   text,
  sql_params jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result     jsonb;
  final_sql  text := sql_text;
  param_elem jsonb;
  i          int  := 1;
  param_str  text;
  trimmed    text;
BEGIN
  -- btrim with an explicit character set also strips newlines/tabs/CR.
  -- Plain trim() only removes spaces, which misclassifies multi-line queries
  -- (they start with a newline) as non-SELECT and makes them return '[]'.
  trimmed := upper(btrim(final_sql, E' \t\r\n'));
  IF trimmed IN ('BEGIN', 'COMMIT', 'ROLLBACK') THEN
    RETURN '[]'::jsonb;
  END IF;

  FOR param_elem IN SELECT value FROM jsonb_array_elements(sql_params)
  LOOP
    CASE jsonb_typeof(param_elem)
      WHEN 'string'  THEN param_str := quote_literal(param_elem #>> '{}');
      WHEN 'number'  THEN param_str := param_elem #>> '{}';
      WHEN 'boolean' THEN param_str := param_elem #>> '{}';
      WHEN 'null'    THEN param_str := 'NULL';
      WHEN 'array'   THEN
        SELECT 'ARRAY[' || string_agg(quote_literal(v), ',') || ']'
        INTO   param_str
        FROM   jsonb_array_elements_text(param_elem) v;
        param_str := COALESCE(param_str, 'ARRAY[]::text[]');
      ELSE
        param_str := quote_literal(param_elem::text);
    END CASE;

    final_sql := regexp_replace(final_sql, '\$' || i || '(?![0-9])', param_str, 'g');
    i := i + 1;
  END LOOP;

  -- Statements that return rows (SELECT / WITH, or anything with RETURNING) get
  -- their result set aggregated into a JSON array.
  --   * Use \y (Postgres word boundary) — \b means BACKSPACE in Postgres regex,
  --     so '\bRETURNING\b' never matched and INSERT..RETURNING lost its row.
  --   * Wrap in a top-level CTE, NOT a FROM-subquery: a data-modifying RETURNING
  --     statement is illegal inside FROM (...), but legal as a top-level CTE.
  IF trimmed ~ '^(SELECT|WITH)' OR final_sql ~* '\yRETURNING\y' THEN
    EXECUTE format(
      'WITH __exec_rows AS (%s) SELECT COALESCE(jsonb_agg(__exec_rows), ''[]''::jsonb) FROM __exec_rows',
      final_sql
    ) INTO result;
  ELSE
    EXECUTE final_sql;
    result := '[]'::jsonb;
  END IF;

  RETURN COALESCE(result, '[]'::jsonb);
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'exec_sql error: % | query: %', SQLERRM, left(final_sql, 400);
END;
$$;

-- ─── Demo users ─────────────────────────────────────────────────────────────────
-- admin@homeassist.pk / admin123 · customer@homeassist.pk / customer123 · *@example.com / provider123
INSERT INTO users (name, email, password_hash, phone, location, role) VALUES
  ('Admin User',     'admin@homeassist.pk',    '$2a$10$1rDyUtL/k/lAPMnYWLN9EeDUNePAuJVdT6t/vEwhYZMB02iZDCKC6', '0300-0000000', 'Lahore',    'admin'),
  ('Ali Hassan',     'customer@homeassist.pk', '$2a$10$Jckw3K.3anVC9s.pXYD6KuIcVpE5GC5lPUeb6WqDVhEcez39qoNsO', '0301-1234567', 'Lahore',    'customer'),
  ('Ahmed Plumber',  'ahmed@example.com',      '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0312-3456789', 'Lahore',    'provider'),
  ('Bilal Electric', 'bilal@example.com',      '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0313-4567890', 'Karachi',   'provider'),
  ('Fatima Cleaner', 'fatima@example.com',     '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0321-5678901', 'Islamabad', 'provider'),
  ('Tariq AC',       'tariq@example.com',      '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0322-6789012', 'Lahore',    'provider')
ON CONFLICT (email) DO NOTHING;

-- ─── Service categories ─────────────────────────────────────────────────────────
INSERT INTO service_categories (name, icon, slug) VALUES
  ('Plumbing',         '🔧', 'plumbing'),
  ('Electrical',       '⚡', 'electrical'),
  ('Cleaning',         '🧹', 'cleaning'),
  ('AC Repair',        '❄️', 'ac-repair'),
  ('Painting',         '🎨', 'painting'),
  ('Carpentry',        '🪚', 'carpentry'),
  ('Appliance Repair', '🔌', 'appliance-repair'),
  ('Gardening',        '🌿', 'gardening')
ON CONFLICT (slug) DO NOTHING;

-- ─── Provider profiles (idempotent via ON CONFLICT user_id) ──────────────────────
INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, cnic_number)
SELECT id, 'Expert plumber with 8 years of experience in residential and commercial plumbing.',
       8, 'Lahore, Gulberg, DHA', TRUE, 4.8, 24, '35201-1234567-1'
FROM users WHERE email = 'ahmed@example.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, cnic_number)
SELECT id, 'Licensed electrician specializing in wiring, switchboards and appliance installation.',
       6, 'Karachi, Clifton, Defence', TRUE, 4.6, 18, '42101-7654321-2'
FROM users WHERE email = 'bilal@example.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, cnic_number)
SELECT id, 'Professional cleaner for homes and offices. Uses eco-friendly products.',
       4, 'Islamabad, F-6, F-7, G-9', TRUE, 4.9, 31, '61101-2345678-3'
FROM users WHERE email = 'fatima@example.com'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, cnic_number)
SELECT id, 'AC technician for all major brands — installation, gas refill, and repair.',
       10, 'Lahore, Johar Town, Model Town', TRUE, 4.7, 42, '35202-3456789-4'
FROM users WHERE email = 'tariq@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- ─── Provider services (idempotent via NOT EXISTS on title) ──────────────────────
INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Tap & Pipe Repair', 1500, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'ahmed@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Tap & Pipe Repair');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Drain Unclogging', 2000, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'ahmed@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Drain Unclogging');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Switchboard Repair', 1200, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'electrical'
WHERE u.email = 'bilal@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Switchboard Repair');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Home Deep Cleaning', 3500, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'cleaning'
WHERE u.email = 'fatima@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Home Deep Cleaning');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'AC Gas Refill', 4000, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'ac-repair'
WHERE u.email = 'tariq@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'AC Gas Refill');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'AC Full Service', 2500, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'ac-repair'
WHERE u.email = 'tariq@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'AC Full Service');

-- ─── On-demand dispatch seed: give providers GPS coords + add Lahore pros ────────
-- The dispatch matcher ranks providers by distance, so every provider needs lat/lng.
-- This UPDATE is idempotent and also backfills providers seeded before coords existed.
UPDATE providers p SET lat = v.lat, lng = v.lng
FROM (VALUES
  ('ahmed@example.com',  31.5204, 74.3587),  -- Lahore, Gulberg
  ('bilal@example.com',  24.8607, 67.0011),  -- Karachi
  ('fatima@example.com', 33.6844, 73.0479),  -- Islamabad
  ('tariq@example.com',  31.4697, 74.2728)   -- Lahore, Johar Town
) AS v(email, lat, lng)
JOIN users u ON u.email = v.email
WHERE p.user_id = u.id;

-- Extra Lahore providers so "nearest available" is meaningful (multiple per category).
INSERT INTO users (name, email, password_hash, phone, location, role) VALUES
  ('Usman Pipes',     'usman@example.com',  '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0314-1112233', 'Lahore', 'provider'),
  ('Kashif Plumbing', 'kashif@example.com', '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0315-2223344', 'Lahore', 'provider'),
  ('Imran Wires',     'imran@example.com',  '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0316-3334455', 'Lahore', 'provider'),
  ('Sana Sparkle',    'sana@example.com',   '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0317-4445566', 'Lahore', 'provider')
ON CONFLICT (email) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, lat, lng)
SELECT id, 'Fast-response plumber covering central Lahore.', 5, 'Lahore, Garden Town', TRUE, 4.5, 12, 31.4805, 74.3290
FROM users WHERE email = 'usman@example.com' ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, lat, lng)
SELECT id, 'Plumbing and drainage specialist, North Lahore.', 7, 'Lahore, Shadman', TRUE, 4.7, 20, 31.5497, 74.3436
FROM users WHERE email = 'kashif@example.com' ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, lat, lng)
SELECT id, 'Certified electrician for homes and offices in Lahore.', 9, 'Lahore, Gulberg', TRUE, 4.6, 16, 31.5100, 74.3440
FROM users WHERE email = 'imran@example.com' ON CONFLICT (user_id) DO NOTHING;

INSERT INTO providers (user_id, bio, experience_years, service_area, is_verified, avg_rating, review_count, lat, lng)
SELECT id, 'Home deep-cleaning crew serving Lahore.', 3, 'Lahore, Faisal Town', TRUE, 4.8, 27, 31.4920, 74.3000
FROM users WHERE email = 'sana@example.com' ON CONFLICT (user_id) DO NOTHING;

-- A service in the matching category for each new provider (idempotent).
INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Pipe Leak Fix', 1300, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'usman@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Pipe Leak Fix');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Drain Cleaning', 1700, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'kashif@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Drain Cleaning');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Wiring & Switchboard', 1400, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'electrical'
WHERE u.email = 'imran@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Wiring & Switchboard');

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Home Cleaning', 3000, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id JOIN service_categories c ON c.slug = 'cleaning'
WHERE u.email = 'sana@example.com'
AND NOT EXISTS (SELECT 1 FROM provider_services x WHERE x.provider_id = p.id AND x.title = 'Home Cleaning');

-- ─── Sanity check (optional — see your row counts) ───────────────────────────────
SELECT
  (SELECT COUNT(*) FROM users)             AS users,
  (SELECT COUNT(*) FROM providers)         AS providers,
  (SELECT COUNT(*) FROM provider_services) AS services,
  (SELECT COUNT(*) FROM transactions)      AS transactions;
