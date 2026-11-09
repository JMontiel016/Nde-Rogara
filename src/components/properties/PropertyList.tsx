/**
 * Componente: PropertyList.tsx
 * Módulo: Explorador y Búsqueda de Inmuebles
 * Propósito: Listado dinámico de inmuebles con mapa interactivo, ordenamiento y
 * panel de filtros adaptable como cajón modal (slide-over drawer) en teléfonos móviles.
 */

import React, { useState, useMemo } from 'react';
import { 
  Map, 
  List, 
  Grid, 
  SlidersHorizontal,
  Home,
  MapPin,
  Compass,
  X,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PropertyCard } from './PropertyCard';
import { PropertyFilters } from './PropertyFilters';
import { PropertyMap } from './PropertyMap';
import { canFeatureProperty, isPropertyPublic } from '../../data/publicationPlans';
import { mapCenterForCity, setCityPreference } from '../../services/locationPreference';

export const PropertyList: React.FC = () => {
  const { properties, filters, resetFilters } = useApp();
  const mapCenter = filters.city ? mapCenterForCity(filters.city, properties) : null;

  const clearAllFilters = () => { resetFilters(); setCityPreference(null); };

  const [mapExpandRequest, setMapExpandRequest] = useState(0);
  const [mapProperty, setMapProperty] = useState<{ id: string; token: number } | null>(null);
  const [viewMode, setViewMode] = useState<'horizontal' | 'grid'>('horizontal');
  const [sortBy, setSortBy] = useState<'relevant' | 'priceAsc' | 'priceDesc' | 'beds'>('relevant');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filtrado reactivo de propiedades (solo inmuebles activos/publicados)
  const filteredProperties = useMemo(() => {
    return properties.filter(prop => {
      // Si el inmueble está inactivo o pausado, no mostrar en el catálogo público
      if (!isPropertyPublic(prop)) {
        return false;
      }
      // Filtro de ciudad
      if (filters.city && prop.city !== filters.city) {
        return false;
      }
      // Filtro de barrio
      if (filters.neighborhood && prop.neighborhood !== filters.neighborhood) {
        return false;
      }
      // Filtro de tipos de inmueble
      if (filters.propertyTypes.length > 0 && !filters.propertyTypes.includes(prop.type)) {
        return false;
      }
      // Filtro de precio mínimo y máximo
      if (filters.minPrice > 0 && prop.priceMonth < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice > 0 && filters.maxPrice !== 15000000 && prop.priceMonth > filters.maxPrice) {
        return false;
      }
      // Dormitorios
      if (filters.minBedrooms > 0 && prop.bedrooms < filters.minBedrooms) {
        return false;
      }
      // Baños
      if (filters.minBathrooms > 0 && prop.bathrooms < filters.minBathrooms) {
        return false;
      }
      // Cochera
      if (filters.hasParking && prop.parkingSpots < 1) {
        return false;
      }
      // Amoblado
      if (filters.isFurnished && !prop.features.some(f => f.toLowerCase().includes('amoblado'))) {
        return false;
      }
      // Mascotas
      if (filters.allowsPets && !prop.features.some(f => f.toLowerCase().includes('mascota'))) {
        return false;
      }
      // Piscina
      if (filters.hasPool && !prop.features.some(f => f.toLowerCase().includes('piscina'))) {
        return false;
      }
      // Balcón
      if (filters.hasBalcony && !prop.features.some(f => f.toLowerCase().includes('balcón'))) {
        return false;
      }
      // Patio
      if (filters.hasPatio && !prop.features.some(f => f.toLowerCase().includes('patio'))) {
        return false;
      }
      // Búsqueda textual
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchesTitle = prop.title.toLowerCase().includes(q);
        const matchesDesc = prop.description.toLowerCase().includes(q);
        const matchesNeigh = prop.neighborhood.toLowerCase().includes(q);
        const matchesCity = prop.city.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesNeigh && !matchesCity) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'priceAsc') return a.priceMonth - b.priceMonth;
      if (sortBy === 'priceDesc') return b.priceMonth - a.priceMonth;
      if (sortBy === 'beds') return b.bedrooms - a.bedrooms;
      const rank = (p: typeof a) => canFeatureProperty(p,properties,p.ownerId) ? 1 : 0;
      return rank(b) - rank(a);
    });
  }, [properties, filters, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12">
      {/* Encabezado compacto que mantiene ciudad, búsqueda y mapa conectados. */}
      <header className="mb-6 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span>Inicio</span><span className="text-slate-300">/</span><span>Inmuebles en alquiler</span>
            {filters.city && <><span className="text-slate-300">/</span><span className="text-brand-700">{filters.city}</span></>}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {filters.city ? `Encontrá tu alquiler en ${filters.city}` : 'Explorá inmuebles en alquiler en Paraguay'}
          </h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <MapPin size={15} className="shrink-0 text-brand-600" />
            {filters.city ? `Propiedades disponibles en ${filters.city} según tu búsqueda` : 'Elegí una ciudad o recorré las propiedades disponibles en el mapa'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setMobileFiltersOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 shadow-sm transition hover:border-brand-300 hover:bg-brand-50 lg:hidden">
            <SlidersHorizontal size={17} className="text-brand-600" /> Filtros
          </button>
          <button type="button" onClick={() => setMapExpandRequest((value) => value + 1)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-brand-700">
            <Map size={17} /> Ampliar mapa
          </button>
        </div>
      </header>

      <section id="nr-map-catalog" className="mb-7 scroll-mt-24 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-900"><Compass size={18} className="text-brand-600" /> Mapa de alquileres disponibles</h2>
            <p className="text-xs text-slate-500">Elegí un inmueble para conocer su entorno</p>
          </div>
          <PropertyMap
            properties={filteredProperties}
            center={mapCenter || undefined}
            height="520px"
            expandRequest={mapExpandRequest}
            focusPropertyId={mapProperty?.id}
            focusPropertyToken={mapProperty?.token}
            onSearchApplied={() => window.requestAnimationFrame(() => document.getElementById('nr-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}
          />
      </section>

      {/* Grid Principal: Filtros (Desktop) + Resultados */}
      <div id="nr-results" className="grid grid-cols-1 lg:grid-cols-4 gap-6 scroll-mt-24">
        {/* Filtros en Desktop (columna fija izquierda) */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24">
            <PropertyFilters />
          </div>
        </aside>

        {/* Columna de Resultados y Mapa */}
        <main className="lg:col-span-3 space-y-6">

          {/* Barra de resultados y ordenamiento */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm">
            <div className="text-xs sm:text-sm font-bold text-slate-800">
              <span className="text-brand-600 font-extrabold">{filteredProperties.length}</span> {filteredProperties.length === 1 ? 'propiedad encontrada' : 'propiedades encontradas'}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              {/* Selector de vista en pantalla grande */}
              <div className="hidden sm:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('horizontal')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'horizontal' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
                  aria-label="Mostrar inmuebles en lista"
                  aria-pressed={viewMode === 'horizontal'}
                  title="Vista lista"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand-600' : 'text-slate-500'}`}
                  aria-label="Mostrar inmuebles en cuadrícula"
                  aria-pressed={viewMode === 'grid'}
                  title="Vista cuadrícula"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>

              {/* Ordenamiento */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'relevant' | 'priceAsc' | 'priceDesc' | 'beds')}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="relevant">Más relevantes</option>
                  <option value="priceAsc">Menor precio</option>
                  <option value="priceDesc">Mayor precio</option>
                  <option value="beds">Más dormitorios</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grilla / Lista de Propiedades */}
          {filteredProperties.length > 0 ? (
            <div className={
              viewMode === 'horizontal'
                ? "space-y-4"
                : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
            }>
              {filteredProperties.map(prop => (
                <PropertyCard 
                  key={prop.id} 
                  property={prop} 
                  layout={viewMode === 'horizontal' ? 'horizontal' : 'vertical'}
                  onShowOnMap={(id) => setMapProperty(previous => ({ id, token: (previous?.token || 0) + 1 }))}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Home className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">No encontramos inmuebles con esos filtros</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Probá ampliando el rango de precios en Guaraníes o seleccionando otra ciudad o barrio.
              </p>
              <button
                onClick={clearAllFilters}
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow"
              >
                Restablecer filtros
              </button>
            </div>
          )}
        </main>
      </div>

      {/* MODAL / CAJÓN DE FILTROS PARA TELÉFONOS MÓVILES (Slide-over drawer) */}
      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 overflow-hidden flex flex-col justify-end">
          {/* Fondo oscuro */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileFiltersOpen(false)}
          />

          {/* Contenedor del cajón deslizable desde abajo */}
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto p-5 shadow-2xl z-10 animate-slideUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-600" />
                <h3 className="font-extrabold text-slate-900 text-sm">Filtros de Búsqueda</h3>
              </div>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido completo de filtros */}
            <PropertyFilters />

            {/* Botón flotante inferior para aplicar */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-slate-100 mt-4">
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-black text-sm py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Ver {filteredProperties.length} propiedades</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
