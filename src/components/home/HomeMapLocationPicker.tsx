import React, { useEffect, useMemo, useState } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { ArrowRight, Crosshair, Loader2, Search, X } from 'lucide-react';
import type { Property } from '../../types';
import { formatGs } from '../../utils/formatters';
import { effectiveOwnerPlan } from '../../data/publicationPlans';
import { useApp } from '../../context/AppContext';
import { estimateCityAt, getBrowserCity, mapCenterForCity, matchCity, normalizedPlace, resolveSearchPlace } from '../../services/locationPreference';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedLocation: string;
  onSelectLocation: (locationName: string, directSearch?: boolean, cityName?: string) => void;
  properties: Property[];
}

const centerOfParaguay: [number, number] = [-23.85, -57.1];

const markerIcon = (price: number, featured: boolean) => {
  const priceLabel = price >= 1000000 ? `${(price / 1000000).toFixed(1)} M` : `${Math.round(price / 1000)} mil`;
  return L.divIcon({
    className: 'nderogara-price-marker',
    html: `<div style="transform:translate(-50%,-50%);background:${featured ? '#bae6fd' : '#0f2746'};color:${featured ? '#082f49' : '#fff'};border:2px solid #fff;border-radius:14px;box-shadow:0 5px 18px #0f172a40;padding:7px 11px;white-space:nowrap;font:700 12px system-ui">Gs. ${priceLabel}</div>`,
    iconSize: [105, 32], iconAnchor: [52, 16],
  });
};

const selectedIcon = L.divIcon({
  className: 'nderogara-selection-marker',
  html: '<div style="width:20px;height:20px;border:5px solid white;background:#0284c7;border-radius:50%;box-shadow:0 0 0 3px #0284c7,0 6px 12px #0003"></div>',
  iconSize: [20, 20], iconAnchor: [10, 10],
});

const MapMove: React.FC<{ point: [number, number]; zoom: number }> = ({ point, zoom }) => {
  const map = useMap();
  useEffect(() => { map.setView(point, zoom, { animate: true }); const id = window.setTimeout(() => map.invalidateSize({pan:false}), 200); return () => clearTimeout(id); }, [map, point, zoom]);
  return null;
};

const MapClick: React.FC<{ onPoint: (lat: number, lng: number) => void }> = ({ onPoint }) => {
  useMapEvents({ click(e) { onPoint(e.latlng.lat, e.latlng.lng); } });
  return null;
};

export const HomeMapLocationPicker: React.FC<Props> = ({ isOpen, onClose, selectedLocation, onSelectLocation, properties }) => {
  const { registeredUsers } = useApp();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [point, setPoint] = useState<[number, number]>(centerOfParaguay);
  const [pin, setPin] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(6);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const active = useMemo(() => properties.filter(p => p.isActive !== false && (!p.moderationStatus || p.moderationStatus === 'approved') && Number.isFinite(p.lat) && Number.isFinite(p.lng)), [properties]);
  const visible = useMemo(() => city ? active.filter(p => normalizedPlace(p.city) === normalizedPlace(city)) : active, [city, active]);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setQuery(selectedLocation || '');
    const location = resolveSearchPlace(selectedLocation, properties);
    if (location.city) {
      const center = mapCenterForCity(location.city, properties);
      if (center) { setPoint(center); setZoom(12); }
      else { setPoint(centerOfParaguay); setZoom(6); }
      setCity(location.city);
    } else {
      setCity('');
      setPoint(centerOfParaguay);
      setZoom(6);
    }
    setPin(null);
  }, [isOpen, selectedLocation, properties]);

  const selectCity = (name: string, lat: number, lng: number) => {
    setCity(name);
    setQuery(name);
    setPoint([lat, lng]);
    setZoom(12);
    setPin(null);
    setError('');
  };

  const lookupMapPlace = async () => {
    if (!query.trim()) {
      setCity('');
      setPin(null);
      setPoint(centerOfParaguay);
      setZoom(6);
      setError('');
      return;
    }
    setError('');
    const matched = resolveSearchPlace(query, properties);
    const found = matched.city;
    const knownCenter = found ? mapCenterForCity(found, properties) : null;
    if (found && knownCenter) {
      selectCity(found, knownCenter[0], knownCenter[1]);
      return;
    }
    setSearching(true);
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 5000);
      let response: Response;
      try { response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=py&limit=1&addressdetails=1&q=${encodeURIComponent(query + ', Paraguay')}`, { signal: controller.signal }); }
      finally { clearTimeout(timer); }
      if (!response.ok) throw new Error('El mapa no pudo consultar esta ubicación.');
      const result = await response.json() as { lat: string; lon: string; address?: Record<string, string> }[];
      if (!result.length) throw new Error('No se encontró esa ubicación en Paraguay. Probá con el nombre de la ciudad.');
      const lat = Number(result[0].lat);
      const lng = Number(result[0].lon);
      const address = result[0].address || {};
      const nearest = estimateCityAt(lat, lng, properties);
      const resultCity = matchCity(address.city || address.town || address.village || address.municipality || '', properties) || nearest;
      if (!resultCity) throw new Error('Se encontró el punto, pero no fue posible identificar una ciudad del catálogo.');
      selectCity(resultCity, lat, lng);
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo buscar la zona.'); }
    finally { setSearching(false); }
  };

  const selectMapPoint = async (lat: number, lng: number) => {
    setPin([lat, lng]);
    setPoint([lat, lng]);
    setZoom(13);
    setError('');
    const local = estimateCityAt(lat, lng, properties);
    if (local) { setCity(local); setQuery(local); }
    else { setCity(''); setQuery(''); setError('No se identificó una ciudad cercana. Buscá el nombre de la ciudad en el campo superior.'); }
    // Refinar solo si existe conectividad, sin cambiar a otra ciudad por error silencioso.
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 3800);
      let response: Response;
      try { response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=1&accept-language=es`, { signal: controller.signal }); }
      finally { clearTimeout(timer); }
      if (response.ok) {
        const info = await response.json() as { address?: Record<string, string> };
        const a = info.address || {};
        if (a.country_code === 'py') {
          const candidate = a.city || a.town || a.village || a.municipality;
          if (candidate) { const corrected = matchCity(candidate, properties) || candidate; setCity(corrected); setQuery(corrected); setError(''); }
        }
      }
    } catch { /* La ubicación aproximada permanece. */ }
  };

  const locate = async () => {
    setError('');
    setSearching(true);
    try {
      const result = await getBrowserCity(properties);
      setPin([result.lat, result.lng]);
      selectCity(result.city, result.lat, result.lng);
      setPin([result.lat, result.lng]);
    } catch (err) { setError(err instanceof Error ? err.message : 'Ubicación no disponible.'); }
    finally { setSearching(false); }
  };

  const apply = (search: boolean) => {
    if (query.trim() && !city) { setError('Primero seleccioná una ciudad desde el mapa o presioná Buscar ubicación.'); return; }
    onSelectLocation(city || '', search, city || undefined);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-2 backdrop-blur-sm sm:p-5" role="dialog" aria-modal="true" aria-label="Explorar propiedades por ubicación">
      <section className="flex h-[min(92vh,850px)] w-full max-w-6xl flex-col overflow-hidden rounded-[26px] bg-white shadow-2xl">
        <header className="flex flex-col gap-4 bg-[#0e213d] px-5 py-5 text-white sm:px-7">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="text-xl font-black">Explorá inmuebles en el mapa</h2><p className="mt-1 text-xs text-slate-300">Buscá una ciudad o seleccioná un punto en el mapa para consultar las propiedades de esa zona.</p></div>
            <button type="button" onClick={onClose} className="rounded-xl bg-white/10 p-2.5 transition hover:bg-white/20" aria-label="Cerrar mapa"><X size={20}/></button>
          </div>
          <form className="flex gap-2" onSubmit={e => { e.preventDefault(); void lookupMapPlace(); }}>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-white px-4 text-slate-900 focus-within:ring-2 focus-within:ring-sky-300">
              <Search size={17} className="shrink-0 text-sky-700"/><input value={query} onChange={e => { setQuery(e.target.value); setCity(''); setError(''); }} autoComplete="off" placeholder="Escribí la ciudad, barrio o dirección" className="h-12 w-full min-w-0 text-sm font-medium outline-none" aria-label="Buscar ciudad o zona"/>
            </div>
            <button type="submit" disabled={searching} className="rounded-xl bg-sky-500 px-5 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-60">{searching ? <Loader2 className="animate-spin" size={18}/> : <><Search className="mr-1 inline" size={16}/> Buscar</>}</button>
          </form>
        </header>
        <div className="relative min-h-[280px] flex-1 bg-slate-100" style={{height:'min(54vh,560px)'}}>
          <MapContainer center={point} zoom={zoom} scrollWheelZoom className="h-full w-full" style={{ width:'100%', height:'100%', minHeight:'280px' }}>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19}/>
            <MapMove point={point} zoom={zoom}/><MapClick onPoint={(lat, lng) => { void selectMapPoint(lat, lng); }}/>
            {visible.map(p => {
              const ownerId = p.ownerId || registeredUsers.find(user => normalizedPlace(user.email) === normalizedPlace(p.ownerEmail))?.id;
              const plan = effectiveOwnerPlan(ownerId);
              const featured = plan?.id === 'premium' || plan?.id === 'professional';
              return <Marker key={p.id} position={[p.lat,p.lng]} icon={markerIcon(p.priceMonth, featured)} eventHandlers={{ click: () => { setCity(p.city); setQuery(p.city); } }}>
                <Popup><div className="w-52"><img src={p.images[0] || '/default-avatar.png'} alt={p.title} className="mb-2 h-24 w-full rounded-lg object-cover"/><strong className="block text-sm">{p.title}</strong><p className="my-1 text-xs text-slate-600">{p.neighborhood}, {p.city}</p><p className="font-black text-sky-700">{formatGs(p.priceMonth)}/mes</p>{featured && <p className="text-xs font-semibold text-sky-700">Destacada</p>}<button className="mt-2 w-full rounded-lg bg-sky-700 p-2 text-xs font-bold text-white" onClick={() => selectCity(p.city, p.lat, p.lng)}>Ver inmuebles en {p.city}</button></div></Popup>
              </Marker>;
            })}
            {pin && <><Marker position={pin} icon={selectedIcon}/><Circle center={pin} radius={200} pathOptions={{ color:'#0284c7', weight:2, fillOpacity:.08 }}/></>}
          </MapContainer>
          <button type="button" onClick={() => void locate()} disabled={searching} className="absolute right-4 top-4 z-[500] flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-sky-800 shadow-lg transition hover:bg-sky-50 disabled:opacity-50"><Crosshair size={17}/>Mi ubicación</button>
        </div>
        <footer className="flex flex-col gap-4 border-t border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Zona de búsqueda</p>
            <h3 className="mt-1 text-lg font-black text-slate-900">{city || 'Todo Paraguay'}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500"><span>{visible.length} {visible.length === 1 ? 'inmueble' : 'inmuebles'} en el mapa</span><span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-sky-200"/>Destacado Premium / Profesional</span></div>
            {error && <p role="alert" className="mt-2 max-w-xl text-xs text-rose-700">{error}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { setCity(''); setQuery(''); setPin(null); setPoint(centerOfParaguay); setZoom(6); setError(''); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Todo Paraguay</button>
            <button type="button" onClick={() => apply(false)} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Aplicar ubicación</button>
            <button type="button" onClick={() => apply(true)} className="flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-800">Ver resultados <ArrowRight size={16}/></button>
          </div>
        </footer>
      </section>
    </div>
  );
};
