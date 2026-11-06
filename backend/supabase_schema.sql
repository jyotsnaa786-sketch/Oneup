-- ============================================================================
-- ONEUP MOTORS AUDIT SYSTEM - ENTERPRISE SUPABASE (POSTGRESQL) SCHEMA
-- ============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'auditor', -- 'admin', 'auditor', 'director'
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Audits Table (Repository of Completed Inspected Audits)
CREATE TABLE IF NOT EXISTS audits (
  id TEXT PRIMARY KEY,
  dealership_name TEXT NOT NULL,
  location TEXT NOT NULL,
  auditor_name TEXT NOT NULL,
  audit_date TEXT NOT NULL,
  overall_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'completed',
  general_notes TEXT DEFAULT '',
  categories JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CAPA Action Tasks Table (Defect Remediation & Verification Lifecycle)
CREATE TABLE IF NOT EXISTS capa_tasks (
  id TEXT PRIMARY KEY,
  audit_id TEXT,
  dealership_name TEXT NOT NULL,
  category_name TEXT NOT NULL,
  observation TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'P1', -- 'P0', 'P1', 'P2'
  severity_label TEXT DEFAULT 'Operational',
  owner TEXT NOT NULL DEFAULT 'Service Manager',
  due_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'rectified', 'closed'
  days_overdue INTEGER DEFAULT 0,
  action_remark TEXT DEFAULT '',
  rectification_note TEXT DEFAULT '',
  rectification_evidence JSONB DEFAULT '[]'::JSONB,
  verification_note TEXT DEFAULT '',
  verified_by TEXT,
  closed_at TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Audit Drafts Table (In-Progress Inspections with Auto-Save Guard)
CREATE TABLE IF NOT EXISTS audit_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT 'Auditor',
  meta JSONB NOT NULL DEFAULT '{}'::JSONB,
  state JSONB NOT NULL DEFAULT '{}'::JSONB,
  general TEXT DEFAULT '',
  step INTEGER DEFAULT 0,
  timestamp TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit Templates Table (19 Pillars, 128 Dynamic Checklist Items)
CREATE TABLE IF NOT EXISTS audit_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  weight NUMERIC(4,2) DEFAULT 1.0,
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. System State Document Table (Full Database Snapshot Storage)
CREATE TABLE IF NOT EXISTS system_state (
  key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for high-performance reporting & dashboards
CREATE INDEX IF NOT EXISTS idx_audits_dealership ON audits(dealership_name);
CREATE INDEX IF NOT EXISTS idx_audits_audit_date ON audits(audit_date DESC);
CREATE INDEX IF NOT EXISTS idx_capa_tasks_status ON capa_tasks(status);
CREATE INDEX IF NOT EXISTS idx_capa_tasks_severity ON capa_tasks(severity);
CREATE INDEX IF NOT EXISTS idx_capa_tasks_branch ON capa_tasks(dealership_name);
CREATE INDEX IF NOT EXISTS idx_drafts_user ON audit_drafts(user_id);

-- Enable RLS with Permissive Enterprise Policies
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE capa_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for branches" ON branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for audits" ON audits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for capa_tasks" ON capa_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for audit_drafts" ON audit_drafts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for audit_templates" ON audit_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for system_state" ON system_state FOR ALL USING (true) WITH CHECK (true);
