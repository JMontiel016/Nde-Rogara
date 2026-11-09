import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, ExternalLink, MapPin, RefreshCw, Search } from 'lucide-react';
import { getNearbyPlaces, formatNearbyDistance, nearbyPlaceLink,
  NEARBY_CATEGORY_INFO, type NearbyPlace, type NearbyCategory } from '../../services/nearbyPlaces';

type CategoryFilter = NearbyCategory | 'all';
const order: NearbyCategory[] = ['shopping', 'education', 'health', 'transport', 'food', 'banking', 'recreation'];

/** La ficha y el mapa utilizan la misma fuente OSM. Las referencias manuales no se presentan como verificadas. */
export const NearbyServices: React.FC<{ lat: number; lng: number; manual: string[] }> = ({ lat, lng, manual }) => {
  const [items, setItems] = useState<NearbyPlace[]>([]);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading'); setError(''); setItems([]);
    getNearbyPlaces(lat, lng, controller.signal).then(places => {
      if (!controller.signal.aborted) { setItems(places); setStatus('ready'); }
    }).catch(err => {
      if (!controller.signal.aborted) { setStatus('error'); setError(err instanceof Error ? err.message : 'No se pudieron consultar los servicios.'); }
    });
    return () => controller.abort();
  }, [lat, lng, retry]);

  const filtered = useMemo(() => items.filter(place =>
    (category === 'all' || place.category === category) &&
    `${place.name} ${NEARBY_CATEGORY_INFO[place.category].label}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es')),
  ), [items, category, search]);

  return <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="servicios-cercanos">
    <div><h2 className="text-lg font-black text-slate-900">Servicios cerca del inmueble</h2><p className="mt-1 text-xs text-slate-500">Lugares registrados en OpenStreetMap, a una distancia aproximada del inmueble. No se inventan establecimientos.</p></div>
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5"><Search size={17} className="shrink-0 text-sky-700"/><input className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar supermercado, colegio, hospital…" value={search} onChange={event => setSearch(event.target.value)} aria-label="Buscar servicios cercanos"/></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Tipo de servicio cercano">
      <button type="button" onClick={() => setCategory('all')} aria-pressed={category === 'all'} className={`rounded-xl px-3 py-2 text-xs font-bold ${category === 'all' ? 'bg-sky-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Todos ({items.length})</button>
      {order.map(key => <button type="button" key={key} onClick={() => setCategory(key)} aria-pressed={category === key} className={`rounded-xl px-3 py-2 text-xs font-bold ${category === key ? 'bg-sky-700 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{NEARBY_CATEGORY_INFO[key].icon} {NEARBY_CATEGORY_INFO[key].label}</button>)}
    </div>
    {status === 'loading' && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500" role="status">Consultando establecimientos registrados cerca de esta dirección…</p>}
    {status === 'error' && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span className="flex items-center gap-2"><AlertCircle size={16}/>{error}</span><button type="button" onClick={() => setRetry(value => value + 1)} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-amber-900"><RefreshCw size={14}/>Reintentar</button></div>}
    {status === 'ready' && <>
      <p className="text-xs font-medium text-slate-500">{filtered.length} lugares encontrados{search || category !== 'all' ? ' para este filtro' : ''}</p>
      {filtered.length ? <div className="grid gap-3 sm:grid-cols-2">{filtered.slice(0, 50).map(place => <a key={place.id} href={nearbyPlaceLink(place)} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 p-3 hover:border-sky-200 hover:bg-sky-50/50">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl" style={{ background: NEARBY_CATEGORY_INFO[place.category].background }}>{NEARBY_CATEGORY_INFO[place.category].icon}</span>
        <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-slate-900">{place.name}</strong><span className="block text-xs text-slate-500">{NEARBY_CATEGORY_INFO[place.category].label} · {formatNearbyDistance(place.distanceMeters)} aprox.</span></span>
        <ExternalLink size={16} className="shrink-0 text-sky-700" />
      </a>)}</div> : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No se encontraron establecimientos registrados con esos filtros.</p>}
    </>}
    {manual.length > 0 && <div className="border-t border-slate-200 pt-4"><h3 className="text-sm font-black text-slate-900">Referencias indicadas por el propietario</h3><p className="mt-1 text-xs text-slate-500">Información del anuncio todavía no contrastada con OpenStreetMap.</p><div className="mt-3 flex flex-wrap gap-2">{manual.map((item, index) => <span key={`${index}-${item}`} className="inline-flex max-w-full items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700"><MapPin size={15} className="shrink-0 text-sky-600"/>{item}</span>)}</div></div>}
    <p className="text-[11px] text-slate-500">Las distancias son en línea recta; verificá accesos y recorridos antes de visitar.</p>
  </section>;
};
