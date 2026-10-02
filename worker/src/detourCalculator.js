/**
 * detourCalculator.js
 * Uses OSRM to calculate route geometry and detour time for candidate stops.
 *
 * Optimisation: baseline route is calculated once and reused
 * for all candidate comparisons in a single request.
 */

/**
 * Get a route between an ordered list of waypoints from OSRM.
 * @param {Array<{lat: number, lng: number}>} waypoints
 * @param {string} osrmBaseUrl
 * @returns {Promise<{duration_min: number, geometry: object}>}
 */
export async function getRoute(waypoints, osrmBaseUrl) {
  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
  const url = `${osrmBaseUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM error ${res.status}`);

  const data = await res.json();

  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    throw new Error(`OSRM returned no route: ${data.code}`);
  }

  return {
    duration_min: Math.round(data.routes[0].duration / 60),
    distance_km: Math.round(data.routes[0].distance / 100) / 10,
    geometry: data.routes[0].geometry
  };
}

/**
 * Calculate the detour (in minutes) added by inserting a candidate stop.
 * @param {{lat, lng}} start
 * @param {{lat, lng}} candidate
 * @param {{lat, lng}} destination
 * @param {number} baselineDuration - pre-calculated baseline duration in minutes
 * @param {string} osrmBaseUrl
 * @returns {Promise<{detour_min: number, route_geometry: object}>}
 */
export async function calculateDetour(start, candidate, destination, baselineDuration, osrmBaseUrl) {
  const withStop = await getRoute([start, candidate, destination], osrmBaseUrl);
  return {
    detour_min: Math.max(0, withStop.duration_min - baselineDuration),
    route_geometry: withStop.geometry
  };
}
