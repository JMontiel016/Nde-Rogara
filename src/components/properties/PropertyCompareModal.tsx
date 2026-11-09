import React from 'react';
import { 
  X, 
  Check, 
  Minus, 
  ArrowRightLeft, 
  Trash2, 
  ExternalLink,
  ShieldCheck,
  Bed,
  Bath,
  Car
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatGs } from '../../utils/formatters';
import { Modal } from '../common/Modal';

export const PropertyCompareModal: React.FC = () => {
  const { 
    isCompareOpen, 
    setIsCompareOpen, 
    compareList, 
    removeFromCompare, 
    properties,
    openPropertyDetail 
  } = useApp();

  const comparedProperties = properties.filter(p => compareList.includes(p.id));

  return (
    <Modal
      isOpen={isCompareOpen}
      onClose={() => setIsCompareOpen(false)}
      title="Comparador de Propiedades - Nde Rogarã"
      maxWidth="6xl"
    >
      <div className="space-y-6">
        {comparedProperties.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <ArrowRightLeft className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-base font-bold text-slate-800">No tenés propiedades seleccionadas para comparar</h4>
            <p className="text-xs text-slate-500">
              Hacé clic en el ícono de comparar en cualquier propiedad para verlas lado a lado.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-3 bg-slate-50 border border-slate-200 text-slate-400 font-bold uppercase w-48">
                    Inmueble
                  </th>
                  {comparedProperties.map(p => (
                    <th key={p.id} className="p-3 bg-white border border-slate-200 min-w-[220px]">
                      <div className="relative group">
                        <img 
                          src={p.images[0]} 
                          alt={p.title} 
                          className="w-full h-28 object-cover rounded-xl mb-2"
                        />
                        <button
                          onClick={() => removeFromCompare(p.id)}
                          className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow"
                          title="Quitar de la comparación"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="font-bold text-slate-900 line-clamp-1">{p.title}</div>
                        <div className="text-brand-600 font-extrabold text-sm mt-0.5">
                          {formatGs(p.priceMonth)} / mes
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Ciudad y Barrio */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Ubicación
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 text-slate-700">
                      <div className="font-semibold">{p.city}</div>
                      <div className="text-slate-500">{p.neighborhood}</div>
                    </td>
                  ))}
                </tr>

                {/* Tipo */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Tipo de inmueble
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-semibold text-brand-700">
                      {p.type}
                    </td>
                  ))}
                </tr>

                {/* Dormitorios */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Dormitorios
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-bold text-slate-800">
                      {p.bedrooms > 0 ? `${p.bedrooms} Dormitorios` : 'Monoambiente / Espacio abierto'}
                    </td>
                  ))}
                </tr>

                {/* Baños */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Baños
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-bold text-slate-800">
                      {p.bathrooms} Baño{p.bathrooms > 1 ? 's' : ''}
                    </td>
                  ))}
                </tr>

                {/* Cocheras */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Estacionamiento
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 text-slate-800">
                      {p.parkingSpots > 0 ? `${p.parkingSpots} Vehículo(s)` : 'Sin cochera'}
                    </td>
                  ))}
                </tr>

                {/* Superficie m² */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Superficie total
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 font-bold text-slate-800">
                      {p.areaM2} m²
                    </td>
                  ))}
                </tr>

                {/* Expensas */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Expensas
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 text-slate-800">
                      {p.expenses.buildingFees ? formatGs(p.expenses.buildingFees) : 'Sin expensas'}
                    </td>
                  ))}
                </tr>

                {/* Agua */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Servicio de agua
                  </td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 text-slate-800">
                      <span className={p.expenses.water === 'Incluida' ? 'text-emerald-600 font-bold' : ''}>
                        {p.expenses.water}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Mascotas */}
                <tr>
                  <td className="p-3 bg-slate-50 font-bold text-slate-700 border border-slate-200">
                    Mascotas
                  </td>
                  {comparedProperties.map(p => {
                    const allows = p.features.some(f => f.toLowerCase().includes('mascota'));
                    return (
                      <td key={p.id} className="p-3 border border-slate-200">
                        {allows ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Permitidas
                          </span>
                        ) : (
                          <span className="text-slate-400 flex items-center gap-1">
                            <Minus className="w-3.5 h-3.5" /> No especificado
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Acción de ver detalle */}
                <tr>
                  <td className="p-3 bg-slate-50 border border-slate-200"></td>
                  {comparedProperties.map(p => (
                    <td key={p.id} className="p-3 border border-slate-200 text-center">
                      <button
                        onClick={() => {
                          setIsCompareOpen(false);
                          openPropertyDetail(p.id);
                        }}
                        className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-2 px-3 rounded-xl shadow-sm transition flex items-center justify-center gap-1"
                      >
                        <span>Ver detalle</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => setIsCompareOpen(false)}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
};

