/**
 * Mapa del catálogo y de cada inmueble.
 * - Los anuncios se obtienen del mismo catálogo filtrado que la lista.
 * - Los comercios/servicios se consultan sólo al seleccionar un inmueble.
 * - La pantalla ampliada permanece dentro de Nde Rogarã; no abre otra pestaña.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { ArrowUpRight, Compass, Expand, ExternalLink, Layers, MapPin, RefreshCw, Search, X } from 'lucide-react';
import type { Property } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatGs } from '../../utils/formatters';
import { canFeatureProperty, isPropertyPublic } from '../../data/publicationPlans';
import { matchCity, mapCenterForCity, normalizedPlace, setCityPreference, suggestParaguayCities } from '../../services/locationPreference';
import {
  formatNearbyDistance,
  getNearbyPlaces,
  nearbyPlaceLink,
  NEARBY_CATEGORY_INFO,
  NEARBY_RADIUS_METERS,
  type NearbyCategory,
  type NearbyPlace,
} from '../../services/nearbyPlaces';

interface PropertyMapProps {
  properties: Property[];
  height?: string;
  center?: [number, number];
  zoom?: number;
  expandRequest?: number;
  onSearchApplied?: () => void;
  focusPropertyId?: string | null;
  focusPropertyToken?: number;
  /** Permite ver la ubicación de un aviso pendiente al propio dueño o administrador. */
  showUnpublished?: boolean;
}

type CategoryFilter = 'all' | NearbyCategory;
const categories: NearbyCategory[] = ['shopping', 'education', 'health', 'transport', 'food', 'banking', 'recreation'];

const pinCache = new Map<string, L.DivIcon>();
function propertyPin(price: number, featured: boolean): L.DivIcon {
  const priceLabel = `Gs. ${Math.round(price).toLocaleString('es-PY')}`;
  const key = `${priceLabel}-${featured}`;
  const existing = pinCache.get(key);
  if (existing) return existing;
  // No se inyecta texto arbitrario del propietario en HTML de Leaflet.
  const icon = L.divIcon({
    className: 'nr-property-pin-container',
    html: `<div class="nr-property-pin${featured ? ' nr-property-pin--featured' : ''}"><span class="nr-property-pin__dot"></span>${priceLabel}</div>`,
    iconSize: [142, 40],
    iconAnchor: [71, 20],
  });
  pinCache.set(key, icon);
  return icon;
}

const placeIconCache = new Map<NearbyCategory, L.DivIcon>();
function placePin(category: NearbyCategory): L.DivIcon {
  const existing = placeIconCache.get(category);
  if (existing) return existing;
  const config = NEARBY_CATEGORY_INFO[category];
  const icon = L.divIcon({
    className: 'nr-service-pin-container',
    html: `<div class="nr-service-pin" style="background:${config.background}">${config.icon}</div>`,
    iconSize: [29, 29],
    iconAnchor: [14, 14],
  });
  placeIconCache.set(category, icon);
  return icon;
}

const validCoordinates = (property: Property) => Number.isFinite(property.lat) && Number.isFinite(property.lng);

/** El mapa sólo se reajusta cuando cambian los resultados o el inmueble elegido. */
const MapViewport: React.FC<{
  properties: Property[];
  selected: Property | null;
  fallback: [number, number];
  defaultZoom: number;
  expanded: boolean;
  fitRequest: number;
  focusedPlace: NearbyPlace | null;
}> = ({ properties, selected, fallback, defaultZoom, expanded, fitRequest, focusedPlace }) => {
  const map = useMap();
  const coordinateKey = properties.map((p) => `${p.id}:${p.lat.toFixed(4)}:${p.lng.toFixed(4)}`).join('|');

  useEffect(() => {
    const handle = window.setTimeout(() => map.invalidateSize({ animate: false }), 180);
    return () => window.clearTimeout(handle);
  }, [map, expanded]);

  useEffect(() => {
    if (selected && validCoordinates(selected)) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 15), { duration: 0.55 });
      return;
    }
    const visible = properties.filter(validCoordinates);
    if (visible.length > 1) {
      map.fitBounds(L.latLngBounds(visible.map((p) => [p.lat, p.lng] as [number, number])), {
        padding: [54, 54],
        maxZoom: 14,
        animate: false,
      });
    } else if (visible.length === 1) {
      map.setView([visible[0].lat, visible[0].lng], defaultZoom, { animate: false });
    } else {
      map.setView(fallback, defaultZoom, { animate: false });
    }
  }, [map, coordinateKey, selected?.id, fitRequest, defaultZoom, fallback[0], fallback[1]]);
  // El listado de servicios y los iconos del mapa usan el mismo lugar seleccionado.
  useEffect(() => {
    if (focusedPlace) map.flyTo([focusedPlace.lat, focusedPlace.lng], Math.max(map.getZoom(), 16), { duration: 0.4 });
  }, [map, focusedPlace?.id]);
  return null;
};

export const PropertyMap: React.FC<PropertyMapProps> = ({
  properties,
  height = '480px',
  center = [-25.3006, -57.5600],
  zoom = 12,
  expandRequest = 0,
  onSearchApplied,
  focusPropertyId,
  focusPropertyToken = 0,
  showUnpublished = false,
}) => {
  const { openPropertyDetail, registeredUsers, properties: allProperties, filters, resetFilters, setFilters, setCurrentView } = useApp();
  const safeProperties = useMemo(() => properties.filter((property) => validCoordinates(property) && (showUnpublished || isPropertyPublic(property))), [properties, showUnpublished]);
  const [selectedId, setSelectedId] = useState<string | null>(() => safeProperties.length === 1 ? safeProperties[0].id : null);
  const [satellite, setSatellite] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [cityDraft, setCityDraft] = useState(filters.city || '');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [highlightedCity, setHighlightedCity] = useState(0);
  const [searchError, setSearchError] = useState('');
  const [fitRequest, setFitRequest] = useState(0);
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [serviceQuery, setServiceQuery] = useState('');
  const [focusedPlace, setFocusedPlace] = useState<NearbyPlace | null>(null);
  const [nearby, setNearby] = useState<NearbyPlace[]>([]);
  const [nearbyStatus, setNearbyStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [nearbyError, setNearbyError] = useState('');
  const [retry, setRetry] = useState(0);

  // La ficha abre directamente los servicios de su inmueble, aun cuando los
  // datos hayan llegado después del montaje del mapa (carga asíncrona).
  useEffect(() => {
    if (showUnpublished && safeProperties.length === 1 && !selectedId) {
      setSelectedId(safeProperties[0].id);
    }
  }, [showUnpublished, safeProperties, selectedId]);

  // El botón «Ver en mapa» del listado señala el mismo inmueble que figura en el catálogo.
  useEffect(() => {
    if (!focusPropertyId || !safeProperties.some(property => property.id === focusPropertyId)) return;
    setSelectedId(focusPropertyId);
    setCategory('all');
    setServiceQuery('');
    setFocusedPlace(null);
    window.requestAnimationFrame(() => document.getElementById('nr-map-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [focusPropertyId, focusPropertyToken]);

  // La ampliación también se abre desde el botón del listado: nunca se oculta el mapa.
  useEffect(() => {
    if (expandRequest > 0) {
      setCityDraft(filters.city || '');
      setSearchError('');
      setExpanded(true);
    }
  }, [expandRequest]);

  // Una búsqueda desde la portada, filtros o mapa mantiene la ciudad sincronizada.
  useEffect(() => { setCityDraft(filters.city || ''); }, [filters.city]);

  const closeExpanded = () => {
    setExpanded(false);
    setSearchError('');
  };

  const suggestions = useMemo(() => suggestParaguayCities(cityDraft), [cityDraft]);
  const cityCenter = filters.city ? mapCenterForCity(filters.city, allProperties) : null;
  const mapFallback = cityCenter || center;

  /** Los filtros del catálogo gobiernan exactamente las mismas publicaciones del mapa. */
  const applyCitySearch = (text: string) => {
    const requested = text.trim();
    const city = requested ? matchCity(requested, allProperties) : '';
    if (requested && !city) {
      setSearchError('Seleccioná una ciudad del Paraguay de las sugerencias.');
      return;
    }
    setCityDraft(city || '');
    setSuggestionsOpen(false);
    setSearchError('');
    chooseProperty(null);
    // Se conservan los filtros útiles, pero se retiran barrio y texto de una ciudad anterior.
    if (!city) resetFilters();
    else setFilters(previous => ({ ...previous, city, neighborhood: '', query: '' }));
    setCityPreference(city || null);
    setExpanded(false);
    if (onSearchApplied) onSearchApplied();
    else setCurrentView('search');
  };

  const submitCity = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    applyCitySearch(cityDraft);
  };

  const selected = safeProperties.find((property) => property.id === selectedId) || null;
  const featuredIds = useMemo(() => {
    const ids = new Set<string>();
    for (const property of safeProperties) {
      const userId = property.ownerId || registeredUsers.find((user) => normalizedPlace(user.email) === normalizedPlace(property.ownerEmail))?.id;
      if (canFeatureProperty(property, properties, userId)) ids.add(property.id);
    }
    return ids;
  }, [safeProperties, properties, registeredUsers]);

  useEffect(() => {
    if (selectedId && !safeProperties.some((property) => property.id === selectedId)) setSelectedId(null);
  }, [selectedId, safeProperties]);

  useEffect(() => {
    if (!selected) {
      setNearby([]);
      setNearbyStatus('idle');
      return;
    }
    const controller = new AbortController();
    setNearbyStatus('loading');
    setNearbyError('');
    setNearby([]);
    getNearbyPlaces(selected.lat, selected.lng, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setNearby(items);
          setNearbyStatus('ready');
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setNearbyStatus('error');
          setNearbyError(error instanceof Error ? error.message : 'No fue posible cargar los lugares cercanos.');
        }
      });
    return () => controller.abort();
  }, [selected?.id, selected?.lat, selected?.lng, retry]);

  // El cuadro ampliado se cierra con Esc y evita el scroll del sitio.
  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeExpanded();
    };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', esc);
    };
  }, [expanded]);

  const visibleNearby = nearby.filter(place => {
    const matchesCategory = category === 'all' || category === place.category;
    const query = normalizedPlace(serviceQuery);
    const matchesText = !query || normalizedPlace(`${place.name} ${NEARBY_CATEGORY_INFO[place.category].label}`).includes(query);
    return matchesCategory && matchesText;
  });
  const chooseProperty = (id: string | null) => {
    setSelectedId(id);
    setCategory('all');
    setServiceQuery('');
    setFocusedPlace(null);
    if (!id) setFitRequest((value) => value + 1);
  };

  /**
   * Un solo formulario de búsqueda para ambos tamaños del mapa. Las sugerencias
   * se generan de la lista local de ciudades paraguayas y no afectan al catálogo
   * hasta seleccionar una ciudad o pulsar Buscar.
   */
  const citySearch = (
    <form onSubmit={submitCity} role="search" className="relative flex w-full min-w-0 flex-col gap-2 sm:flex-row">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="nr-map-city" className="sr-only">Ciudad del Paraguay</label>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
          <MapPin size={17} className="shrink-0 text-sky-700" />
          <input
            id="nr-map-city"
            type="search"
            autoComplete="off"
            value={cityDraft}
            placeholder="Buscar ciudad en Paraguay"
            aria-label="Buscar ciudad en Paraguay"
            aria-autocomplete="list"
            aria-expanded={suggestionsOpen && suggestions.length > 0}
            aria-controls="nr-map-city-options"
            onFocus={() => setSuggestionsOpen(true)}
            onChange={event => { setCityDraft(event.target.value); setSuggestionsOpen(true); setHighlightedCity(0); setSearchError(''); }}
            onKeyDown={event => {
              if (event.key === 'ArrowDown' && suggestions.length) { event.preventDefault(); setHighlightedCity(value => (value + 1) % suggestions.length); }
              if (event.key === 'ArrowUp' && suggestions.length) { event.preventDefault(); setHighlightedCity(value => (value + suggestions.length - 1) % suggestions.length); }
              if (event.key === 'Escape') setSuggestionsOpen(false);
              if (event.key === 'Enter' && suggestionsOpen && suggestions.length) {
                event.preventDefault();
                applyCitySearch(suggestions[Math.min(highlightedCity, suggestions.length - 1)]);
              }
            }}
            className="w-full min-w-0 bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400"
          />
          {!!cityDraft && <button type="button" onClick={() => { setCityDraft(''); setSuggestionsOpen(false); setSearchError(''); }} aria-label="Limpiar ciudad" className="rounded-lg p-1 text-slate-500 hover:bg-slate-200"><X size={15} /></button>}
        </div>
        {suggestionsOpen && cityDraft.trim() && suggestions.length > 0 && (
          <div id="nr-map-city-options" role="listbox" aria-label="Ciudades del Paraguay" className="absolute left-0 right-0 top-full z-[2600] mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl">
            {suggestions.map((city, index) => (
              <button
                key={city}
                type="button"
                role="option"
                aria-selected={index === highlightedCity}
                onMouseDown={event => event.preventDefault()}
                onClick={() => applyCitySearch(city)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold ${index === highlightedCity ? 'bg-sky-50 text-sky-800' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <MapPin size={14} className="text-sky-600" /> {city}
                <span className="ml-auto text-[10px] font-normal text-slate-400">Paraguay</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="submit" className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
        <Search size={16} /> Buscar inmuebles
      </button>
    </form>
  );

  // Evitar duplicar referencias manuales cuando el mismo comercio ya fue localizado en OSM.
  const uniqueOwnerReferences = (selected?.nearbyPlaces || []).filter(label => !nearby.some(place =>
    normalizedPlace(label).startsWith(normalizedPlace(place.name))
  ));
  const serviceExplorer = selected && (
    <div className="space-y-4" aria-label="Servicios cerca del inmueble">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700">Entorno y servicios</p>
          <h3 className="mt-1 text-sm font-extrabold text-slate-900">Servicios cerca del inmueble</h3>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{selected.title} · {selected.city} · radio de 1,1 km</p>
        </div>
        <button type="button" className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" onClick={() => chooseProperty(null)} aria-label="Cerrar entorno del inmueble"><X size={16} /></button>
      </div>
      <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-500 focus-within:bg-white">
        <Search size={16} className="text-sky-700" />
        <input value={serviceQuery} onChange={event => setServiceQuery(event.target.value)} placeholder="Buscar supermercados, colegios, bancos…" aria-label="Buscar servicios cerca del inmueble" className="w-full min-w-0 bg-transparent text-xs text-slate-800 outline-none" />
      </label>
      <div className="nr-map-category-scroll flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCategory('all')} aria-pressed={category === 'all'} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold ${category === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Todos</button>
        {categories.map(key => (
          <button key={key} type="button" aria-pressed={category === key} onClick={() => setCategory(key)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] font-bold ${category === key ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {NEARBY_CATEGORY_INFO[key].icon} {NEARBY_CATEGORY_INFO[key].label}
          </button>
        ))}
      </div>
      {/* Las referencias sin coordenadas aportadas por el propietario no se dibujan como pins reales. */}
      {uniqueOwnerReferences.length > 0 && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-bold text-slate-800">Referencias del anuncio</p>
        <p className="mt-1 text-[10px] text-slate-500">Declaradas por el propietario; no verificadas en el mapa.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{uniqueOwnerReferences.map((place, index) => <span key={`${index}-${place}`} className="rounded-lg bg-white px-2 py-1 text-[10px] text-slate-700">{place}</span>)}</div>
      </div>}
      {nearbyStatus === 'ready' && visibleNearby.length > 24 && <p className="text-[10px] text-slate-500">En el mapa se muestran 24 servicios para mantener los precios visibles; consultá el listado o filtrá por categoría.</p>}
      {nearbyStatus === 'loading' && <p role="status" className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">Buscando lugares cercanos…</p>}
      {nearbyStatus === 'error' && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
          <span>{nearbyError}</span>
          <button type="button" className="inline-flex shrink-0 items-center gap-1 font-bold" onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} /> Reintentar</button>
        </div>
      )}
      {nearbyStatus === 'ready' && (
        <>
          <p className="text-[11px] text-slate-500">{visibleNearby.length} lugares encontrados · Información de OpenStreetMap</p>
          <div className="nr-map-nearby-results max-h-[245px] space-y-1.5 overflow-y-auto pr-1" aria-live="polite">
            {visibleNearby.slice(0, 35).map(place => (
              <div key={place.id} className={`flex items-center gap-2 rounded-xl border p-2 ${focusedPlace?.id === place.id ? 'border-sky-300 bg-sky-50' : 'border-slate-100 hover:bg-slate-50'}`}>
                <button type="button" onClick={() => setFocusedPlace(place)} className="flex min-w-0 flex-1 items-center gap-2 text-left" title="Ubicar servicio en el mapa">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-base">{NEARBY_CATEGORY_INFO[place.category].icon}</span>
                  <span className="min-w-0"><span className="block truncate text-xs font-bold text-slate-800">{place.name}</span><span className="block text-[10px] text-slate-500">{NEARBY_CATEGORY_INFO[place.category].label} · a {formatNearbyDistance(place.distanceMeters)}</span></span>
                </button>
                <a href={nearbyPlaceLink(place)} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${place.name} en OpenStreetMap`} title="Ver ubicación" className="rounded-lg p-1.5 text-sky-700 hover:bg-sky-100"><ExternalLink size={15} /></a>
              </div>
            ))}
            {!visibleNearby.length && <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">No se encontraron servicios con esta búsqueda. Probá otra categoría.</p>}
          </div>
          {visibleNearby.length > 35 && <p className="text-[10px] text-slate-500">Se muestran los primeros 35 lugares; refiná la búsqueda para encontrar otros.</p>}
        </>
      )}
    </div>
  );

  // La ampliación usa portal para evitar conflictos de z-index de los paneles de la web.
  const mapPanel = (
    <section aria-label="Mapa de inmuebles en alquiler" className={`nr-map-shell flex w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-md ${expanded ? 'h-[min(94dvh,940px)] max-w-[1490px] shadow-2xl' : ''}`}>
      <header className="relative z-[1800] shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-black text-slate-950 sm:text-base"><Compass size={18} className="text-sky-700" /> {expanded ? 'Mapa de alquileres de Paraguay' : showUnpublished ? 'Ubicación y servicios del inmueble' : 'Encontrá inmuebles en el mapa'}</h2>
            <p className="mt-1 text-[11px] text-slate-500">{safeProperties.length} inmuebles en esta búsqueda · precios mensuales en guaraníes</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" aria-label="Vista del mapa">
              <button type="button" aria-pressed={!satellite} onClick={() => setSatellite(false)} className={`rounded-lg px-3 py-2 text-xs font-bold ${!satellite ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:bg-white'}`}>Mapa</button>
              <button type="button" aria-pressed={satellite} onClick={() => setSatellite(true)} className={`rounded-lg px-3 py-2 text-xs font-bold ${satellite ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-600 hover:bg-white'}`}>Satélite</button>
            </div>
            <button type="button" title="Centrar los alquileres" aria-label="Centrar los alquileres" onClick={() => chooseProperty(null)} className="rounded-xl border border-slate-200 p-2.5 text-slate-700 hover:bg-slate-50"><Layers size={16} /></button>
            <button type="button" onClick={() => { setExpanded(!expanded); setSuggestionsOpen(false); }} title={expanded ? 'Cerrar mapa ampliado' : 'Ampliar mapa'} aria-label={expanded ? 'Cerrar mapa ampliado' : 'Ampliar mapa'} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-brand-700">
              {expanded ? <X size={16} /> : <Expand size={16} />} <span className="hidden sm:inline">{expanded ? 'Cerrar' : 'Ampliar'}</span>
            </button>
          </div>
        </div>
        {!showUnpublished && <div className="mt-3">{citySearch}</div>}
        {searchError && <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{searchError}</p>}
      </header>

      <div className={`min-h-0 ${expanded ? 'flex flex-1 flex-col md:flex-row' : ''}`}>
        <div className={`relative min-w-0 bg-slate-100 ${expanded ? 'min-h-[220px] flex-1' : ''}`} style={expanded ? undefined : { height }}>
          <MapContainer
            key={expanded ? 'expanded-map' : 'catalog-map'}
            center={mapFallback}
            zoom={zoom}
            zoomControl={false}
            scrollWheelZoom
            doubleClickZoom
            style={{ height: '100%', width: '100%' }}
          >
            <MapViewport properties={safeProperties} selected={selected} fallback={mapFallback} defaultZoom={zoom} expanded={expanded} fitRequest={fitRequest} focusedPlace={focusedPlace} />
            <ZoomControl position="bottomright" />
            {satellite ? (
              <TileLayer attribution='Tiles &copy; Esri, Maxar, Earthstar Geographics and the GIS User Community' url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" maxZoom={19} />
            ) : (
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            )}

            {selected && <Circle center={[selected.lat, selected.lng]} radius={NEARBY_RADIUS_METERS} pathOptions={{ color: '#0284c7', weight: 1.2, dashArray: '6 5', fillColor: '#38bdf8', fillOpacity: 0.04 }} />}
            {safeProperties.map(property => (
              <Marker key={property.id} position={[property.lat, property.lng]} icon={propertyPin(property.priceMonth, featuredIds.has(property.id))} zIndexOffset={selected?.id === property.id ? 2000 : featuredIds.has(property.id) ? 1400 : 1200} eventHandlers={{ click: () => chooseProperty(property.id) }}>
                <Popup minWidth={230} maxWidth={285} className="nr-property-popup">
                  <div className="w-[235px] p-1">
                    <img src={property.images?.[0] || '/default-avatar.png'} alt={property.title} className="mb-2 h-28 w-full rounded-xl object-cover" />
                    {featuredIds.has(property.id) && <span className="rounded-full bg-sky-100 px-2 py-1 text-[10px] font-bold text-sky-700">Inmueble destacado</span>}
                    <h3 className="mt-2 text-sm font-extrabold text-slate-900">{property.title}</h3>
                    <p className="mt-1 text-xs text-slate-500">{property.city} · {property.neighborhood}</p>
                    <p className="mt-2 text-base font-black text-sky-800">{formatGs(property.priceMonth)} /mes</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={() => chooseProperty(property.id)} className="flex-1 rounded-lg border border-slate-200 px-2 py-2 text-[11px] font-bold hover:bg-slate-50">Servicios cercanos</button>
                      <button type="button" onClick={() => openPropertyDetail(property.id)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-brand-600 px-2 py-2 text-[11px] font-bold text-white">Ver inmueble <ArrowUpRight size={13} /></button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
            {/* En alta densidad, los primeros 24 servicios evitan ocultar el precio del inmueble. */}
            {selected && visibleNearby.slice(0, 24).map(place => (
              <Marker key={place.id} position={[place.lat, place.lng]} icon={placePin(place.category)} zIndexOffset={200}>
                <Popup minWidth={180}>
                  <div className="w-48 p-1">
                    <p className="text-[10px] font-bold uppercase text-sky-700">{NEARBY_CATEGORY_INFO[place.category].label}</p>
                    <h4 className="mt-1 text-sm font-black text-slate-900">{place.name}</h4>
                    <p className="mt-1 text-xs text-slate-500">Aprox. {formatNearbyDistance(place.distanceMeters)}</p>
                    <a href={nearbyPlaceLink(place)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-700">Ver ubicación <ExternalLink size={13} /></a>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Los servicios se consultan debajo del mapa o a un costado al ampliarlo, nunca encima. */}
        {expanded && selected && <aside className="w-full shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-4 md:w-[360px] md:border-l md:border-t-0">{serviceExplorer}</aside>}
      </div>

      {!expanded && selected && <aside className="border-t border-slate-200 bg-white p-4 sm:p-5">{serviceExplorer}</aside>}
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-[11px] text-slate-600 sm:px-5">
        <span className="flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-800" /> Alquileres</span><span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-sky-300 ring-1 ring-sky-500" /> Destacados</span></span>
        <span>Zoom con la rueda del mouse · Hacé clic sobre un precio para ver servicios</span>
      </footer>
    </section>
  );

  return expanded
    ? createPortal(
      <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-slate-950/75 p-2 backdrop-blur-[3px] sm:p-4" role="dialog" aria-modal="true" aria-label="Mapa ampliado de inmuebles">
        <div className="absolute inset-0" onClick={closeExpanded} aria-hidden="true" />
        {mapPanel}
      </div>,
      document.body,
    )
    : mapPanel;
};
