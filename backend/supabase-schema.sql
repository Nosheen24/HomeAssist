-- Run this entire file in the Supabase SQL Editor (https://app.supabase.com → SQL Editor)
-- It creates all tables needed for HomeAssist.

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
  experience_years  INTEGER      NOT NULL DEFAULT 0,
  service_area      VARCHAR(255) NOT NULL DEFAULT '',
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  is_verified       BOOLEAN      NOT NULL DEFAULT FALSE,
  avg_rating        DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count      INTEGER      NOT NULL DEFAULT 0,
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
  provider_id INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES service_categories(id),
  title       VARCHAR(200) NOT NULL,
  price       DOUBLE PRECISION NOT NULL,
  price_unit  VARCHAR(50)  NOT NULL DEFAULT 'fixed'
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id           SERIAL PRIMARY KEY,
  provider_id  INTEGER NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  day_of_week  INTEGER NOT NULL,
  start_time   VARCHAR(10) NOT NULL,
  end_time     VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id                          SERIAL PRIMARY KEY,
  customer_id                 INTEGER NOT NULL REFERENCES users(id),
  provider_id                 INTEGER NOT NULL REFERENCES providers(id),
  service_id                  INTEGER NOT NULL REFERENCES provider_services(id),
  status                      VARCHAR(20)  NOT NULL DEFAULT 'pending',
  scheduled_at                TIMESTAMPTZ  NOT NULL,
  address                     VARCHAR(500) NOT NULL,
  customer_lat                DOUBLE PRECISION,
  customer_lng                DOUBLE PRECISION,
  customer_location_label     VARCHAR(500),
  provider_lat                DOUBLE PRECISION,
  provider_lng                DOUBLE PRECISION,
  provider_location_updated_at TIMESTAMPTZ,
  distance_km                 DOUBLE PRECISION,
  eta_minutes                 INTEGER,
  problem_description         TEXT,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  booking_id  INTEGER UNIQUE NOT NULL REFERENCES bookings(id),
  provider_id INTEGER NOT NULL REFERENCES providers(id),
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
