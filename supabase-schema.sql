-- LSWA (LeadSync WhatsApp) Database Schema
-- Run this in your Supabase SQL editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------
-- Users  (one per agency owner / LSWA account)
-- ----------------------------------------------------------------
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT UNIQUE NOT NULL,
  ghl_user_id           TEXT UNIQUE,
  ghl_access_token      TEXT,
  ghl_refresh_token     TEXT,
  ghl_token_expires_at  TIMESTAMPTZ,
  stripe_customer_id    TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- GHL Locations (sub-accounts connected under a user)
-- ----------------------------------------------------------------
CREATE TABLE ghl_locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  ghl_location_id  TEXT UNIQUE NOT NULL,
  name             TEXT,
  access_token     TEXT NOT NULL,
  refresh_token    TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ghl_locations_user ON ghl_locations(user_id);
CREATE INDEX idx_ghl_locations_ghl_id ON ghl_locations(ghl_location_id);

-- ----------------------------------------------------------------
-- WhatsApp Sessions (one per connected WhatsApp number)
-- ----------------------------------------------------------------
CREATE TABLE wa_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  UUID REFERENCES ghl_locations(id) ON DELETE CASCADE NOT NULL,
  phone_number TEXT,
  display_name TEXT,
  -- pending | qr_pending | connected | disconnected | banned
  status       TEXT NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wa_sessions_location ON wa_sessions(location_id);

-- ----------------------------------------------------------------
-- Number Mappings  (GHL phone number -> WhatsApp session)
-- When GHL sends FROM a certain number, route via this session
-- ----------------------------------------------------------------
CREATE TABLE wa_number_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID REFERENCES ghl_locations(id) ON DELETE CASCADE NOT NULL,
  session_id  UUID REFERENCES wa_sessions(id) ON DELETE SET NULL,
  ghl_number  TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, ghl_number)
);

CREATE INDEX idx_mappings_location ON wa_number_mappings(location_id);
CREATE INDEX idx_mappings_session  ON wa_number_mappings(session_id);

-- ----------------------------------------------------------------
-- Message Logs
-- ----------------------------------------------------------------
CREATE TABLE message_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id    UUID REFERENCES ghl_locations(id) ON DELETE SET NULL,
  session_id     UUID REFERENCES wa_sessions(id)   ON DELETE SET NULL,
  direction      TEXT NOT NULL,   -- inbound | outbound
  from_number    TEXT,
  to_number      TEXT,
  body           TEXT,
  -- pending | sent | delivered | failed
  status         TEXT DEFAULT 'pending',
  ghl_message_id TEXT,
  wa_message_id  TEXT,
  error          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_location  ON message_logs(location_id);
CREATE INDEX idx_logs_created   ON message_logs(created_at DESC);

-- ----------------------------------------------------------------
-- Subscriptions
-- ----------------------------------------------------------------
CREATE TABLE subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id     TEXT,
  stripe_price_id        TEXT,
  -- starter | growth | agency
  plan                   TEXT NOT NULL DEFAULT 'starter',
  -- trialing | active | past_due | cancelled | incomplete
  status                 TEXT NOT NULL DEFAULT 'trialing',
  trial_ends_at          TIMESTAMPTZ,
  current_period_ends_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- ----------------------------------------------------------------
-- RLS Policies (enable after testing)
-- ----------------------------------------------------------------
-- ALTER TABLE users          ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ghl_locations  ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wa_sessions    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE wa_number_mappings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_logs   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
