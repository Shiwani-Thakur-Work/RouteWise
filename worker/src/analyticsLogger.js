/**
 * analyticsLogger.js
 * Writes anonymised analytics events to Cloudflare D1.
 * No PII is stored — locations are area-level only.
 *
 * D1 is optional in local dev (DB may be undefined).
 */

function uuid() {
  return crypto.randomUUID();
}

/**
 * Log a plan_generated event.
 * @param {object} db - Cloudflare D1 binding (may be null in dev)
 * @param {object} plan - { fromArea, toArea, taskCount, stopCount, totalDetourMin, withinConstraint }
 * @returns {Promise<string>} plan ID
 */
export async function logPlan(db, plan) {
  const id = uuid();
  if (!db) return id; // skip in local dev if D1 not configured

  try {
    await db.prepare(
      `INSERT INTO route_plans (id, created_at, from_area, to_area, task_count, stop_count, total_detour_min, within_constraint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      Date.now(),
      plan.fromArea,
      plan.toArea,
      plan.taskCount,
      plan.stopCount,
      plan.totalDetourMin,
      plan.withinConstraint ? 1 : 0
    ).run();
  } catch (e) {
    console.error('D1 logPlan error:', e);
  }

  return id;
}

/**
 * Log a generic analytics event.
 * @param {object} db
 * @param {string} eventType
 * @param {string|null} planId
 * @param {object} metadata
 */
export async function logEvent(db, eventType, planId = null, metadata = {}) {
  if (!db) return;

  try {
    await db.prepare(
      `INSERT INTO events (id, created_at, event_type, plan_id, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      uuid(),
      Date.now(),
      eventType,
      planId,
      JSON.stringify(metadata)
    ).run();
  } catch (e) {
    console.error('D1 logEvent error:', e);
  }
}

/**
 * Log user feedback (thumbs up/down).
 * @param {object} db
 * @param {string} planId
 * @param {'up'|'down'} rating
 */
export async function logFeedback(db, planId, rating) {
  if (!db) return;

  try {
    await db.prepare(
      `INSERT INTO feedback (id, plan_id, created_at, rating) VALUES (?, ?, ?, ?)`
    ).bind(uuid(), planId, Date.now(), rating).run();
  } catch (e) {
    console.error('D1 logFeedback error:', e);
  }
}
