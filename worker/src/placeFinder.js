/**
 * placeFinder.js
 * Geospatial provider — currently implemented with Nominatim + OSM Overpass.
 * All methods conform to IGeospatialProvider interface so providers can be
 * swapped without touching business logic.
 *
 * Nominatim policy: max 1 req/s, User-Agent required, attribution required.
 */

/** Map internal category names to OSM amenity/shop tags */
const CATEGORY_TO_OSM = {
  pharmacy:       { key: 'amenity',  value: 'pharmacy' },
  restaurant:     { key: 'amenity',  value: 'restaurant' },
  grocery:        { key: 'shop',     value: 'supermarket' },
  gift_shop:      { key: 'shop',     value: 'gift' },
  coffee:         { key: 'amenity',  value: 'cafe' },
  atm:            { key: 'amenity',  value: 'atm' },
  petrol_station: { key: 'amenity',  value: 'fuel' },
  other:          { key: 'amenity',  value: 'shop' }
};

/**
 * Geocode a place name to lat/lng using Nominatim.
 * @param {string} address
 * @param {string} userAgent
 * @returns {Promise<{lat: number, lng: number, displayName: string}>}
 */
export async function geocode(address, userAgent) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept-Language': 'en'
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
 * Search for places of a given category near a lat/lng point using OSM Overpass.
 * @param {number} lat
 * @param {number} lng
 * @param {string} category - internal category name
 * @param {number} radiusM - search radius in metres
 * @returns {Promise<Array<{id, name, lat, lng, tags}>>}
 */
export async function searchNearby(lat, lng, category, radiusM = 2000) {
  const osmTag = CATEGORY_TO_OSM[category] || CATEGORY_TO_OSM.other;

  const query = `
[out:json][timeout:15];
(
  node["${osmTag.key}"="${osmTag.value}"](around:${radiusM},${lat},${lng});
  way["${osmTag.key}"="${osmTag.value}"](around:${radiusM},${lat},${lng});
);
out center 15;
  `.trim();

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`
  });

  if (!res.ok) throw new Error(`Overpass API error ${res.status}`);

  const data = await res.json();

  return data.elements
    .filter(el => el.tags && el.tags.name) // only named places
    .map(el => ({
      id: String(el.id),
      name: el.tags.name,
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      tags: el.tags
    }))
    .filter(p => p.lat && p.lng)
    .slice(0, 10); // cap at 10 candidates per task
}

/**
 * Sleep helper to respect Nominatim 1 req/s limit
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
