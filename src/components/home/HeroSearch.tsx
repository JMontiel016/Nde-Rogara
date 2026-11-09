import React, { Suspense, lazy, useEffect, useState } from 'react';
import { ArrowRight, Banknote, Building2, Compass, Crosshair, MapPinned, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PropertyType } from '../../types';
// El mapa se descarga únicamente cuando el visitante lo abre.
const HomeMapLocationPicker = lazy(() => import('./HomeMapLocationPicker').then(mod => ({ default: mod.HomeMapLocationPicker })));
import {
  detectAllowedLocation,
  getBrowserCity,
  resolveSearchPlace,
  setCityPreference,
  useCityPreference,
} from '../../services/locationPreference';

export const HeroSearch: React.FC = () => {
  const { properties, setCurrentView, setFilters } = useApp();
  const cityPreference = useCityPreference();
  const [type, setType] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => { void detectAllowedLocation(properties); }, [properties]);
  useEffect(() => {
    if (cityPreference) setLocationInput(cityPreference.city);
  }, [cityPreference?.city]);

  const activeProperties = properties.filter(p => p.isActive !== false && (!p.moderationStatus || p.moderationStatus === 'approved'));
  const currentCity = cityPreference?.city || '';
  const localCount = currentCity ? activeProperties.filter(p => p.city.toLocaleLowerCase('es') === currentCity.toLocaleLowerCase('es')).length : activeProperties.length;

  const applySearch = (place = locationInput, fallbackToPreference = true) => {
    const resolved = resolveSearchPlace(place, properties);
    const finalCity = resolved.city || (!place.trim() && fallbackToPreference ? cityPreference?.city || '' : '');
    setFilters(prev => ({
      ...prev,
      city: finalCity,
      neighborhood: resolved.neighborhood,
      query: resolved.query,
      propertyTypes: type ? [type as PropertyType] : [],
      maxPrice: maxPrice && Number(maxPrice) > 0 ? Number(maxPrice) : 0,
    }));
    if (finalCity) setCityPreference(finalCity, 'manual');
    else setCityPreference(null);
    setCurrentView('search');
  };

  const locateMe = async () => {
    setLocationError('');
    setIsLocating(true);
    try {
      const location = await getBrowserCity(properties);
      setCityPreference(location.city, 'gps');
      setLocationInput(location.city);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : 'No se pudo consultar tu ubicación.');
    } finally {
      setIsLocating(false);
    }
  };

  const viewAll = () => {
    setLocationInput('');
    setCityPreference(null);
    setFilters(prev => ({ ...prev, city: '', neighborhood: '', query: '', propertyTypes: [], maxPrice: 0 }));
    setCurrentView('search');
  };

  const selectFromMap = (place: string, directSearch = false, city?: string) => {
    const resolved = resolveSearchPlace(city || place, properties);
    setLocationInput(place);
    if (resolved.city) setCityPreference(resolved.city, 'manual');
    else setCityPreference(null);
    if (directSearch) {
      setFilters(prev => ({
        ...prev,
        city: resolved.city,
        neighborhood: resolved.neighborhood,
        query: resolved.query,
        propertyTypes: type ? [type as PropertyType] : [],
        maxPrice: maxPrice && Number(maxPrice) > 0 ? Number(maxPrice) : 0,
      }));
      setCurrentView('search');
    }
  };

  return (
    <section className="relative isolate overflow-hidden bg-[#0b1830] text-white">
      <div className="absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=2100&q=85')" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#07162c] via-[#0a1f3a]/95 to-[#091c33]/65" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#08182d] via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 lg:px-8 lg:pb-20 lg:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr,1.05fr] lg:gap-16">
          <div className="max-w-xl">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-sky-200">
              <Compass className="h-4 w-4" />
              {currentCity ? `Inmuebles en ${currentCity}` : 'Alquileres y propiedades en Paraguay'}
            </div>
            <h1 className="text-4xl font-black leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.65rem]">
              Encontrá el inmueble ideal <span className="text-sky-300">en la ubicación que buscás.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-200">
              Departamentos, casas y espacios comerciales. Explorá precios, barrios y disponibilidad en el mapa, y contactá directamente al propietario.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-slate-200">
              <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
                <strong className="text-white">{localCount}</strong> {localCount === 1 ? 'inmueble disponible' : 'inmuebles disponibles'} {currentCity ? `en ${currentCity}` : 'en el catálogo'}
              </div>
              {currentCity && <button type="button" onClick={viewAll} className="rounded-full border border-white/20 px-4 py-2 font-semibold text-white transition hover:border-white/50 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">Explorar todo Paraguay <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></button>}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/20 bg-white p-5 text-slate-900 shadow-[0_28px_80px_rgba(0,0,0,.26)] sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Búsqueda de propiedades</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">¿Dónde querés vivir?</h2>
                <p className="mt-1 text-sm text-slate-500">Indicá una ciudad o seleccioná una zona en el mapa.</p>
              </div>
              <span className="rounded-2xl bg-sky-50 p-3 text-sky-700"><MapPinned size={23}/></span>
            </div>
            <form onSubmit={e => { e.preventDefault(); applySearch(); }} className="space-y-4">
              <div>
                <label htmlFor="hero-place" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Ciudad, barrio o zona</label>
                <div className="flex items-stretch gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 transition focus-within:border-sky-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-sky-100">
                    <MapPinned className="h-[18px] w-[18px] shrink-0 text-sky-700" />
                    <input id="hero-place" value={locationInput} onChange={e => { setLocationInput(e.target.value); if (!e.target.value.trim()) setCityPreference(null); }} placeholder="Ej.: Ciudad del Este, Asunción..." autoComplete="off" className="h-[52px] w-full min-w-0 bg-transparent py-3.5 text-sm font-semibold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400" />
                    {locationInput && <button type="button" title="Limpiar ubicación" aria-label="Limpiar ubicación" className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-900" onClick={() => { setLocationInput(''); setCityPreference(null); }}><X size={16}/></button>}
                  </div>
                  <button type="button" onClick={() => setMapOpen(true)} title="Buscar sobre el mapa" aria-label="Buscar sobre el mapa" className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-800 transition hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"><MapPinned size={21}/></button>
                </div>
              </div>
              <button type="button" onClick={() => void locateMe()} disabled={isLocating} className="inline-flex items-center gap-2 text-sm font-semibold text-sky-700 transition hover:text-sky-900 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"><Crosshair size={16}/>{isLocating ? 'Localizando...' : 'Usar mi ubicación actual'}</button>
              {locationError && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{locationError}</p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="hero-type" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Tipo de inmueble</label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <Building2 size={17} className="shrink-0 text-sky-700"/>
                    <select id="hero-type" value={type} onChange={e => setType(e.target.value)} className="h-[52px] min-w-0 w-full cursor-pointer bg-transparent text-sm font-semibold text-slate-800 outline-none">
                      <option value="">Todos los tipos</option>
                      <option value="Departamento">Departamento</option>
                      <option value="Casa">Casa</option>
                      <option value="Habitación">Habitación</option>
                      <option value="Local comercial">Local comercial</option>
                      <option value="Oficina">Oficina</option>
                      <option value="Dúplex">Dúplex</option>
                      <option value="Depósito">Depósito</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="hero-price" className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-600">Precio máximo mensual</label>
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
                    <Banknote size={17} className="shrink-0 text-sky-700"/>
                    <input id="hero-price" type="number" min="0" step="50000" inputMode="numeric" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="Sin límite · Gs." className="h-[52px] w-full min-w-0 bg-transparent text-sm font-semibold outline-none placeholder:font-normal placeholder:text-slate-400"/>
                  </div>
                </div>
              </div>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0877cb] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-sky-700/20 transition hover:bg-[#0367b7] hover:shadow-xl active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"><Search size={19}/> Buscar inmuebles <ArrowRight size={17}/></button>
            </form>
          </div>
        </div>
      </div>
      {mapOpen && (
        <Suspense fallback={<div role="status" className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/60 text-white">Abriendo mapa…</div>}>
          <HomeMapLocationPicker isOpen={mapOpen} onClose={() => setMapOpen(false)} selectedLocation={locationInput} onSelectLocation={selectFromMap} properties={properties} />
        </Suspense>
      )}
    </section>
  );
};
