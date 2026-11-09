import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, MapPin, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PropertyCard } from '../properties/PropertyCard';
import { effectiveOwnerPlan, canFeatureProperty, isPropertyPublic } from '../../data/publicationPlans';
import { normalizedPlace, useCityPreference } from '../../services/locationPreference';
import type { Property } from '../../types';

export const FeaturedProperties: React.FC = () => {
  const { properties, registeredUsers, setFilters, setCurrentView } = useApp();
  const cityPreference = useCityPreference();
  const [revision, setRevision] = useState(0);
  const city = cityPreference?.city || '';

  useEffect(() => {
    const update = () => setRevision(value => value + 1);
    window.addEventListener('nderogara-plan-updated', update);
    // Refrescar la elegibilidad cuando un plan vence sin que el visitante recargue la página.
    const timer = window.setInterval(update, 30000);
    return () => { window.removeEventListener('nderogara-plan-updated', update); window.clearInterval(timer); };
  }, []);

  const { featured, regular, total } = useMemo(() => {
    const available = properties.filter(isPropertyPublic);
    const local = city ? available.filter(p => normalizedPlace(p.city) === normalizedPlace(city)) : available;
    const ownerPlan = (property: Property) => {
      const ownerId = property.ownerId || registeredUsers.find(user => normalizedPlace(user.email) === normalizedPlace(property.ownerEmail))?.id;
      return effectiveOwnerPlan(ownerId);
    };
    const promoted = local.filter(p => {const id=p.ownerId || registeredUsers.find(u=>normalizedPlace(u.email)===normalizedPlace(p.ownerEmail))?.id;return canFeatureProperty(p,properties,id);});
    promoted.sort((a, b) => {
      const aRank = ownerPlan(a)?.id === 'professional' ? 1 : 0;
      const bRank = ownerPlan(b)?.id === 'professional' ? 1 : 0;
      return bRank - aRank;
    });
    return { featured: promoted.slice(0, 6), regular: local.slice(0, 9), total: local.length };
  }, [properties, registeredUsers, city, revision]);

  const explore = () => {
    setFilters(prev => ({ ...prev, city, neighborhood: '', query: '', propertyTypes: [], maxPrice: 0 }));
    setCurrentView('search');
  };

  return (
    <section className="mx-auto max-w-7xl space-y-14 px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">Visibilidad Premium</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              {city ? `Inmuebles destacados en ${city}` : 'Inmuebles destacados en Paraguay'}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Publicaciones de propietarios con planes Premium o Profesional vigentes, según la ciudad que estás explorando.
            </p>
          </div>
          <button onClick={explore} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-sky-800 shadow-sm transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600">Explorar inmuebles <ArrowRight size={16}/></button>
        </div>
        {featured.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map(property => <div key={property.id} className="relative rounded-[22px] border-2 border-sky-200 bg-sky-50/70 p-1.5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-400 hover:shadow-lg"><div className="pointer-events-none absolute left-5 top-5 z-20 rounded-lg bg-sky-200/95 px-3 py-1.5 text-[11px] font-black text-sky-950 shadow">Destacado</div><PropertyCard property={property}/></div>)}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center">
            <ShieldCheck className="text-sky-600" size={32}/>
            <h3 className="text-lg font-black text-slate-900">{city ? `Sin destacados vigentes en ${city}` : 'Sin destacados activos por el momento'}</h3>
            <p className="max-w-lg text-sm text-slate-500">Podés seguir consultando los inmuebles disponibles. Los anuncios destacados aparecen automáticamente mientras el plan contratado está vigente.</p>
          </div>
        )}
      </div>

      <div className="space-y-6" id="inmuebles-disponibles">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-500"><MapPin size={15}/>{city ? `Ubicación: ${city}` : 'Cobertura nacional'}</div>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{city ? `Propiedades disponibles en ${city}` : 'Explorá propiedades disponibles'}</h2>
            <p className="mt-2 text-sm text-slate-600">{total} {total === 1 ? 'inmueble publicado' : 'inmuebles publicados'} · Consultá fotos, ubicación, precio y condiciones de alquiler.</p>
          </div>
          <button onClick={explore} className="inline-flex items-center gap-2 self-start rounded-xl bg-[#0c1f38] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#183956] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600">Ver todos los resultados <ArrowRight size={16}/></button>
        </div>
        {regular.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{regular.map(property => <PropertyCard key={property.id} property={property}/>)}</div>
        ) : (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-12 text-center"><Building2 className="mx-auto text-slate-400" size={36}/><h3 className="mt-4 text-lg font-black text-slate-900">No hay publicaciones disponibles {city ? `en ${city}` : 'por el momento'}</h3><p className="mt-2 text-sm text-slate-500">Probá con otra ubicación o consultá el catálogo completo.</p></div>
        )}
      </div>
    </section>
  );
};
