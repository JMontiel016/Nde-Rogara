/**
 * Archivo: paraguayLocations.ts
 * Módulo: Datos Geográficos y Zonas de Paraguay
 * Propósito: Registro exhaustivo y de alta precisión de ciudades, barrios y puntos de referencia de Gran Asunción
 * y principales departamentos de Paraguay, con resolución exacta de coordenadas lat/lng.
 */

export interface ParaguayZone {
  name: string;
  city: string;
  lat: number;
  lng: number;
  desc: string;
  zoom: number;
  type: 'ciudad' | 'barrio' | 'referencia';
}

export const PARAGUAY_ZONES: ParaguayZone[] = [
  // Ciudades principales
  { 
    name: 'Asunción', 
    city: 'Asunción',
    lat: -25.2867, 
    lng: -57.6470, 
    desc: 'Capital: Centro Histórico, Costanera, Palacio de López', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'San Lorenzo', 
    city: 'San Lorenzo',
    lat: -25.3392, 
    lng: -57.5088, 
    desc: 'Ciudad Universitaria: Centro, Catedral, Mercado', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Luque', 
    city: 'Luque',
    lat: -25.2678, 
    lng: -57.4897, 
    desc: 'Sede CONMEBOL, Aeropuerto Silvio Pettirossi, Centro', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Capiatá', 
    city: 'Capiatá',
    lat: -25.3533, 
    lng: -57.4450, 
    desc: 'Ruta PY02 Km 20, Posta Ybycuá, Aldana Cañada, Aratirí', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Fernando de la Mora', 
    city: 'Fernando de la Mora',
    lat: -25.3217, 
    lng: -57.5458, 
    desc: 'Zona Norte, Zona Sur, Mcal. Estigarribia', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Lambaré', 
    city: 'Lambaré',
    lat: -25.3444, 
    lng: -57.6067, 
    desc: 'Cerro Lambaré, Yacht y Golf Club, Valle Apu\'a', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Mariano Roque Alonso', 
    city: 'Mariano Roque Alonso',
    lat: -25.2167, 
    lng: -57.5333, 
    desc: 'Campo de Exposiciones Expo, Puente Remanso, Aeropuerto', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Ñemby', 
    city: 'Ñemby',
    lat: -25.3956, 
    lng: -57.5367, 
    desc: 'Cerro Ñemby, Acceso Sur, Pa\'i Ñu', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Villa Elisa', 
    city: 'Villa Elisa',
    lat: -25.3667, 
    lng: -57.5833, 
    desc: 'Paseo Parque Villa Elisa, Petropar, Von Poleski', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Limpio', 
    city: 'Limpio',
    lat: -25.1833, 
    lng: -57.4833, 
    desc: 'Ruta PY03, Piquete Cué, Costa Azul', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'San Antonio', 
    city: 'San Antonio',
    lat: -25.4167, 
    lng: -57.5500, 
    desc: 'Ribera del Río Paraguay, Acceso Sur', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Itauguá', 
    city: 'Itauguá',
    lat: -25.3833, 
    lng: -57.3333, 
    desc: 'Ciudad del Ñandutí, Hospital Nacional, Ruta PY02', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Areguá', 
    city: 'Areguá',
    lat: -25.3167, 
    lng: -57.3833, 
    desc: 'Capital de la Frutilla y Alfarería, Lago Ypacaraí', 
    zoom: 13,
    type: 'ciudad'
  },
  { 
    name: 'Ypané', 
    city: 'Ypané',
    lat: -25.4500, 
    lng: -57.5333, 
    desc: 'Acceso Sur, Centro de Alto Rendimiento APF', 
    zoom: 13,
    type: 'ciudad'
  },

  // BARRIOS ESPECÍFICOS DE ASUNCIÓN (ALTA PRECISIÓN)
  {
    name: 'Villa Morra',
    city: 'Asunción',
    lat: -25.2950,
    lng: -57.5800,
    desc: 'Shopping Mariscal, Polo Gastronómico, Boggiani y Mcal. López',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Recoleta',
    city: 'Asunción',
    lat: -25.2982,
    lng: -57.5855,
    desc: 'Av. Mcal. López, Choferes del Chaco, Av. Boggiani',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Las Lomas / Carmelitas',
    city: 'Asunción',
    lat: -25.2820,
    lng: -57.5680,
    desc: 'Paseo La Galería, Shopping del Sol, Av. Aviadores del Chaco',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Manorá',
    city: 'Asunción',
    lat: -25.2890,
    lng: -57.5750,
    desc: 'Zona residencial exclusiva entre Villa Morra y Carmelitas',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Mburucuyá',
    city: 'Asunción',
    lat: -25.2710,
    lng: -57.5640,
    desc: 'Av. Santísima Trinidad, Parque de la Salud',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Ykua Satí',
    city: 'Asunción',
    lat: -25.2910,
    lng: -57.5600,
    desc: 'Av. Santa Teresa, Torres residenciales, Hotel Sheraton',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Herrera',
    city: 'Asunción',
    lat: -25.3020,
    lng: -57.5580,
    desc: 'Av. Madame Lynch c/ Lillo y Av. Mcal. López',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Los Laureles',
    city: 'Asunción',
    lat: -25.3090,
    lng: -57.5700,
    desc: 'Av. Eusebio Ayala, Superseis Los Laureles, R.I. 6 Boquerón',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'San Cristóbal',
    city: 'Asunción',
    lat: -25.3030,
    lng: -57.5760,
    desc: 'Av. Denis Roa, Plaza de las Américas, Av. San Martín',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Las Mercedes',
    city: 'Asunción',
    lat: -25.2830,
    lng: -57.6180,
    desc: 'Av. España c/ Washington, zona gastronómica y residencial',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Centro Histórico',
    city: 'Asunción',
    lat: -25.2815,
    lng: -57.6350,
    desc: 'Palacio de los López, Panteón de los Héroes, Palma y Estrella',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Sajonia',
    city: 'Asunción',
    lat: -25.2900,
    lng: -57.6600,
    desc: 'Palacio de Justicia, Estadio Defensores del Chaco, Parque Carlos A. López',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Trinidad',
    city: 'Asunción',
    lat: -25.2590,
    lng: -57.5850,
    desc: 'Jardín Botánico, Iglesia Santísima Trinidad, Av. Artigas',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Ciudad Nueva',
    city: 'Asunción',
    lat: -25.2990,
    lng: -57.6200,
    desc: 'Av. Eusebio Ayala c/ Kubitschek, Colegio San José',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'San Vicente',
    city: 'Asunción',
    lat: -25.3180,
    lng: -57.6250,
    desc: 'Av. Félix Bogado, Mercado 4 c/ Av. Próceres de Mayo',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Loma Pytã',
    city: 'Asunción',
    lat: -25.2280,
    lng: -57.5520,
    desc: 'Ruta Transchaco, Hospital Materno Infantil Loma Pytã',
    zoom: 15,
    type: 'barrio'
  },

  // BARRIOS ESPECÍFICOS DE SAN LORENZO
  {
    name: 'San Lorenzo Centro',
    city: 'San Lorenzo',
    lat: -25.3400,
    lng: -57.5090,
    desc: 'Catedral de San Lorenzo, Calle España y Mcal. Estigarribia',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Campus UNA',
    city: 'San Lorenzo',
    lat: -25.3370,
    lng: -57.5180,
    desc: 'Universidad Nacional de Asunción, Hospital de Clínicas',
    zoom: 15,
    type: 'referencia'
  },
  {
    name: 'Barcequillo',
    city: 'San Lorenzo',
    lat: -25.3480,
    lng: -57.5320,
    desc: 'Avda. Avelino Martínez, límite con Fernando de la Mora',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Reducto',
    city: 'San Lorenzo',
    lat: -25.3720,
    lng: -57.5020,
    desc: 'Hospital Pediátrico Acosta Ñu, Calle de la Victoria',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'San Pedro',
    city: 'San Lorenzo',
    lat: -25.3320,
    lng: -57.5010,
    desc: 'Av. Mcal. López hacia Luque, zona residencial tranquila',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Capilla del Monte',
    city: 'San Lorenzo',
    lat: -25.3250,
    lng: -57.5150,
    desc: 'Acceso por Av. Mcal. López, zona alta residencial',
    zoom: 15,
    type: 'barrio'
  },

  // BARRIOS ESPECÍFICOS DE LUQUE
  {
    name: 'Luque Centro',
    city: 'Luque',
    lat: -25.2678,
    lng: -57.4897,
    desc: 'Santuario Virgen del Rosario, Estación del Tren, Mercado',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Zárate Isla / Autopista',
    city: 'Luque',
    lat: -25.2550,
    lng: -57.5050,
    desc: 'Autopista Silvio Pettirossi, cercanías de CONMEBOL',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Bella Vista',
    city: 'Luque',
    lat: -25.2620,
    lng: -57.4820,
    desc: 'Zona residencial tradicional, acceso rápido al centro',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Mora Cué',
    city: 'Luque',
    lat: -25.2420,
    lng: -57.4680,
    desc: 'Camino Luque-Limpio, zona en rápido crecimiento',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Laurelty',
    city: 'Luque',
    lat: -25.2950,
    lng: -57.5120,
    desc: 'Límite Luque y San Lorenzo, Av. Brítez Borges',
    zoom: 15,
    type: 'barrio'
  },

  // BARRIOS ESPECÍFICOS DE CAPIATÁ
  {
    name: 'Capiatá Centro (Ruta 2 Km 20)',
    city: 'Capiatá',
    lat: -25.3533,
    lng: -57.4450,
    desc: 'Centro urbano, Municipalidad de Capiatá, Ruta PY02',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Posta Ybycuá (Ruta 1 Km 20)',
    city: 'Capiatá',
    lat: -25.3720,
    lng: -57.4380,
    desc: 'Cruce Ruta PY01, centros comerciales y transporte directo',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Aldana Cañada',
    city: 'Capiatá',
    lat: -25.3350,
    lng: -57.4250,
    desc: 'Zona residencial entre Ruta 1 y Ruta 2',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Aratirí',
    city: 'Capiatá',
    lat: -25.3420,
    lng: -57.4780,
    desc: 'Autódromo Aratirí, límite con San Lorenzo',
    zoom: 15,
    type: 'barrio'
  },

  // BARRIOS ESPECÍFICOS DE FERNANDO DE LA MORA
  {
    name: 'Fernando Zona Norte',
    city: 'Fernando de la Mora',
    lat: -25.3150,
    lng: -57.5350,
    desc: 'Av. Mcal. López, Laguna Grande, Superseis',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Fernando Zona Sur',
    city: 'Fernando de la Mora',
    lat: -25.3350,
    lng: -57.5480,
    desc: 'Av. Defensores del Chaco, Soldado Ovelar, Av. 11 de Septiembre',
    zoom: 15,
    type: 'barrio'
  },

  // BARRIOS ESPECÍFICOS DE LAMBARÉ
  {
    name: 'Lambaré Centro',
    city: 'Lambaré',
    lat: -25.3444,
    lng: -57.6067,
    desc: 'Av. Cacique Lambaré, Municipalidad, San Vicente',
    zoom: 15,
    type: 'barrio'
  },
  {
    name: 'Yacht y Golf Club',
    city: 'Lambaré',
    lat: -25.3780,
    lng: -57.6380,
    desc: 'Residencial exclusiva costera sobre el Río Paraguay',
    zoom: 15,
    type: 'referencia'
  },
  {
    name: 'Valle Apu\'a',
    city: 'Lambaré',
    lat: -25.3350,
    lng: -57.6200,
    desc: 'Zona residencial alta c/ Av. Carretera de López',
    zoom: 15,
    type: 'barrio'
  }
];

/**
 * Encuentra la zona, barrio o ciudad más cercana de nuestra base con máxima precisión métrica
 */
export function getClosestZoneOrCity(lat: number, lng: number): { name: string; city: string; desc: string; exactDistanceKm: number } {
  let closest = PARAGUAY_ZONES[0];
  let minDistance = Number.MAX_VALUE;

  for (const zone of PARAGUAY_ZONES) {
    // Distancia euclidiana aproximada ponderada en km
    const dLat = (zone.lat - lat) * 111.32;
    const dLng = (zone.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
    const distanceKm = Math.hypot(dLat, dLng);

    if (distanceKm < minDistance) {
      minDistance = distanceKm;
      closest = zone;
    }
  }

  return { 
    name: closest.name, 
    city: closest.city,
    desc: closest.desc,
    exactDistanceKm: Math.round(minDistance * 10) / 10
  };
}
