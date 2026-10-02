/**
 * placeFinder.js
 * Geospatial provider — Nominatim for geocoding + place search.
 * Overpass API is blocked from Cloudflare Worker IPs, so we use
 * Nominatim's structured search for nearby place discovery.
 *
 * Nominatim policy: max 1 req/s, User-Agent required, attribution required.
 */

/** Map internal category names to Nominatim amenity/shop query params */
const CATEGORY_TO_NOMINATIM = {
  pharmacy:       { amenity: 'pharmacy' },
  restaurant:     { amenity: 'restaurant' },
  grocery:        { shop: 'supermarket' },
  gift_shop:      { shop: 'gift' },
  coffee:         { amenity: 'cafe' },
  atm:            { amenity: 'atm' },
  petrol_station: { amenity: 'fuel' },
  other:          { amenity: 'shop' }
};

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

/**
 * Geocode a place name to lat/lng using Nominatim.
 * @param {string} address
 * @param {string} userAgent
 * @returns {Promise<{lat: number, lng: number, displayName: string}>}
 */
export async function geocode(address, userAgent) {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Language': 'en',
      'Accept': 'application/json'
    }
  });

  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);

  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error(`Could not geocode: "${address}"`);
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    displayName: data[0].display_name
  };
}

/**
 * Search for places of a given category near a lat/lng point using Nominatim.
 * Uses a viewbox bounding box around the point for spatial filtering.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} category - internal category name
 * @param {number} radiusM - search radius in metres (used to compute viewbox)
 * @param {string} userAgent
 * @returns {Promise<Array<{id, name, lat, lng, tags}>>}
 */
export async function searchNearby(lat, lng, category, radiusM = 3000, userAgent = 'RouteWise/0.1') {
  const tagMap = CATEGORY_TO_NOMINATIM[category] || CATEGORY_TO_NOMINATIM.other;
  const tagKey = Object.keys(tagMap)[0];   // 'amenity' or 'shop'
  const tagVal = tagMap[tagKey];

  // Convert radius to rough degree offset (1 deg lat ≈ 111km)
  const degOffset = radiusM / 111000;
  const viewbox = `${lng - degOffset},${lat + degOffset},${lng + degOffset},${lat - degOffset}`;

  // Nominatim structured query for amenity/shop type
  const params = new URLSearchParams({
    format: 'json',
    limit: '15',
    addressdetails: '0',
    extratags: '1',
    viewbox,
    bounded: '1',
    [tagKey]: tagVal
  });

  const url = `${NOMINATIM_BASE}/search?${params}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Language': 'en',
      'Accept': 'application/json'
    }
  });

  if (!res.ok) throw new Error(`Nominatim search error ${res.status}`);

  const data = await res.json();

  return data
    .filter(el => el.display_name) // has a name
    .map(el => ({
      id: String(el.place_id),
      name: el.name || el.display_name.split(',')[0],
      lat: parseFloat(el.lat),
      lng: parseFloat(el.lon),
      tags: { [tagKey]: tagVal, ...el.extratags }
    }))
    .filter(p => p.lat && p.lng)
    .slice(0, 10);
}

/**
 * Sleep helper to respect Nominatim 1 req/s limit
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
