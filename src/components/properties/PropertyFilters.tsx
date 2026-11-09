/**
 * Componente: PropertyFilters.tsx
 * Módulo: Explorador y Búsqueda de Inmuebles
 * Propósito: Barra lateral de filtros reactivos para refinar por ubicación (ciudad y barrio),
 * rango de precios con botones táctiles rápidos en Guaraníes (Gs.), tipos de inmueble y comodidades.
 */

import React from 'react';
import { RotateCcw, Filter, Check, Banknote, MapPin, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PropertyType } from '../../types';
import { formatGs } from '../../utils/formatters';
import { setCityPreference } from '../../services/locationPreference';

const ALL_TYPES: PropertyType[] = [
  'Departamento',
  'Casa',
  'Habitación',
  'Dúplex',
  'Local comercial',
  'Oficina',
  'Depósito'
];

const BARRIOS_POR_CIUDAD: Record<string, string[]> = {
  'Asunción': ['Todos los barrios', 'Barrio Recoleta', 'Villa Morra', 'Las Mercedes', 'Carmelitas', 'Manorá', 'San Cristóbal', 'Sajonia'],
  'San Lorenzo': ['Todos los barrios', 'Barrio Aurora', 'San Lorenzo Centro', 'Barcequillo', 'Villa Amelia', 'Campus UNA'],
  'Luque': ['Todos los barrios', 'Zona Centro', 'Zárate Isla', 'Tarumandy', 'Cuarto Barrio', 'Mora Cué'],
  'Capiatá': ['Todos los barrios', 'Ruta 2 Km 20', 'Posta Ybycuá', 'Aldana Cañada', 'Aratirí', 'Centro'],
  'Fernando de la Mora': ['Todos los barrios', 'Zona Norte', 'Zona Sur', 'Centro'],
  'Lambaré': ['Todos los barrios', 'Barrio Valle Apu\'a', 'Puerto Pabla', 'Villa Virginia', 'Yacht y Golf Club'],
  'Mariano Roque Alonso': ['Todos los barrios', 'Centro', 'Corredor Botánico', 'Zona Expo'],
  'Ñemby': ['Todos los barrios', 'Centro', 'Pa\'i Ñu', 'Cerro Ñemby'],
  'Villa Elisa': ['Todos los barrios', 'Centro', 'Paseo Parque', 'Petropar'],
  'Limpio': ['Todos los barrios', 'Centro', 'Costa Azul', 'Piquete Cué'],
  'San Antonio': ['Todos los barrios', 'Centro', 'Acceso Sur'],
  'Itauguá': ['Todos los barrios', 'Centro', 'Hospital Nacional'],
  'Areguá': ['Todos los barrios', 'Centro', 'Costa Lago'],
  'Ypané': ['Todos los barrios', 'Centro', 'Paso de Patria'],
  'Ciudad del Este': ['Todos los barrios', 'Centro', 'Área 1', 'Área 4', 'Km 7'],
  'Encarnación': ['Todos los barrios', 'Costanera', 'Centro', 'San Pedro']
};

export const PropertyFilters: React.FC = () => {
  const { filters, setFilters, resetFilters, properties } = useApp();
  const cities = Array.from(new Set([...properties.map(p => p.city), ...Object.keys(BARRIOS_POR_CIUDAD)])).sort((a, b) => a.localeCompare(b, 'es'));
  // Incluir los tipos personalizados que se publicaron, sin imponer categorías ajenas.
  const availableTypes: PropertyType[] = Array.from(new Set<PropertyType>([...ALL_TYPES, ...properties.map(property => property.type)])).filter(Boolean);
  const clear = () => { resetFilters(); setCityPreference(null); };

  const handleTypeToggle = (type: PropertyType) => {
    setFilters(prev => {
      const exists = prev.propertyTypes.includes(type);
      return {
        ...prev,
        propertyTypes: exists 
          ? prev.propertyTypes.filter(t => t !== type)
          : [...prev.propertyTypes, type]
      };
    });
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const city = e.target.value;
    setCityPreference(city || null);
    setFilters(prev => ({
      ...prev,
      city,
      neighborhood: ''
    }));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-6">
      {/* Encabezado de Filtros */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-brand-600" />
          <h3 className="font-extrabold text-slate-900 text-sm">Filtros de búsqueda</h3>
        </div>
        <button
          onClick={clear}
          className="text-xs text-brand-600 hover:text-brand-700 font-bold flex items-center gap-1 transition p-1"
          title="Restablecer filtros"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpiar</span>
        </button>
      </div>

      {/* 1. Búsqueda por Lugar y Ciudad */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <MapPin className="w-3.5 h-3.5 text-brand-600" />
          <span>Ubicación y Barrio</span>
        </div>

        {/* Buscador de texto para barrio o calle */}
        <div>
          <input
            type="text"
            value={filters.query || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            placeholder="Buscar por barrio o calle..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>
        
        {/* Selector de Ciudad */}
        <div>
          <span className="text-[11px] text-slate-500 block mb-1">Ciudad</span>
          <select
            value={filters.city}
            onChange={handleCityChange}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
          >
            <option value="">Todas las ciudades</option>
            {cities.map(city => <option key={city} value={city}>{city}</option>)}
          </select>
        </div>

        {/* Selector de Barrio */}
        <div>
          <span className="text-[11px] text-slate-500 block mb-1">Barrio</span>
          <select
            value={filters.neighborhood}
            onChange={(e) => setFilters(prev => ({ ...prev, neighborhood: e.target.value }))}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none cursor-pointer"
            disabled={!filters.city}
          >
            <option value="">Todos los barrios</option>
            {filters.city && BARRIOS_POR_CIUDAD[filters.city]?.map(b => (
              <option key={b} value={b === 'Todos los barrios' ? '' : b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Selector de Precio mensual en Guaraníes */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            <span>Precio mensual</span>
          </div>
          <span className="text-xs font-extrabold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-lg">
            {filters.maxPrice <= 0 || filters.maxPrice === 15000000 ? 'Sin límite' : formatGs(filters.maxPrice)}
          </span>
        </div>

        {/* Campo numérico para escribir el monto propio */}
        <div>
          <span className="text-[10px] text-slate-500 block mb-1 font-semibold">
            O escribir monto exacto (Gs.):
          </span>
          <input
            type="number"
            step={100000}
            value={filters.maxPrice || ''}
            onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
            placeholder="Sin límite"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-800 focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

      </div>

      {/* 3. Tipo de propiedad */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">Tipo de inmueble</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1">
          {availableTypes.map(type => {
            const checked = filters.propertyTypes.includes(type);
            return (
              <label 
                key={type}
                className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 hover:bg-slate-50 p-1.5 rounded-lg select-none transition"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleTypeToggle(type)}
                  className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
                />
                <span className={checked ? 'font-bold text-brand-700' : 'font-medium'}>{type}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. Características y Habitaciones */}
      <div className="space-y-3 pt-3 border-t border-slate-100">
        <label className="text-xs font-bold text-slate-800 block">Dormitorios y Baños</label>

        {/* Dormitorios */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Dormitorios</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, minBedrooms: num }))}
                className={`min-w-[34px] h-8 px-1.5 rounded-lg text-[11px] font-bold transition ${
                  filters.minBedrooms === num 
                    ? 'bg-brand-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {num === 0 ? 'Todos' : `${num}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Baños */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Baños</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => setFilters(prev => ({ ...prev, minBathrooms: num }))}
                className={`min-w-[34px] h-8 px-1.5 rounded-lg text-[11px] font-bold transition ${
                  filters.minBathrooms === num 
                    ? 'bg-brand-600 text-white shadow-sm' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {num === 0 ? 'Todos' : `${num}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Comodidades adicionales */}
        <div className="space-y-1.5 pt-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 p-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.hasParking}
              onChange={(e) => setFilters(prev => ({ ...prev, hasParking: e.target.checked }))}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span>Estacionamiento / Cochera</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 p-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.isFurnished}
              onChange={(e) => setFilters(prev => ({ ...prev, isFurnished: e.target.checked }))}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span>Amoblado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 p-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.allowsPets}
              onChange={(e) => setFilters(prev => ({ ...prev, allowsPets: e.target.checked }))}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span>Mascotas permitidas</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 p-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.hasPool}
              onChange={(e) => setFilters(prev => ({ ...prev, hasPool: e.target.checked }))}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span>Piscina</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 p-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.hasBalcony}
              onChange={(e) => setFilters(prev => ({ ...prev, hasBalcony: e.target.checked }))}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span>Balcón</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 p-1 rounded-lg hover:bg-slate-50">
            <input
              type="checkbox"
              checked={filters.hasPatio}
              onChange={(e) => setFilters(prev => ({ ...prev, hasPatio: e.target.checked }))}
              className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 w-4 h-4 cursor-pointer"
            />
            <span>Patio</span>
          </label>
        </div>
      </div>
    </div>
  );
};
