/**
 * detourCalculator.js
 * Uses OSRM to calculate route geometry and detour time for candidate stops.
 *
 * Optimisation: baseline route is calculated once and reused
 * for all candidate comparisons in a single request.
 */

const OSRM_MIRRORS = [
  'https://routing.openstreetmap.de/routed-car',
  'https://router.project-osrm.org'
];

export async function getRoute(waypoints, osrmBaseUrl) {
  const coords = waypoints.map(w => `${w.lng},${w.lat}`).join(';');
  
  // Try the configured URL first, then fallback mirrors
  const urls = [osrmBaseUrl, ...OSRM_MIRRORS.filter(m => m !== osrmBaseUrl)];
  
  let lastError;
  for (const base of urls) {
    const url = `${base}/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 RouteWise/0.1',
          'Referer': 'https://routewise-app.shiwani-thakur-work.workers.dev/',
          'Accept': 'application/json'
        }
      });
      if (!res.ok) {
        lastError = new Error(`OSRM error ${res.status} from ${base}`);
        continue;
      }

      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        lastError = new Error(`OSRM returned no route: ${data.code}`);
        continue;
      }

      return {
        duration_min: Math.round(data.routes[0].duration / 60),
        distance_km: Math.round(data.routes[0].distance / 100) / 10,
        geometry: data.routes[0].geometry
      };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('All OSRM mirrors failed');
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
