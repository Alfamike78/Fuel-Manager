-- Fuel Manager Database Schema
-- PilotCraft Solutions
-- Phase 1

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL,
  max_tanks INT,                        -- NULL = unlimited
  max_vehicles INT,
  max_users INT,
  can_export_pdf BOOLEAN DEFAULT false,
  can_export_excel BOOLEAN DEFAULT false,
  can_import BOOLEAN DEFAULT false,
  price_monthly DECIMAL(10,2),
  price_yearly DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPANIES
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#1e40af',
  secondary_color VARCHAR(7) DEFAULT '#3b82f6',
  status VARCHAR(20) DEFAULT 'trial',   -- trial, active, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_plan_id ON companies(plan_id);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(20) NOT NULL DEFAULT 'operator',  -- superadmin, admin, operator
  language VARCHAR(5) DEFAULT 'it',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================================
-- BASES
-- ============================================================
CREATE TABLE IF NOT EXISTS bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bases_company_id ON bases(company_id);

-- ============================================================
-- TANKS
-- ============================================================
CREATE TABLE IF NOT EXISTS tanks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  base_id UUID REFERENCES bases(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  tank_type VARCHAR(10) NOT NULL,         -- fixed, mobile
  fuel_type VARCHAR(20) NOT NULL,         -- jet_a1, avgas, diesel, gasoline
  color_code VARCHAR(7) NOT NULL,         -- hex color
  capacity_liters DECIMAL(12,2) NOT NULL,
  current_liters DECIMAL(12,2) DEFAULT 0,
  min_threshold_liters DECIMAL(12,2),
  instructions TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tanks_company_id ON tanks(company_id);
CREATE INDEX IF NOT EXISTS idx_tanks_base_id ON tanks(base_id);
CREATE INDEX IF NOT EXISTS idx_tanks_fuel_type ON tanks(fuel_type);

-- ============================================================
-- AIRCRAFT
-- ============================================================
CREATE TABLE IF NOT EXISTS aircraft (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  registration VARCHAR(50) NOT NULL,      -- matricola
  model VARCHAR(255) NOT NULL,
  fuel_type VARCHAR(20) NOT NULL,         -- jet_a1 or avgas
  total_flight_hours DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aircraft_company_id ON aircraft(company_id);
CREATE INDEX IF NOT EXISTS idx_aircraft_registration ON aircraft(registration);

-- ============================================================
-- GROUND VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS ground_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  plate VARCHAR(50) NOT NULL,             -- targa
  name VARCHAR(255) NOT NULL,
  fuel_type VARCHAR(20) NOT NULL,         -- diesel or gasoline
  total_km DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ground_vehicles_company_id ON ground_vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_ground_vehicles_plate ON ground_vehicles(plate);

-- ============================================================
-- FUELING OPERATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS fueling_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  operation_date TIMESTAMPTZ NOT NULL,
  operator_id UUID REFERENCES users(id),
  source_tank_id UUID REFERENCES tanks(id),       -- NULL if external source
  source_type VARCHAR(20) NOT NULL,               -- tank, external
  external_source_name TEXT,                      -- airport name / station name
  dest_type VARCHAR(20) NOT NULL,                 -- aircraft, ground_vehicle, tank
  dest_aircraft_id UUID REFERENCES aircraft(id),
  dest_vehicle_id UUID REFERENCES ground_vehicles(id),
  dest_tank_id UUID REFERENCES tanks(id),
  fuel_type VARCHAR(20) NOT NULL,
  liters DECIMAL(10,2) NOT NULL,
  meter_reading_before DECIMAL(12,2),
  meter_reading_after DECIMAL(12,2),
  meter_photo_url TEXT,
  signature_url TEXT,
  flight_hours_at_fueling DECIMAL(10,2),          -- for aircraft
  km_at_fueling DECIMAL(12,2),                    -- for ground vehicles
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fueling_operations_company_id ON fueling_operations(company_id);
CREATE INDEX IF NOT EXISTS idx_fueling_operations_operation_date ON fueling_operations(operation_date DESC);
CREATE INDEX IF NOT EXISTS idx_fueling_operations_operator_id ON fueling_operations(operator_id);
CREATE INDEX IF NOT EXISTS idx_fueling_operations_source_tank_id ON fueling_operations(source_tank_id);
CREATE INDEX IF NOT EXISTS idx_fueling_operations_dest_aircraft_id ON fueling_operations(dest_aircraft_id);
CREATE INDEX IF NOT EXISTS idx_fueling_operations_dest_vehicle_id ON fueling_operations(dest_vehicle_id);

-- ============================================================
-- TANK LOADS (rifornimento cisterna da provider)
-- ============================================================
CREATE TABLE IF NOT EXISTS tank_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  tank_id UUID REFERENCES tanks(id),
  load_date TIMESTAMPTZ NOT NULL,
  operator_id UUID REFERENCES users(id),
  provider_name VARCHAR(255),
  liters DECIMAL(10,2) NOT NULL,
  delivery_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tank_loads_company_id ON tank_loads(company_id);
CREATE INDEX IF NOT EXISTS idx_tank_loads_tank_id ON tank_loads(tank_id);
CREATE INDEX IF NOT EXISTS idx_tank_loads_load_date ON tank_loads(load_date DESC);

-- ============================================================
-- QUALITY CHECKS (spurgo/QC)
-- ============================================================
CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  check_date TIMESTAMPTZ NOT NULL,
  operator_id UUID REFERENCES users(id),
  subject_type VARCHAR(20) NOT NULL,              -- tank, aircraft
  tank_id UUID REFERENCES tanks(id),
  aircraft_id UUID REFERENCES aircraft(id),
  liters_drained DECIMAL(10,2) NOT NULL,
  is_compliant BOOLEAN NOT NULL,
  notes TEXT,                                     -- required if not compliant
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quality_checks_company_id ON quality_checks(company_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_check_date ON quality_checks(check_date DESC);
CREATE INDEX IF NOT EXISTS idx_quality_checks_tank_id ON quality_checks(tank_id);
CREATE INDEX IF NOT EXISTS idx_quality_checks_aircraft_id ON quality_checks(aircraft_id);

-- ============================================================
-- INVITATION TOKENS (Phase 5B)
-- ============================================================
CREATE TABLE IF NOT EXISTS invitation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator',
  token VARCHAR(64) UNIQUE NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_company_id ON invitation_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email);

-- ============================================================
-- DEFAULT SUBSCRIPTION PLANS
-- ============================================================
INSERT INTO subscription_plans (name, max_tanks, max_vehicles, max_users, can_export_pdf, can_export_excel, can_import, price_monthly, price_yearly) VALUES
('Trial',      2,    5,    2,  false, false, false,   0.00,    0.00),
('Basic',      5,   20,    5,  true,  false, false,  49.00,  490.00),
('Pro',        NULL, NULL, 20, true,  true,  false, 149.00, 1490.00),
('Enterprise', NULL, NULL, NULL, true, true, true,  399.00, 3990.00)
ON CONFLICT DO NOTHING;
