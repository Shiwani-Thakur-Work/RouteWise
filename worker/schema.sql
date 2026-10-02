-- RouteWise D1 Schema
-- No PII stored. Locations at area level only.

CREATE TABLE IF NOT EXISTS route_plans (
  id                TEXT PRIMARY KEY,
  created_at        INTEGER NOT NULL,
  from_area         TEXT,
  to_area           TEXT,
  task_count        INTEGER,
  stop_count        INTEGER,
  total_detour_min  INTEGER,
  within_constraint INTEGER,  -- 1 = yes, 0 = no
  accepted          INTEGER   -- 1 = accepted without edits, 0 = edited, NULL = unknown
);

CREATE TABLE IF NOT EXISTS feedback (
  id         TEXT PRIMARY KEY,
  plan_id    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  rating     TEXT,            -- 'up' | 'down'
  edited     INTEGER          -- 1 = user edited route before rating
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL,
  event_type  TEXT NOT NULL,  -- 'plan_generated' | 'stop_removed' | 'recalculated' | 'feedback'
  plan_id     TEXT,
  metadata    TEXT            -- JSON blob
);

CREATE INDEX IF NOT EXISTS idx_events_plan_id ON events(plan_id);
CREATE INDEX IF NOT EXISTS idx_feedback_plan_id ON feedback(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_created ON route_plans(created_at);
