/**
 * Consulta puntual de servicios alrededor de un inmueble.
 * Solo utiliza información pública de OpenStreetMap; no registra ubicaciones
 * personales ni consulta el servicio hasta que el visitante selecciona un aviso.
 */
export type NearbyCategory = 'shopping' | 'education' | 'health' | 'transport' | 'food' | 'banking' | 'recreation';

export interface NearbyPlace {
  id: string;
  osmType: 'node' | 'way' | 'relation';
  osmId: number;
  name: string;
  lat: number;
  lng: number;
  category: NearbyCategory;
  distanceMeters: number;
}

export const NEARBY_CATEGORY_INFO: Record<NearbyCategory, { label: string; icon: string; background: string }> = {
  shopping: { label: 'Compras', icon: '🛒', background: '#eff6ff' },
  education: { label: 'Educación', icon: '🎓', background: '#f3e8ff' },
  health: { label: 'Salud', icon: '✚', background: '#fef2f2' },
  transport: { label: 'Transporte', icon: '🚌', background: '#ecfeff' },
  food: { label: 'Gastronomía', icon: '☕', background: '#fff7ed' },
  banking: { label: 'Bancos', icon: '🏦', background: '#f0fdf4' },
  recreation: { label: 'Parques', icon: '🌳', background: '#f0fdf4' },
};

// Dos servidores comunitarios: si uno falla, reintentar sin inventar lugares.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];
export const NEARBY_RADIUS_METERS = 1100;
const CACHE_DURATION = 15 * 60 * 1000;
const cache = new Map<string, { time: number; places: NearbyPlace[] }>();

type OsmElement = {
  type?: string; id?: number; lat?: number; lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function categoryOf(tags: Record<string, string>): NearbyCategory | null {
  if (['school', 'university', 'college', 'kindergarten', 'library'].includes(tags.amenity)) return 'education';
  if (['hospital', 'clinic', 'doctors', 'pharmacy', 'dentist'].includes(tags.amenity) || tags.healthcare) return 'health';
  if (tags.highway === 'bus_stop' || tags.amenity === 'bus_station' || tags.public_transport || tags.railway === 'station') return 'transport';
  if (['supermarket', 'convenience', 'mall', 'department_store', 'bakery'].includes(tags.shop) || tags.amenity === 'marketplace') return 'shopping';
  if (['restaurant', 'cafe', 'fast_food', 'food_court'].includes(tags.amenity)) return 'food';
  if (['bank', 'atm'].includes(tags.amenity)) return 'banking';
  if (['park', 'playground', 'fitness_centre', 'pitch', 'sports_centre'].includes(tags.leisure)) return 'recreation';
  return null;
}

function approximateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Distancia geográfica en línea recta; NO se presenta como tiempo o ruta.
  const rad = Math.PI / 180;
  const deltaLat = (lat2 - lat1) * rad;
  const deltaLng = (lon2 - lon1) * rad;
  const h = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(deltaLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function formatNearbyDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function nearbyPlaceLink(place: NearbyPlace): string {
  return `https://www.openstreetmap.org/${place.osmType}/${place.osmId}`;
}

function parsePlaces(elements: OsmElement[], lat: number, lng: number): NearbyPlace[] {
  const seen = new Set<string>();
  const items: NearbyPlace[] = [];
  for (const item of elements) {
    if (!['node', 'way', 'relation'].includes(item.type || '') || !Number.isFinite(item.id)) continue;
    const tags = item.tags || {};
    const category = categoryOf(tags);
    const coordLat = item.lat ?? item.center?.lat;
    const coordLng = item.lon ?? item.center?.lon;
    if (!category || !Number.isFinite(coordLat) || !Number.isFinite(coordLng)) continue;
    const itemLat = coordLat as number;
    const itemLng = coordLng as number;
    const distanceMeters = approximateDistance(lat, lng, itemLat, itemLng);
    if (distanceMeters > NEARBY_RADIUS_METERS) continue;
    const name = (tags['name:es'] || tags.name || (category === 'transport' ? 'Parada de colectivo' : NEARBY_CATEGORY_INFO[category].label)).trim().slice(0, 100);
    const dedupe = `${name.toLowerCase()}-${Math.round(itemLat * 10000)}-${Math.round(itemLng * 10000)}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    items.push({ id: `${item.type}-${item.id}`, osmType: item.type as NearbyPlace['osmType'], osmId: item.id as number, lat: itemLat, lng: itemLng, name, category, distanceMeters });
  }
  return items.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, 100);
}

export async function getNearbyPlaces(lat: number, lng: number, signal?: AbortSignal): Promise<NearbyPlace[]> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new Error('El inmueble no tiene coordenadas válidas.');
  }
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < CACHE_DURATION) return cached.places;

  // Consultas limitadas a 1,1 km: no ejecutar búsquedas masivas en un servicio público compartido.
  const around = `(around:${NEARBY_RADIUS_METERS},${lat.toFixed(6)},${lng.toFixed(6)})`;
  const query = `[out:json][timeout:15];(
    nwr${around}["amenity"~"^(school|university|college|kindergarten|library|hospital|clinic|doctors|pharmacy|dentist|bus_station|restaurant|cafe|fast_food|food_court|bank|atm|marketplace)$"];
    nwr${around}["shop"~"^(supermarket|convenience|mall|department_store|bakery)$"];
    nwr${around}["highway"="bus_stop"];
    nwr${around}["public_transport"="platform"];
    nwr${around}["railway"="station"];
    nwr${around}["leisure"~"^(park|playground|fitness_centre|pitch|sports_centre)$"];
  );out center;`;
  let data: unknown = null;
  let lastError: unknown = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (signal?.aborted) throw new DOMException('Operación cancelada', 'AbortError');
    try {
      // Cada proveedor tiene tiempo límite, para evitar una pantalla eternamente en espera.
      const response = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }), signal: AbortSignal.any ? AbortSignal.any([signal || new AbortController().signal, AbortSignal.timeout(18000)]) : signal });
      if (!response.ok) throw new Error(`Servicio de mapas temporalmente ocupado (${response.status}).`);
      data = await response.json();
      break;
    } catch (error) {
      if (signal?.aborted) throw error;
      lastError = error;
    }
  }
  if (!data) throw lastError instanceof Error ? lastError : new Error('No se pudo consultar los establecimientos cercanos.');
  if (!data || typeof data !== 'object' || !('elements' in data) || !Array.isArray(data.elements)) {
    throw new Error('La respuesta de lugares cercanos no tiene el formato esperado.');
  }
  const places = parsePlaces(data.elements as OsmElement[], lat, lng);
  cache.set(key, { time: Date.now(), places });
  return places;
}
