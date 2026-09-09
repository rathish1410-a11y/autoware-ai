/*
# Warehouse Monitoring System — Core Schema

Creates the full data model for the AI-Powered Autonomous Warehouse Monitoring
and Inventory Automation System. Single-tenant simulation environment (no auth).

## Tables created
1. warehouse_zones — grid layout of warehouse areas
2. items — inventory items with SKU, category, current zone, status
3. workers — warehouse workers with current zone and shift
4. events — every item/worker/zone event
5. environment_readings — per-zone temperature/humidity over time
6. anomalies — detected anomalies with severity + human-readable explanation
7. orders — orders with multiple item IDs, status, assigned worker

## Security
- RLS enabled on every table.
- All tables allow full CRUD for anon + authenticated (single-tenant simulation).
- USING (true) is intentional — shared public simulation dataset.
*/

-- 1. Warehouse zones
CREATE TABLE IF NOT EXISTS warehouse_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receiving','storage','picking','packing','dispatch')),
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. Items
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  current_zone_id INTEGER REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock','picked','packed','dispatched','damaged','missing')),
  expected_quantity INTEGER DEFAULT 0,
  scanned_quantity INTEGER DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Workers
CREATE TABLE IF NOT EXISTS workers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  current_zone_id INTEGER REFERENCES warehouse_zones(id) ON DELETE SET NULL,
  shift TEXT NOT NULL DEFAULT 'day' CHECK (shift IN ('day','night')),
  created_at timestamptz DEFAULT now()
);

-- 4. Events
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  zone_id INTEGER REFERENCES warehouse_zones(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('received','moved','picked','packed','dispatched','scanned')),
  quantity INTEGER DEFAULT 1,
  expected_quantity INTEGER,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_item_id ON events(item_id);
CREATE INDEX IF NOT EXISTS idx_events_zone_id ON events(zone_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

-- 5. Environment readings
CREATE TABLE IF NOT EXISTS environment_readings (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER REFERENCES warehouse_zones(id) ON DELETE CASCADE,
  temperature REAL NOT NULL,
  humidity REAL NOT NULL,
  timestamp timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_env_zone_id ON environment_readings(zone_id);
CREATE INDEX IF NOT EXISTS idx_env_timestamp ON environment_readings(timestamp DESC);

-- 6. Anomalies
CREATE TABLE IF NOT EXISTS anomalies (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL CHECK (anomaly_type IN ('misplaced','damaged','duplicate_scan','stuck','quantity_mismatch','unusual_movement','environment')),
  detected_at timestamptz DEFAULT now(),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
  explanation TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_anomalies_detected_at ON anomalies(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_item_id ON anomalies(item_id);

-- 7. Orders
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  item_ids INTEGER[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','assigned','picking','packing','dispatched','completed')),
  assigned_worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
  expected_quantity INTEGER DEFAULT 0,
  scanned_quantity INTEGER DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ============ RLS ============
ALTER TABLE warehouse_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomalies ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- warehouse_zones policies
DROP POLICY IF EXISTS "anon_select_zones" ON warehouse_zones;
CREATE POLICY "anon_select_zones" ON warehouse_zones FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_zones" ON warehouse_zones;
CREATE POLICY "anon_insert_zones" ON warehouse_zones FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_zones" ON warehouse_zones;
CREATE POLICY "anon_update_zones" ON warehouse_zones FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_zones" ON warehouse_zones;
CREATE POLICY "anon_delete_zones" ON warehouse_zones FOR DELETE TO anon, authenticated USING (true);

-- items policies
DROP POLICY IF EXISTS "anon_select_items" ON items;
CREATE POLICY "anon_select_items" ON items FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_items" ON items;
CREATE POLICY "anon_insert_items" ON items FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_items" ON items;
CREATE POLICY "anon_update_items" ON items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_items" ON items;
CREATE POLICY "anon_delete_items" ON items FOR DELETE TO anon, authenticated USING (true);

-- workers policies
DROP POLICY IF EXISTS "anon_select_workers" ON workers;
CREATE POLICY "anon_select_workers" ON workers FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_workers" ON workers;
CREATE POLICY "anon_insert_workers" ON workers FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_workers" ON workers;
CREATE POLICY "anon_update_workers" ON workers FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_workers" ON workers;
CREATE POLICY "anon_delete_workers" ON workers FOR DELETE TO anon, authenticated USING (true);

-- events policies
DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE TO anon, authenticated USING (true);

-- environment_readings policies
DROP POLICY IF EXISTS "anon_select_env" ON environment_readings;
CREATE POLICY "anon_select_env" ON environment_readings FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_env" ON environment_readings;
CREATE POLICY "anon_insert_env" ON environment_readings FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_env" ON environment_readings;
CREATE POLICY "anon_update_env" ON environment_readings FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_env" ON environment_readings;
CREATE POLICY "anon_delete_env" ON environment_readings FOR DELETE TO anon, authenticated USING (true);

-- anomalies policies
DROP POLICY IF EXISTS "anon_select_anomalies" ON anomalies;
CREATE POLICY "anon_select_anomalies" ON anomalies FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_anomalies" ON anomalies;
CREATE POLICY "anon_insert_anomalies" ON anomalies FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_anomalies" ON anomalies;
CREATE POLICY "anon_update_anomalies" ON anomalies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_anomalies" ON anomalies;
CREATE POLICY "anon_delete_anomalies" ON anomalies FOR DELETE TO anon, authenticated USING (true);

-- orders policies
DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_orders" ON orders;
CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_orders" ON orders;
CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon, authenticated USING (true);
