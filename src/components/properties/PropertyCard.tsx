import React from 'react';
import { 
  Bed, 
  Bath, 
  Car, 
  MapPin, 
  Heart, 
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import { Property } from '../../types';
import { formatGs } from '../../utils/formatters';
import { useApp } from '../../context/AppContext';

interface PropertyCardProps {
  property: Property;
  compact?: boolean;
  layout?: 'vertical' | 'horizontal';
  onShowOnMap?: (propertyId: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ 
  property, 
  compact = false,
  layout = 'vertical',
  onShowOnMap
}) => {
  const { 
    openPropertyDetail, 
    favorites, 
    toggleFavorite, 
    compareList, 
    toggleCompare 
  } = useApp();

  const isFavorite = favorites.includes(property.id);
  const isCompared = compareList.includes(property.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(property.id);
  };

  const showOnMap = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // No abrir la ficha: la acción ubica el anuncio en el mapa.
    onShowOnMap?.(property.id);
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare(property.id);
  };

  if (layout === 'horizontal') {
    return (
      <div 
        onClick={() => openPropertyDetail(property.id)}
        className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-lg transition-all duration-300 overflow-hidden cursor-pointer flex flex-col sm:flex-row"
      >
        {/* Thumbnail */}
        <div className="relative sm:w-60 h-48 sm:h-auto shrink-0 overflow-hidden bg-slate-100">
          <img 
            src={property.images[0]} 
            alt={property.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
            {property.verifiedAt && property.isVerified && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 shadow-sm">✓ Verificado</span>}
            {Boolean(property.discountPercent && property.discountPercent > 0) && (
              <div className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                <span>{property.discountBadge || `🔥 -${property.discountPercent}% OFF`}</span>
              </div>
            )}
          </div>
          <button
            onClick={handleFavoriteClick}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-rose-500 shadow transition"
            title="Guardar favorito"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-brand-600 uppercase tracking-wider">
                {property.type}
              </span>
              <button
                onClick={handleCompareClick}
                className={`text-[11px] px-2 py-0.5 rounded font-medium flex items-center gap-1 transition ${
                  isCompared ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title="Comparar"
              >
                <ArrowRightLeft className="w-3 h-3" />
                <span>{isCompared ? 'Comparando' : 'Comparar'}</span>
              </button>
            </div>

            <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition mb-1 line-clamp-1">
              {property.title}
            </h3>

            {property.discountPercent && property.discountedPrice ? (
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-lg font-black text-rose-600">
                  {formatGs(property.discountedPrice)}
                </span>
                <span className="text-xs line-through text-slate-400 font-semibold">
                  {formatGs(property.priceMonth)}
                </span>
                <span className="text-xs font-normal text-slate-500">/ mes</span>
              </div>
            ) : (
              <div className="text-lg font-black text-brand-700 mb-3">
                {formatGs(property.priceMonth)} <span className="text-xs font-normal text-slate-500">/ mes</span>
              </div>
            )}

            {/* Specs */}
            <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mb-3">
              {property.bedrooms > 0 && (
                <div className="flex items-center gap-1">
                  <Bed className="w-4 h-4 text-slate-400" />
                  <span>{property.bedrooms}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Bath className="w-4 h-4 text-slate-400" />
                <span>{property.bathrooms}</span>
              </div>
              <div className="flex items-center gap-1">
                <Car className="w-4 h-4 text-slate-400" />
                <span>{property.parkingSpots}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="line-clamp-1">{property.city}, {property.neighborhood}</span>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {onShowOnMap && (
                <button type="button" onClick={showOnMap} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50" title="Ver inmueble en el mapa">
                  <MapPin size={14} /> Ver en mapa
                </button>
              )}
              <div className="text-brand-600 font-semibold flex items-center group-hover:translate-x-1 transition">
              <span>Ver</span>
              <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => openPropertyDetail(property.id)}
      className="group bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img 
          src={property.images[0]} 
          alt={property.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
        />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
          {property.verifiedAt && property.isVerified && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-800 shadow-sm">✓ Verificado</span>}
          {Boolean(property.discountPercent && property.discountPercent > 0) && (
            <div className="bg-rose-600 text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
              <span>{property.discountBadge || `🔥 -${property.discountPercent}% OFF`}</span>
            </div>
          )}
        </div>

        {/* Favorite & Compare Action Buttons */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <button
            onClick={handleCompareClick}
            className={`p-1.5 rounded-full shadow transition ${
              isCompared 
                ? 'bg-brand-600 text-white' 
                : 'bg-white/90 hover:bg-white text-slate-600 hover:text-brand-600'
            }`}
            title="Comparar propiedad"
          >
            <ArrowRightLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleFavoriteClick}
            className="p-1.5 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-rose-500 shadow transition"
            title="Guardar favorito"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Type pill */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-md">
          {property.type}
        </div>
      </div>

      {/* Info Container */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-600 transition mb-1 line-clamp-1">
            {property.title}
          </h3>

          {property.discountPercent && property.discountedPrice ? (
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-lg font-black text-rose-600">
                {formatGs(property.discountedPrice)}
              </span>
              <span className="text-xs line-through text-slate-400 font-semibold">
                {formatGs(property.priceMonth)}
              </span>
              <span className="text-xs font-normal text-slate-500">/ mes</span>
            </div>
          ) : (
            <div className="text-lg font-black text-brand-700 mb-3">
              {formatGs(property.priceMonth)} <span className="text-xs font-normal text-slate-500">/ mes</span>
            </div>
          )}

          {/* Specs */}
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600 mb-3">
            {property.bedrooms > 0 && (
              <div className="flex items-center gap-1" title="Dormitorios">
                <Bed className="w-4 h-4 text-slate-400" />
                <span>{property.bedrooms}</span>
              </div>
            )}
            <div className="flex items-center gap-1" title="Baños">
              <Bath className="w-4 h-4 text-slate-400" />
              <span>{property.bathrooms}</span>
            </div>
            <div className="flex items-center gap-1" title="Cocheras / Estacionamiento">
              <Car className="w-4 h-4 text-slate-400" />
              <span>{property.parkingSpots}</span>
            </div>
            {property.areaM2 > 0 && (
              <div className="text-slate-400 text-[11px] font-normal ml-auto">
                {property.areaM2} m²
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{property.city}, {property.neighborhood}</span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {onShowOnMap && (
              <button type="button" onClick={showOnMap} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-sky-700 hover:bg-sky-50" title="Ver inmueble en el mapa">
                <MapPin size={14} /> Ver en mapa
              </button>
            )}
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 group-hover:translate-x-0.5 transition shrink-0" />
          </div>
        </div>
      </div>
    </div>
  );
};

