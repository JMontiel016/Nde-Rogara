/** Preferencia de ciudad del visitante, no se almacenan coordenadas GPS. */
import { useEffect, useState } from 'react';
import { PARAGUAY_ZONES } from '../data/paraguayLocations';
import { PARAGUAY_CITIES_LIST } from '../utils/formatters';
import type { Property } from '../types';

type Source = 'gps' | 'manual';
export interface CityPreference { city: string; source: Source }
const KEY = 'nderogara_city_preference_v2';
const CHANGED = 'nderogara-city-preference-changed';

export const normalizedPlace = (value: string) => value.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');

export function getCityPreference(): CityPreference | null {
  try {
    const result = JSON.parse(sessionStorage.getItem(KEY) || 'null') as CityPreference | null;
    return result && typeof result.city === 'string' && result.city.trim() && (result.source === 'gps' || result.source === 'manual') ? result : null;
  } catch { return null; }
}

export function setCityPreference(city: string | null, source: Source = 'manual') {
  if (city?.trim()) sessionStorage.setItem(KEY, JSON.stringify({ city: city.trim(), source }));
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event(CHANGED));
}

export function useCityPreference() {
  const [preference, setPreference] = useState<CityPreference | null>(getCityPreference);
  useEffect(() => {
    const callback = () => setPreference(getCityPreference());
    window.addEventListener(CHANGED, callback);
    return () => window.removeEventListener(CHANGED, callback);
  }, []);
  return preference;
}

const OTHER_CITIES = [
  { city: 'Ciudad del Este', lat: -25.5097, lng: -54.6111 },
  { city: 'Encarnación', lat: -27.3306, lng: -55.8667 },
  { city: 'Pedro Juan Caballero', lat: -22.5472, lng: -55.7333 },
  { city: 'Concepción', lat: -23.4064, lng: -57.4344 },
  { city: 'Coronel Oviedo', lat: -25.4444, lng: -56.4403 },
  { city: 'Caaguazú', lat: -25.4658, lng: -56.0131 },
  { city: 'Villarrica', lat: -25.7496, lng: -56.4352 },
];

/**
 * Autocompletado local: se sugieren exclusivamente ciudades del catálogo paraguayo.
 * No depende de una API de terceros ni incorpora ubicaciones arbitrarias del usuario.
 */
const KNOWN_PARAGUAY_CITIES = Array.from(new Set([
  ...PARAGUAY_ZONES.filter(zone => zone.type === 'ciudad').map(zone => zone.city),
  ...OTHER_CITIES.map(option => option.city),
  ...PARAGUAY_CITIES_LIST.map(option => option.replace(/\s*\([^)]*\)\s*$/, '').trim()),
])).filter(Boolean).sort((left, right) => left.localeCompare(right, 'es'));

export function suggestParaguayCities(text: string, limit = 8): string[] {
  const query = normalizedPlace(text);
  if (!query) return [];
  return KNOWN_PARAGUAY_CITIES
    .filter(city => normalizedPlace(city).includes(query))
    .sort((left, right) => {
      const leftStarts = normalizedPlace(left).startsWith(query) ? 0 : 1;
      const rightStarts = normalizedPlace(right).startsWith(query) ? 0 : 1;
      return leftStarts - rightStarts || left.localeCompare(right, 'es');
    })
    .slice(0, Math.max(1, limit));
}

function distanceKm(lat: number, lon: number, lat2: number, lon2: number) {
  const toRadians = (v: number) => v * Math.PI / 180;
  const dlat = toRadians(lat2 - lat);
  const dlon = toRadians(lon2 - lon);
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(toRadians(lat)) * Math.cos(toRadians(lat2)) * Math.sin(dlon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function approximateCity(lat: number, lng: number, properties: Property[]): string | null {
  const known = [...PARAGUAY_ZONES.filter(z => z.type === 'ciudad').map(z => ({ city: z.city, lat: z.lat, lng: z.lng })), ...OTHER_CITIES];
  const options = [
    ...known,
    ...properties.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng) && !known.some(k => normalizedPlace(k.city) === normalizedPlace(p.city))).map(p => ({ city: p.city, lat: p.lat, lng: p.lng })),
  ];
  const ranked = options.map(option => ({ ...option, distance: distanceKm(lat, lng, option.lat, option.lng) })).sort((a, b) => a.distance - b.distance);
  // Un punto lejano a ciudades conocidas no se asigna falsamente a Asunción.
  return ranked[0] && ranked[0].distance <= 24 ? ranked[0].city : null;
}

export function matchCity(name: string, _properties: Property[]): string | null {
  const normalized = normalizedPlace(name);
  if (!normalized) return null;
  const cities = KNOWN_PARAGUAY_CITIES;
  return cities.find(city => normalizedPlace(city) === normalized) || null;
}

export function resolveSearchPlace(text: string, properties: Property[]): { city: string; neighborhood: string; query: string } {
  const cleaned = text.trim();
  if (!cleaned) return { city: '', neighborhood: '', query: '' };
  const city = matchCity(cleaned, properties);
  if (city) return { city, neighborhood: '', query: '' };
  const zone = PARAGUAY_ZONES.find(z => normalizedPlace(z.name) === normalizedPlace(cleaned));
  if (zone) return { city: zone.city, neighborhood: zone.type === 'barrio' ? zone.name : '', query: '' };
  const parts = cleaned.split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length > 1) {
    const cityFromEnd = matchCity(parts[parts.length - 1], properties);
    if (cityFromEnd) return { city: cityFromEnd, neighborhood: parts[0], query: '' };
  }
  return { city: '', neighborhood: '', query: cleaned };
}

export async function getBrowserCity(properties: Property[]): Promise<{ city: string; lat: number; lng: number }> {
  if (!('geolocation' in navigator)) throw new Error('Tu navegador no admite ubicación GPS. Podés buscar una ciudad manualmente.');
  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60 * 1000 });
  }).catch(() => { throw new Error('No se pudo obtener tu ubicación. Revisá el permiso del navegador o buscá la ciudad manualmente.'); });
  const { latitude: lat, longitude: lng } = position.coords;
  const fallback = approximateCity(lat, lng, properties);
  let city = fallback;
  // Geocodificación inversa solo tras autorización del visitante, sin almacenar coordenadas.
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4200);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1&accept-language=es`, { signal: controller.signal });
      if (response.ok) {
        const result = await response.json() as { address?: Record<string, string> };
        const address = result.address || {};
        if (address.country_code?.toLowerCase() === 'py' || (!address.country_code && fallback)) {
          const cityName = address.city || address.town || address.village || address.municipality;
          if (cityName) city = matchCity(cityName, properties) || cityName;
        }
      }
    } finally { clearTimeout(timer); }
  } catch { /* No se inventa una ciudad si el servicio no responde. */ }
  if (!city) throw new Error('No se identificó tu ciudad. Seleccionala en el mapa o escribila en el buscador.');
  return { city, lat, lng };
}

export async function detectAllowedLocation(properties: Property[]) {
  if (!navigator.permissions?.query) return;
  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' });
    if (permission.state === 'granted' && !getCityPreference()) {
      const place = await getBrowserCity(properties);
      setCityPreference(place.city, 'gps');
    }
  } catch { /* No solicitar permiso automáticamente. */ }
}

export function isFeaturedProperty(property: Property, planId?: string | null) {
  return property.isActive !== false && (!property.moderationStatus || property.moderationStatus === 'approved') && (planId === 'premium' || planId === 'professional');
}

/** Resolución aproximada solo para mostrar contexto en mapa; no sustituye geocodificación oficial. */
export function estimateCityAt(lat: number, lng: number, properties: Property[]) {
  return approximateCity(lat, lng, properties);
}

export function mapCenterForCity(city: string, properties: Property[]): [number, number] | null {
  const zone = PARAGUAY_ZONES.find(z => z.type === 'ciudad' && normalizedPlace(z.city) === normalizedPlace(city));
  const point = zone || OTHER_CITIES.find(z => normalizedPlace(z.city) === normalizedPlace(city)) || properties.find(p => normalizedPlace(p.city) === normalizedPlace(city) && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  return point ? [point.lat, point.lng] : null;
}
