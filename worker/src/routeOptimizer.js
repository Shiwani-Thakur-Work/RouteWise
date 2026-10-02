/**
 * routeOptimizer.js
 * Given a set of selected stops (one per task), determines the optimal
 * visit order using a nearest-neighbour heuristic along the baseline route.
 *
 * Also handles constraint checking and fallback logic.
 */

/**
 * Order stops by proximity along the route from start to destination.
 * Uses simple distance-based nearest-neighbour from the start point.
 *
 * @param {{lat, lng}} start
 * @param {{lat, lng}} destination
 * @param {Array<{candidate, task, detour_min, route_geometry}>} selectedStops
 * @returns {Array} ordered stops
 */
export function orderStops(start, destination, selectedStops) {
  if (selectedStops.length <= 1) return selectedStops;

  const remaining = [...selectedStops];
  const ordered = [];
  let current = start;

  while (remaining.length > 0) {
    // Find the nearest remaining stop to the current position
    let nearestIdx = 0;
    let nearestDist = haversineKm(current, remaining[0].candidate);

    for (let i = 1; i < remaining.length; i++) {
      const d = haversineKm(current, remaining[i].candidate);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    ordered.push(remaining[nearestIdx]);
    current = remaining[nearestIdx].candidate;
    remaining.splice(nearestIdx, 1);
  }

  return ordered;
}

/**
 * Check whether the ordered stops satisfy the detour constraint.
 * @param {Array} orderedStops
 * @param {number} maxDetour
 * @returns {{ withinConstraint: boolean, totalDetour: number }}
 */
export function checkConstraint(orderedStops, maxDetour) {
  // Sum individual detours as an approximation.
  // Note: actual combined route detour may differ slightly — acceptable for V1.
  const totalDetour = orderedStops.reduce((sum, s) => sum + s.detour_min, 0);
  return {
    withinConstraint: totalDetour <= maxDetour,
    totalDetour
  };
}

/**
 * Haversine distance between two lat/lng points in kilometres.
 */
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c = sinDLat * sinDLat + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}
