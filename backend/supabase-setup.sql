-- HomeAssist — Full Setup (Tables + Demo Data)
-- Paste this entire file into Supabase SQL Editor and click Run

-- ─── Tables ────────────────────────────────────────────────────────────────────

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

-- ─── Demo Users ────────────────────────────────────────────────────────────────
-- admin@homeassist.pk    / admin123
-- customer@homeassist.pk / customer123
-- ahmed@example.com      / provider123  (all providers use this password)

INSERT INTO users (name, email, password_hash, phone, location, role) VALUES
  ('Admin User',     'admin@homeassist.pk',    '$2a$10$1rDyUtL/k/lAPMnYWLN9EeDUNePAuJVdT6t/vEwhYZMB02iZDCKC6', '0300-0000000', 'Lahore',    'admin'),
  ('Ali Hassan',     'customer@homeassist.pk', '$2a$10$Jckw3K.3anVC9s.pXYD6KuIcVpE5GC5lPUeb6WqDVhEcez39qoNsO', '0301-1234567', 'Lahore',    'customer'),
  ('Ahmed Plumber',  'ahmed@example.com',      '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0312-3456789', 'Lahore',    'provider'),
  ('Bilal Electric', 'bilal@example.com',      '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0313-4567890', 'Karachi',   'provider'),
  ('Fatima Cleaner', 'fatima@example.com',     '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0321-5678901', 'Islamabad', 'provider'),
  ('Tariq AC',       'tariq@example.com',      '$2a$10$rle6Em19DnodOQZmlQvAJuh0M4OS7BH8NWgD8PADzbU.cleQd8wpq', '0322-6789012', 'Lahore',    'provider')
ON CONFLICT (email) DO NOTHING;

-- ─── Service Categories ─────────────────────────────────────────────────────────

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

-- ─── Provider Profiles ──────────────────────────────────────────────────────────

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

-- ─── Provider Services ──────────────────────────────────────────────────────────

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Tap & Pipe Repair', 1500, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'ahmed@example.com';

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Drain Unclogging', 2000, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'plumbing'
WHERE u.email = 'ahmed@example.com';

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Switchboard Repair', 1200, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'electrical'
WHERE u.email = 'bilal@example.com';

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'Home Deep Cleaning', 3500, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'cleaning'
WHERE u.email = 'fatima@example.com';

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'AC Gas Refill', 4000, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'ac-repair'
WHERE u.email = 'tariq@example.com';

INSERT INTO provider_services (provider_id, category_id, title, price, price_unit)
SELECT p.id, c.id, 'AC Full Service', 2500, 'fixed'
FROM providers p JOIN users u ON p.user_id = u.id
JOIN service_categories c ON c.slug = 'ac-repair'
WHERE u.email = 'tariq@example.com';
