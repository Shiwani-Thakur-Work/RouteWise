/**
 * index.js — RouteWise Cloudflare Worker
 *
 * Routes:
 *   POST /api/plan      → Full route planning pipeline
 *   POST /api/feedback  → User thumbs up/down
 *   GET  /api/health    → Health check
 */

import { extractRequirements } from './nlProcessor.js';
import { geocode, searchNearby, sleep } from './placeFinder.js';
import { getRoute, calculateDetour } from './detourCalculator.js';
import { scoreCandidate, selectBest } from './candidateScorer.js';
import { orderStops, checkConstraint } from './routeOptimizer.js';
import { generateExplanation, getCategoryIcon } from './explainer.js';
import { logPlan, logEvent, logFeedback } from './analyticsLogger.js';

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://routewise.pages.dev'
];

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/health' && request.method === 'GET') {
        return json({ status: 'ok', timestamp: Date.now() }, corsHeaders);
      }

      if (url.pathname === '/api/plan' && request.method === 'POST') {
        return await handlePlan(request, env, corsHeaders);
      }

      if (url.pathname === '/api/feedback' && request.method === 'POST') {
        return await handleFeedback(request, env, corsHeaders);
      }

      return json({ error: 'Not found' }, corsHeaders, 404);

    } catch (err) {
      console.error('Unhandled Worker error:', err);
      return json({ error: 'Internal server error', detail: err.message }, corsHeaders, 500);
    }
  }
};

// ─── Route Handlers ────────────────────────────────────────────────────────

async function handlePlan(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, corsHeaders, 400);
  }

  const { input } = body;
  if (!input || typeof input !== 'string' || input.trim().length < 5) {
    return json({ error: 'Please provide a route description in the "input" field.' }, corsHeaders, 400);
  }

  const osrmBaseUrl = env.OSRM_BASE_URL || 'https://router.project-osrm.org';
  const userAgent   = env.NOMINATIM_USER_AGENT || 'RouteWise/0.1';
  const db          = env.DB || null; // Cloudflare D1 binding

  // ── Step 1: Extract requirements from natural language ──────────────────
  let requirements;
  try {
    requirements = await extractRequirements(input, env.GEMINI_API_KEY);
    console.log('Requirements extracted:', JSON.stringify(requirements));
  } catch (err) {
    // If it's a 503 or Gemini API error, bubble it up so the user knows it's an API issue, not a bad prompt
    const userMessage = err.message.includes('503') || err.message.includes('overloaded') 
      ? 'The AI model is currently experiencing high demand. Please try again in a moment.' 
      : 'Could not understand your request. Try: "From Saket to Cyber Hub. Pharmacy, gift, vegetarian dinner. Max 25 min extra."';
      
    return json({
      error: userMessage,
      detail: err.message
    }, corsHeaders, 422);
  }

  const { from, to, tasks, constraints } = requirements;
  const maxDetour = constraints?.max_detour_minutes ?? 60;

  if (!from || !to || !tasks || tasks.length === 0) {
    return json({ error: 'Could not extract start, destination, or tasks from your input.' }, corsHeaders, 422);
  }

  // ── Step 2: Geocode start and destination ───────────────────────────────
  let startCoord, destCoord;
  try {
    startCoord = await geocode(from, userAgent);
    await sleep(1100); // Nominatim: 1 req/s
    destCoord  = await geocode(to, userAgent);
  } catch (err) {
    return json({ error: `Could not locate "${err.message}". Please be more specific.` }, corsHeaders, 422);
  }

  // ── Step 3: Get baseline route ──────────────────────────────────────────
  let baseline;
  try {
    baseline = await getRoute([startCoord, destCoord], osrmBaseUrl);
  } catch (err) {
    return json({ error: 'Could not calculate your base route. Please try again.' }, corsHeaders, 502);
  }

  // ── Step 4: Find candidates + score for each task ───────────────────────
  const midpoint = {
    lat: (startCoord.lat + destCoord.lat) / 2,
    lng: (startCoord.lng + destCoord.lng) / 2
  };

  const selectedStops = [];

  for (const task of tasks) {
    let candidates;
    try {
      candidates = await searchNearby(midpoint.lat, midpoint.lng, task.category, 3000);
    } catch (err) {
      console.error(`Overpass error for ${task.category}:`, err);
      candidates = [];
    }

    if (candidates.length === 0) {
      // Widen search radius to 5km
      try {
        candidates = await searchNearby(midpoint.lat, midpoint.lng, task.category, 5000);
      } catch {
        candidates = [];
      }
    }

    if (candidates.length === 0) {
      selectedStops.push({
        task,
        candidate: null,
        detour_min: 0,
        score: 0,
        route_geometry: null,
        found: false
      });
      continue;
    }

    // Score each candidate
    const scored = [];
    for (const candidate of candidates.slice(0, 5)) { // score top 5
      try {
        const { detour_min, route_geometry } = await calculateDetour(
          startCoord, candidate, destCoord,
          baseline.duration_min, osrmBaseUrl
        );
        const score = scoreCandidate(candidate, task, detour_min, maxDetour);
        scored.push({ candidate, task, detour_min, score, route_geometry });
      } catch {
        // Skip candidates where routing fails
      }
    }

    if (scored.length === 0) {
      selectedStops.push({ task, candidate: null, detour_min: 0, score: 0, found: false });
      continue;
    }

    const best = selectBest(scored);
    selectedStops.push({ ...best, found: true });
  }

  // ── Step 5: Order stops + check constraint ──────────────────────────────
  const foundStops = selectedStops.filter(s => s.found);
  const orderedStops = orderStops(startCoord, destCoord, foundStops);
  const { withinConstraint, totalDetour } = checkConstraint(orderedStops, maxDetour);

  // ── Step 6: Build final route geometry ─────────────────────────────────
  let finalGeometry = baseline.geometry;
  if (orderedStops.length > 0) {
    try {
      const allWaypoints = [startCoord, ...orderedStops.map(s => s.candidate), destCoord];
      const finalRoute = await getRoute(allWaypoints, osrmBaseUrl);
      finalGeometry = finalRoute.geometry;
    } catch {
      // Fall back to baseline geometry
    }
  }

  // ── Step 7: Generate explanation ────────────────────────────────────────
  const explanation = generateExplanation(orderedStops, totalDetour, maxDetour, withinConstraint);

  // ── Step 8: Analytics ───────────────────────────────────────────────────
  const planId = await logPlan(db, {
    fromArea: from,
    toArea: to,
    taskCount: tasks.length,
    stopCount: orderedStops.length,
    totalDetourMin: totalDetour,
    withinConstraint
  });

  await logEvent(db, 'plan_generated', planId, { taskCategories: tasks.map(t => t.category) });

  // ── Step 9: Build response ──────────────────────────────────────────────
  const response = {
    planId,
    requirements: { from, to, tasks, constraints: { max_detour_minutes: maxDetour } },
    route: {
      start: { ...startCoord, displayName: from },
      destination: { ...destCoord, displayName: to },
      stops: orderedStops.map(s => ({
        id: s.candidate.id,
        name: s.candidate.name,
        category: s.task.category,
        icon: getCategoryIcon(s.task.category),
        lat: s.candidate.lat,
        lng: s.candidate.lng,
        detour_min: s.detour_min,
        score: s.score,
        tags: s.candidate.tags
      })),
      notFound: selectedStops.filter(s => !s.found).map(s => s.task.category),
      total_detour_min: totalDetour,
      within_constraint: withinConstraint,
      baseline_duration_min: baseline.duration_min,
      geometry: finalGeometry
    },
    explanation
  };

  return json(response, corsHeaders);
}

async function handleFeedback(request, env, corsHeaders) {
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, corsHeaders, 400); }

  const { planId, rating } = body;
  if (!planId || !['up', 'down'].includes(rating)) {
    return json({ error: 'planId and rating ("up"|"down") required' }, corsHeaders, 400);
  }

  await logFeedback(env.DB || null, planId, rating);
  return json({ ok: true }, corsHeaders);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}
