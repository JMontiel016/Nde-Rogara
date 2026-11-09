import { Property, PaymentItem, RentalContract, LandlordRental, AppNotification } from '../types';

export const INITIAL_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    title: 'Departamento en Asunción',
    type: 'Departamento',
    city: 'Asunción',
    neighborhood: 'Barrio Recoleta',
    address: 'Av. Mariscal López c/ Choferes del Chaco',
    priceMonth: 3500000,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpots: 1,
    areaM2: 78,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Hermoso y moderno departamento en el corazón de Recoleta. Amplia sala estar, balcón con vista despejada, cocina equipada con anafe y extractor. Edificio con seguridad 24 hs, quincho panorámico y piscina.',
    features: ['Cocina equipada', 'Aire acondicionado', 'Balcón', 'Piscina', 'Lavandería', 'Seguridad 24hs'],
    expenses: {
      buildingFees: 450000,
      water: 'Incluida',
      internet: 'No incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: 'Inmediata',
    requirements: [
      'Cédula de Identidad vigente',
      'Comprobante de ingresos (últimos 3 meses)',
      'Garante o codeudor con ingresos demostrables',
      'Mes de alquiler por adelantado + 1 mes de depósito en garantía'
    ],
    lat: -25.2982,
    lng: -57.5855,
    ownerName: 'Carlos González',
    ownerPhone: '+595981123456',
    ownerEmail: 'carlos.gonzalez@nderogara.com.py',
    discountPercent: 15,
    discountedPrice: 2975000,
    discountBadge: '🔥 Rebaja 15% OFF (Primeros 6 meses)'
  },
  {
    id: 'prop-2',
    title: 'Casa en Luque',
    type: 'Casa',
    city: 'Luque',
    neighborhood: 'Zona Centro',
    address: 'Calle Corrales c/ Gral. Aquino',
    priceMonth: 4000000,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpots: 2,
    areaM2: 185,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Residencia familiar espaciosa en zona residencial tranquila de Luque. Cuenta con amplio patio empastado, quincho con parrilla, portón basculante automático, 3 habitaciones con placares y cocina amoblada.',
    features: ['Patio', 'Parrilla / Quincho', 'Mascotas permitidas', 'Aire acondicionado', 'Estacionamiento 2 autos'],
    expenses: {
      buildingFees: 0,
      water: 'No incluida',
      internet: 'No incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: 'Inmediata',
    requirements: [
      'Documento de identidad',
      'Certificado de trabajo o IVA',
      'Garantía firmada',
      'Depósito reembolsable'
    ],
    lat: -25.2678,
    lng: -57.4878,
    ownerName: 'Carlos González',
    ownerPhone: '+595981123456',
    ownerEmail: 'carlos.gonzalez@nderogara.com.py'
  },
  {
    id: 'prop-3',
    title: 'Departamento en San Lorenzo',
    type: 'Departamento',
    city: 'San Lorenzo',
    neighborhood: 'Barrio Aurora',
    address: 'Av. Del Agrónomo c/ Manuel Ortiz Guerrero',
    priceMonth: 2500000,
    bedrooms: 2,
    bathrooms: 1,
    parkingSpots: 1,
    areaM2: 65,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1502005229762-ee1b2b8ab00f?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Moderno departamento en excelente ubicación, a pocos minutos de la Universidad Nacional de Asunción (UNA). Cuenta con 2 dormitorios, sala-comedor, cocina equipada, balcón y estacionamiento. Ideal para familias o estudiantes universitarios.',
    features: [
      'Cocina equipada',
      'Aire acondicionado',
      'Balcón',
      'Lavandería',
      'Mascotas permitidas',
      'Internet'
    ],
    expenses: {
      buildingFees: 300000,
      water: 'Incluida',
      internet: 'No incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: '01/10/2026',
    requirements: [
      'Documento de identidad',
      'Comprobante de ingresos',
      'Garantía',
      'Depósito'
    ],
    lat: -25.3392,
    lng: -57.5147,
    ownerName: 'Carlos González',
    ownerPhone: '+595981123456',
    ownerEmail: 'carlos.gonzalez@nderogara.com.py',
    discountPercent: 20,
    discountedPrice: 2000000,
    discountBadge: '⭐ Expensas bonificadas + 20% OFF'
  },
  {
    id: 'prop-4',
    title: 'Local comercial en Fernando de la Mora',
    type: 'Local comercial',
    city: 'Fernando de la Mora',
    neighborhood: 'Centro',
    address: 'Ruta Mcal. Estigarribia e/ Zavala Cue',
    priceMonth: 5000000,
    bedrooms: 0,
    bathrooms: 1,
    parkingSpots: 2,
    areaM2: 120,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Excelente local comercial a pie de calle sobre avenida de altísimo flujo vehicular y peatonal. Vidriera blindex frontal, salón despejado, piso de porcelanato, baño sexado y estacionamiento frontal para clientes.',
    features: ['Vidriera blindex', 'Cortina metálica automática', 'Aire acondicionado central', 'Estacionamiento para clientes'],
    expenses: {
      buildingFees: 200000,
      water: 'Incluida',
      internet: 'No incluida',
      electricity: 'Medidor trifásico'
    },
    availableFrom: 'Inmediata',
    requirements: [
      'RUC activo con cumplimiento tributario',
      'Balance o declaraciones de IVA semestrales',
      'Contrato mínimo 12 meses renovable',
      'Garantía bancaria o codeudor'
    ],
    lat: -25.3214,
    lng: -57.5492,
    ownerName: 'Carlos González',
    ownerPhone: '+595981123456',
    ownerEmail: 'carlos.gonzalez@nderogara.com.py'
  },
  {
    id: 'prop-5',
    title: 'Casa en Fernando de la Mora',
    type: 'Casa',
    city: 'Fernando de la Mora',
    neighborhood: 'Zona Norte',
    address: 'Capitán Montiel c/ Tte. Ettiene',
    priceMonth: 3200000,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpots: 2,
    areaM2: 140,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1598228723793-52759bba239c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Casa en impecable estado de conservación en Zona Norte de Fernando de la Mora. 3 dormitorios (1 en suite), living comedor acogedor, patio trasero con césped, área de servicio independiente.',
    features: ['Patio', 'Mascotas permitidas', 'Estacionamiento 2 autos', 'Lavandería', 'Amoblado parcial'],
    expenses: {
      water: 'No incluida',
      internet: 'No incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: 'Inmediata',
    requirements: [
      'Documento de identidad',
      'Comprobante de ingresos',
      'Garantía codeudor',
      '1 mes de alquiler + 1 mes de depósito'
    ],
    lat: -25.3125,
    lng: -57.5412,
    ownerName: 'Inmobiliaria Central',
    ownerPhone: '+595982998877',
    ownerEmail: 'contacto@inmobiliaricentral.com.py'
  },
  {
    id: 'prop-6',
    title: 'Dúplex en Lambaré',
    type: 'Dúplex',
    city: 'Lambaré',
    neighborhood: 'Barrio Valle Apu\'a',
    address: 'Av. Cacique Lambaré c/ 1ro de Marzo',
    priceMonth: 3500000,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpots: 2,
    areaM2: 130,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Moderno dúplex a estrenar en Lambaré. Planta baja: cochera 2 vehículos, sala comedor integrada con cocina amoblada, baño social, galería con parrilla y patio. Planta alta: 3 habitaciones (1 en suite).',
    features: ['Patio', 'Parrilla / Quincho', 'Cocina equipada', 'Mascotas permitidas', 'Balcón'],
    expenses: {
      water: 'No incluida',
      internet: 'No incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: 'Inmediata',
    requirements: ['Cédula de Identidad', '3 últimas liquidaciones de salario', 'Depósito en garantía'],
    lat: -25.3441,
    lng: -57.6074,
    ownerName: 'Rodrigo Benítez',
    ownerPhone: '+595983445566',
    ownerEmail: 'rodrigo.benitez@gmail.com'
  },
  {
    id: 'prop-7',
    title: 'Oficina ejecutiva en Villa Morra',
    type: 'Oficina',
    city: 'Asunción',
    neighborhood: 'Villa Morra',
    address: 'Boggiani c/ Av. República Argentina',
    priceMonth: 4800000,
    bedrooms: 1,
    bathrooms: 2,
    parkingSpots: 1,
    areaM2: 85,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Oficina ejecutiva amoblada en piso corporativo de alta categoría. Sala de reuniones privada, recepción compartida, 2 despachos gerenciales y vista panorámica sobre Boggiani.',
    features: ['Amoblado', 'Aire acondicionado central', 'Seguridad 24hs', 'Internet fibra óptica', 'Balcón'],
    expenses: {
      buildingFees: 600000,
      water: 'Incluida',
      internet: 'Incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: 'Inmediata',
    requirements: ['RUC e informe tributario', 'Garantía comercial', '2 meses de depósito'],
    lat: -25.2931,
    lng: -57.5741,
    ownerName: 'Torre Boggiani Corp',
    ownerPhone: '+595981776655',
    ownerEmail: 'administracion@torreboggiani.com'
  },
  {
    id: 'prop-8',
    title: 'Habitación privada en Las Mercedes',
    type: 'Habitación',
    city: 'Asunción',
    neighborhood: 'Las Mercedes',
    address: 'Padre Cardozo c/ Washington',
    priceMonth: 1200000,
    bedrooms: 1,
    bathrooms: 1,
    parkingSpots: 0,
    areaM2: 25,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1540518614846-7ede433c4ef0?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Habitación independiente en residencia universitaria / profesional en el barrio Las Mercedes. Totalmente amoblada con cama de 1.5 plazas, placard, escritorio, aire acondicionado y baño privado.',
    features: ['Amoblado', 'Aire acondicionado', 'Internet', 'Lavandería compartida'],
    expenses: {
      buildingFees: 0,
      water: 'Incluida',
      internet: 'Incluida',
      electricity: 'Incluida'
    },
    availableFrom: 'Inmediata',
    requirements: ['Documento de identidad', 'Comprobante de estudios o ingresos'],
    lat: -25.2818,
    lng: -57.6189,
    ownerName: 'Marta Villalba',
    ownerPhone: '+595982112233',
    ownerEmail: 'marta.villalba@gmail.com'
  },
  {
    id: 'prop-9',
    title: 'Casa Residencial en Capiatá',
    type: 'Casa',
    city: 'Capiatá',
    neighborhood: 'Ruta 2 Km 20',
    address: 'Av. Capiatá c/ Ruta PY02',
    priceMonth: 2200000,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpots: 2,
    areaM2: 160,
    isVerified: false,
    images: [
      'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1000&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1000&q=80'
    ],
    description: 'Hermosa casa familiar en Capiatá, a pasos de la Ruta 2. Gran patio empastado, quincho con parrilla, 3 dormitorios, cocina amoblada y estacionamiento para 2 vehículos.',
    features: ['Patio', 'Parrilla / Quincho', 'Mascotas permitidas', 'Estacionamiento 2 autos'],
    expenses: {
      water: 'No incluida',
      internet: 'No incluida',
      electricity: 'Medidor independiente'
    },
    availableFrom: 'Inmediata',
    requirements: ['Documento de identidad', 'Comprobante de ingresos', '1 mes de depósito'],
    lat: -25.3533,
    lng: -57.4450,
    ownerName: 'Juan Carlos Benítez',
    ownerPhone: '+595981998811',
    ownerEmail: 'juancarlos@email.com'
  }
];

export const INITIAL_TENANT_PAYMENTS: PaymentItem[] = [
  {
    id: 'pay-1',
    month: 'Mayo 2026',
    dueDate: '05/05/2026',
    amount: 2500000,
    status: 'Pagado',
    paymentDate: '04/05/2026',
    receiptNumber: 'REC-2026-05-0941',
    paymentMethod: 'Transferencia Bancaria',
    notes: 'Pago recibido a través de SIPAP Banco Continental'
  },
  {
    id: 'pay-2',
    month: 'Junio 2026',
    dueDate: '05/06/2026',
    amount: 2500000,
    status: 'Pagado',
    paymentDate: '05/06/2026',
    receiptNumber: 'REC-2026-06-1402',
    paymentMethod: 'Transferencia Bancaria',
    notes: 'Pago puntual acreditado en cuenta'
  },
  {
    id: 'pay-3',
    month: 'Julio 2026',
    dueDate: '05/07/2026',
    amount: 2500000,
    status: 'Pagado',
    paymentDate: '03/07/2026',
    receiptNumber: 'REC-2026-07-2198',
    paymentMethod: 'Transferencia Bancaria',
    notes: 'Pago acreditado con anticipación'
  },
  {
    id: 'pay-4',
    month: 'Agosto 2026',
    dueDate: '05/08/2026',
    amount: 2500000,
    status: 'Pagado',
    paymentDate: '04/08/2026',
    receiptNumber: 'REC-2026-08-3012',
    paymentMethod: 'Transferencia Bancaria',
    notes: 'Cuota de agosto abonada en fecha'
  },
  {
    id: 'pay-5',
    month: 'Septiembre 2026',
    dueDate: '05/09/2026',
    amount: 2500000,
    status: 'Pagado',
    paymentDate: '03/09/2026',
    receiptNumber: 'REC-2026-09-4155',
    paymentMethod: 'Transferencia Bancaria',
    notes: 'Cuota del mes en curso cancelada con éxito'
  },
  {
    id: 'pay-6',
    month: 'Octubre 2026',
    dueDate: '05/10/2026',
    amount: 2500000,
    status: 'Próximo',
    notes: 'Cuota programada para el próximo vencimiento'
  }
];

export const INITIAL_CONTRACT: RentalContract = {
  id: 'CTR-2026-SANLORENZO',
  propertyId: 'prop-3',
  propertyTitle: 'Departamento en San Lorenzo (Pieza / Habitación amoblada)',
  propertyType: 'Pieza / Departamento 1 Habitación',
  propertyImage: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=600&q=80',
  city: 'San Lorenzo',
  neighborhood: 'Barrio Aurora',
  propertyAddress: 'San Lorenzo, Barrio Aurora - Av. Del Agrónomo c/ Manuel Ortiz Guerrero',
  tenantName: 'Juan Pérez',
  tenantDocument: 'C.I. 4.892.140',
  landlordName: 'Carlos González',
  landlordDocument: 'C.I. 3.124.958',
  monthlyAmount: 2500000,
  dueDay: 5,
  startDate: '01/01/2026',
  endDate: '31/12/2026',
  depositAmount: 2500000,
  guarantorName: 'Esteban Bogado (C.I. 2.941.023)',
  isAuthorized: true,
  status: 'Autorizado',
  features: ['1 Dormitorio / Pieza espaciosa', '1 Baño privado', 'Cocina integrada equipada', 'Balcón con vista abierta'],
  expenses: {
    water: 'Incluida en el alquiler',
    electricity: 'Medidor independiente ANDE',
    internet: 'Fibra óptica Wi-Fi incluida',
    buildingFees: 300000
  },
  clauses: [
    'PRIMERA - OBJETO: El LOCADOR cede en locación al LOCATARIO el inmueble individualizado como Departamento / Habitación N° 302 ubicado en Barrio Aurora, San Lorenzo, destinado exclusivamente a vivienda.',
    'SEGUNDA - PRECIO Y PAGO: El alquiler mensual pactado es de Gs. 2.500.000 (Guaraníes dos millones quinientos mil), pagadero del 1 al 5 de cada mes calendario.',
    'TERCERA - PLAZO: El plazo de vigencia del presente contrato es de doce (12) meses, comenzando a regir el 01/01/2026 y finalizando indefectiblemente el 31/12/2026.',
    'CUARTA - SERVICIOS Y EXPENSAS: El servicio de agua potable e internet están comprendidos dentro del canon. La energía eléctrica (ANDE) y las expensas ordinarias de Gs. 300.000 corren por cuenta del LOCATARIO.',
    'QUINTA - DEPÓSITO DE GARANTÍA: El LOCATARIO entrega en este acto la suma de Gs. 2.500.000 en concepto de depósito en garantía, que será devuelto al finalizar el contrato previa verificación del estado del inmueble.',
    'SEXTA - JURISDICCIÓN: Para todos los efectos legales emergentes del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la República del Paraguay.'
  ]
};

export const INITIAL_LANDLORD_RENTALS: LandlordRental[] = [
  {
    id: 'lr-1',
    tenantName: 'Juan Pérez',
    tenantPhone: '+595981765432',
    propertyId: 'prop-3',
    propertyTitle: 'Departamento en San Lorenzo (Pieza / Habitación)',
    propertyType: 'Pieza / Departamento 1 Habitación',
    location: 'San Lorenzo, Barrio Aurora',
    contractEndDate: '31/12/2026',
    monthlyAmount: 2500000,
    nextPaymentDate: '05/10/2026',
    status: 'Próximo',
    lastPaymentDate: '03/09/2026'
  },
  {
    id: 'lr-2',
    tenantName: 'María López',
    tenantPhone: '+595971234890',
    propertyId: 'prop-2',
    propertyTitle: 'Casa en Luque (Residencial)',
    propertyType: 'Casa Familiar 3 Dormitorios',
    location: 'Luque, Cuarto Barrio',
    contractEndDate: '15/11/2026',
    monthlyAmount: 3000000,
    nextPaymentDate: '10/10/2026',
    status: 'Pagado',
    lastPaymentDate: '28/08/2026'
  },
  {
    id: 'lr-3',
    tenantName: 'Carlos Díaz',
    tenantPhone: '+595991876543',
    propertyId: 'prop-4',
    propertyTitle: 'Local comercial en Fernando',
    propertyType: 'Local comercial 65 m²',
    location: 'Fernando de la Mora, Zona Norte',
    contractEndDate: '01/09/2026',
    monthlyAmount: 4000000,
    nextPaymentDate: '01/10/2026',
    status: 'Vencido',
    lastPaymentDate: '01/08/2026'
  }
];

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_USERS: import('../types').UserProfile[] = [
  {
    id: 'usr-tenant',
    name: 'Ana Pérez',
    email: 'ana@email.com',
    password: '', // Identidad ilustrativa; nunca credenciales reales.,
    role: 'tenant',
    phone: '+595 981 765 432',
    documentNumber: '4.567.890',
    city: 'Asunción',
    address: 'Av. Mariscal López c/ Choferes del Chaco',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    status: 'active'
  },
  {
    id: 'usr-landlord',
    name: 'Carlos González',
    email: 'carlos@nderogara.com.py',
    password: '', // Identidad ilustrativa; nunca credenciales reales.,
    role: 'landlord',
    phone: '+595 981 123 456',
    documentNumber: '2.345.678',
    city: 'Luque',
    address: 'Calle Corrales c/ Gral. Aquino 1420',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=120&q=80',
    status: 'active'
  },
  {
    id: 'usr-agency',
    name: 'Inmobiliaria Ejemplo',
    email: 'contacto@inmobiliariaejemplo.com.py',
    password: '', // Identidad ilustrativa; nunca credenciales reales.,
    role: 'agency',
    phone: '+595 21 600 700',
    documentNumber: '80012345-6',
    city: 'Asunción',
    address: 'Av. Santa Teresa 2106 c/ Aviadores del Chaco',
    organization: 'Inmobiliaria Ejemplo S.A.',
    agencyTaxId: '80012345-6',
    agencyRegistration: 'REG-PY-2024-88',
    agencyDirectorName: 'Lic. Fernando Benítez',
    agencyDirectorPhone: '+595 981 445 522',
    agencyDirectorEmail: 'fernando.benitez@inmobiliariaejemplo.com.py',
    agencyDefaultCommission: 50,
    agencyOperatingExpenseLimit: 500000,
    avatar: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=120&q=80',
    status: 'active'
  },
  {
    id: 'usr-admin',
    name: 'Administrador del Sistema Nde Rogarã',
    email: 'admin@nderogara.com.py',
    password: '', // Identidad ilustrativa; nunca credenciales reales.,
    role: 'admin',
    phone: '+595 21 445 566',
    documentNumber: '1.234.567',
    city: 'Asunción',
    address: 'Sede Central Nde Rogarã, Asunción',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
    status: 'active'
  }
];

export const INITIAL_SMTP_CONFIG: import('../types').SmtpConfig = {
  senderName: 'Alquileres PY',
  senderEmail: 'avisos@example.com',
  replyToEmail: 'respuestas@example.com',
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  security: 'TLS',
  password: '••••••••••••',
  isConfigured: true
};

export const INITIAL_REMINDERS: import('../types').ReminderSetting[] = [
  { id: 'rem-1', event: '7 días antes', emailEnabled: true, internalEnabled: true },
  { id: 'rem-2', event: '3 días antes', emailEnabled: true, internalEnabled: true },
  { id: 'rem-3', event: 'Día del vencimiento', emailEnabled: true, internalEnabled: true },
  { id: 'rem-4', event: 'Pago confirmado', emailEnabled: true, internalEnabled: true }
];

export const INITIAL_EMAIL_LOGS: import('../types').EmailLog[] = [
  { id: 'log-1', status: 'Enviado', date: '02/10/2026 10:24', recipient: 'ana@email.com', subject: 'Aviso de vencimiento próximo' },
  { id: 'log-2', status: 'Enviado', date: '27/09/2026 09:15', recipient: 'ana@email.com', subject: 'Comprobante de cuota procesado' },
  { id: 'log-3', status: 'Fallido', date: '20/09/2026 14:03', recipient: 'inquilino@test.com', subject: 'Error de entrega SMTP' },
  { id: 'log-4', status: 'Enviado', date: '10/09/2026 08:50', recipient: 'carlos@test.com', subject: 'Confirmación de alquiler' },
  { id: 'log-5', status: 'Fallido', date: '03/09/2026 16:12', recipient: 'contacto@mail.com', subject: 'Conexión rechazada por servidor' }
];

export const INITIAL_REPRESENTED_OWNERS: import('../types').RepresentedOwner[] = [
  { id: 'ro-1', name: 'Carlos Gómez', propertyCount: 5, phone: '+595 981 111 222', email: 'carlos.gomez@gmail.com' },
  { id: 'ro-2', name: 'Marta López', propertyCount: 3, phone: '+595 982 333 444', email: 'marta.lopez@gmail.com' },
  { id: 'ro-3', name: 'Luis Fernández', propertyCount: 2, phone: '+595 983 555 666', email: 'luis.fernandez@gmail.com' }
];

export const INITIAL_AGENTS: import('../types').AgencyAgent[] = [
  {
    id: 'ag-1',
    name: 'María González',
    documentId: '3.842.190',
    phone: '+595 981 450 789',
    email: 'maria.gonzalez@inmobiliariaejemplo.com.py',
    roleTitle: 'Agente Comercial Senior',
    status: 'Activo',
    commissionRate: 12, // 12% sobre operaciones
    permissions: {
      viewAssignedProperties: true,
      manageVisits: true,
      reviewInquiries: true,
      confirmPayments: true,
      manageContracts: true
    },
    assignedProperties: ['Departamento 204', 'Casa en San Lorenzo', 'Dúplex en Villa Morra'],
    stats: {
      totalRevenue: 28500000,     // Gs. 28.500.000 generados en alquileres cobrados
      commissionEarned: 3420000,  // Gs. 3.420.000 (12%)
      closedContracts: 4,         // 4 contratos vigentes cerrados
      activeVisits: 6,            // 6 visitas agendadas este mes
      inquiriesHandled: 15        // 15 consultas atendidas
    }
  },
  {
    id: 'ag-2',
    name: 'Pedro Ramírez',
    documentId: '4.105.872',
    phone: '+595 971 889 012',
    email: 'pedro.ramirez@inmobiliariaejemplo.com.py',
    roleTitle: 'Captador de Inmuebles y Locales',
    status: 'Activo',
    commissionRate: 10, // 10% sobre operaciones
    permissions: {
      viewAssignedProperties: true,
      manageVisits: true,
      reviewInquiries: true,
      confirmPayments: false,
      manageContracts: false
    },
    assignedProperties: ['Local comercial Fernando', 'Edificio Santa Teresa Piso 3'],
    stats: {
      totalRevenue: 18000000,     // Gs. 18.000.000 generados
      commissionEarned: 1800000,  // Gs. 1.800.000 (10%)
      closedContracts: 2,         // 2 contratos cerrados
      activeVisits: 3,            // 3 visitas coordinadas
      inquiriesHandled: 9         // 9 consultas atendidas
    }
  }
];

export const INITIAL_AGENT_EXPENSES: import('../types').AgentExpense[] = [
  {
    id: 'exp-1',
    agentId: 'ag-1',
    agentName: 'María González',
    category: 'Publicidad & Portales',
    description: 'Destacado premium en portal clasificados para Dúplex Villa Morra',
    amount: 350000,
    date: '14/09/2026',
    receiptNumber: 'FAC-001-002-4192'
  },
  {
    id: 'exp-2',
    agentId: 'ag-1',
    agentName: 'María González',
    category: 'Movilidad & Viáticos',
    description: 'Combustible para visitas a clientes en San Lorenzo y Fernando',
    amount: 180000,
    date: '12/09/2026',
    receiptNumber: 'FAC-002-001-8812'
  },
  {
    id: 'exp-3',
    agentId: 'ag-2',
    agentName: 'Pedro Ramírez',
    category: 'Mantenimiento & Cerrajería',
    description: 'Cambio de cerradura de seguridad y copias para Local comercial',
    amount: 220000,
    date: '10/09/2026',
    receiptNumber: 'FAC-001-003-1209'
  },
  {
    id: 'exp-4',
    agentId: 'ag-2',
    agentName: 'Pedro Ramírez',
    category: 'Gestión Notarial',
    description: 'Certificación de firmas de contrato de locación comercial',
    amount: 250000,
    date: '08/09/2026',
    receiptNumber: 'FAC-005-001-0491'
  }
];

export const INITIAL_AGENT_ACTIVITY_LOGS: import('../types').AgentActivityLog[] = [
  {
    id: 'act-1',
    agentId: 'ag-1',
    agentName: 'María González',
    action: 'Autorizó adquisición de alquiler',
    target: 'Departamento 204 (Gs. 2.500.000/mes)',
    date: '15/09/2026 11:30',
    badgeType: 'success'
  },
  {
    id: 'act-2',
    agentId: 'ag-1',
    agentName: 'María González',
    action: 'Coordinó visita presencial con interesado',
    target: 'Casa en San Lorenzo',
    date: '14/09/2026 16:45',
    badgeType: 'info'
  },
  {
    id: 'act-3',
    agentId: 'ag-2',
    agentName: 'Pedro Ramírez',
    action: 'Registró cobro de alquiler mensual',
    target: 'Local comercial Fernando (Gs. 4.000.000)',
    date: '12/09/2026 10:15',
    badgeType: 'success'
  },
  {
    id: 'act-4',
    agentId: 'ag-2',
    agentName: 'Pedro Ramírez',
    action: 'Cargó comprobante de gasto operativo',
    target: 'Cerrajería Local Comercial (Gs. 220.000)',
    date: '10/09/2026 14:20',
    badgeType: 'warning'
  }
];

export const INITIAL_INTERNAL_MESSAGES: import('../types').InternalMessage[] = [
  {
    id: 'msg-1',
    senderName: 'Lucía Torres',
    senderPhone: '+595 981 654 321',
    propertyName: 'Departamento 204',
    unit: '204',
    assignedAgentId: 'ag-1',
    assignedAgentName: 'María González',
    creatorId: 'usr-landlord',
    date: '15 sep, 10:24',
    preview: '¿Podemos coordinar una visita para esta semana?',
    status: 'Pendiente',
    messages: [
      { sender: 'Lucía Torres', text: 'Hola, me interesa el departamento. ¿Podemos coordinar una visita para esta semana? Quedo atenta a su respuesta.', time: '10:24' }
    ]
  },
  {
    id: 'msg-2',
    senderName: 'Marcos Benítez',
    senderPhone: '+595 971 112 233',
    propertyName: 'Dúplex Villa Morra',
    unit: 'Dúplex B',
    assignedAgentId: 'ag-1',
    assignedAgentName: 'María González',
    creatorId: 'usr-landlord',
    date: '14 sep, 14:15',
    preview: 'Consulto si está disponible para mudanza inmediata.',
    status: 'En gestión',
    messages: [
      { sender: 'Marcos Benítez', text: 'Buenas tardes, ¿sigue disponible el dúplex para mudanza inmediata?', time: '14:15' }
    ]
  },
  {
    id: 'msg-3',
    senderName: 'Sofía Rojas',
    senderPhone: '+595 991 334 455',
    propertyName: 'Local comercial Fernando',
    unit: 'Salón 1',
    assignedAgentId: 'ag-2',
    assignedAgentName: 'Pedro Ramírez',
    creatorId: 'usr-agency',
    date: '12 sep, 09:30',
    preview: 'Me gustaría recibir más información sobre el local.',
    status: 'En gestión',
    messages: [
      { sender: 'Sofía Rojas', text: 'Buenas tardes, ¿cuáles son los requisitos de ingreso y garantía para el local?', time: '09:30' }
    ]
  }
];

export const INITIAL_REPORTS: import('../types').PlatformReport[] = [
  {
    id: 'PUB-001254',
    propertyTitle: 'Departamento 204',
    unit: '204',
    reason: 'Información incorrecta',
    status: 'Pendiente',
    date: '15/09/2026 10:24',
    responsible: 'Carlos (Propietario)',
    description: 'La descripción no coincide con lo publicado. Indica 3 habitaciones y en las fotos se observan solo 2.'
  },
  {
    id: 'PUB-001198',
    propertyTitle: 'Casa en San Lorenzo',
    unit: 'Principal',
    reason: 'Fotos engañosas',
    status: 'Resuelto',
    date: '14/09/2026 15:40',
    responsible: 'Marta (Propietario)',
    description: 'Fotos de archivo que no corresponden a la fachada actual.'
  },
  {
    id: 'PUB-000941',
    propertyTitle: 'Habitación céntrica',
    unit: 'Hab. 3',
    reason: 'Contenido inapropiado',
    status: 'Resuelto',
    date: '12/09/2026 11:20',
    responsible: 'Usuario particular',
    description: 'Texto con lenguaje inadecuado en los requisitos.'
  },
  {
    id: 'PUB-000832',
    propertyTitle: 'Oficina corporativa',
    unit: 'Piso 4',
    reason: 'Duplicada',
    status: 'Descartado',
    date: '10/09/2026 09:10',
    responsible: 'Inmobiliaria Ejemplo',
    description: 'Publicación duplicada por error de conexión.'
  }
];

export const INITIAL_AUDIT_LOGS: import('../types').AuditLogItem[] = [
  { id: 'aud-1', date: '15/09/2026 10:24', user: 'Ana', action: 'Actualizó publicación', resource: 'Publicación #PUB-001254' },
  { id: 'aud-2', date: '14/09/2026 16:10', user: 'Carlos', action: 'Cambió permiso', resource: 'Usuario #USR-000321' },
  { id: 'aud-3', date: '13/09/2026 09:42', user: 'Admin', action: 'Revisó reporte', resource: 'Reporte #RPT-000087' },
  { id: 'aud-4', date: '12/09/2026 14:18', user: 'Ana', action: 'Actualizó publicación', resource: 'Publicación #PUB-001198' },
  { id: 'aud-5', date: '10/09/2026 11:05', user: 'Carlos', action: 'Cambió permiso', resource: 'Usuario #USR-000210' }
];

export const INITIAL_NEARBY_PLACES: import('../types').NearbyPlace[] = [
  { id: 'nb-1', name: 'Supermercado Superseis Express', type: 'Supermercado', distance: '300 metros' },
  { id: 'nb-2', name: 'Farmacia Farmacenter 24hs', type: 'Farmacia', distance: '150 metros' },
  { id: 'nb-3', name: 'Parada Línea 30 / Línea 28', type: 'Parada de colectivo', distance: '50 metros' }
];

export const INITIAL_REVIEWS: import('../types').PropertyReview[] = [
  {
    id: 'rev-1',
    author: 'Ana Pérez',
    authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    date: '12 oct. 2026',
    rating: 5,
    comment: 'El lugar coincidía con la publicación. Excelente ubicación en Luque y muy buena atención del encargado.',
    isVerified: false,
    propertyTitle: 'Departamento 204',
    unit: '204',
    ownerReply: {
      text: '¡Gracias por tu comentario, Ana! Nos alegra que tu experiencia haya sido positiva y que disfrutes del departamento.',
      date: '13 oct. 2026'
    }
  }
];

export const INITIAL_VISIT_SCHEDULE: import('../types').VisitScheduleItem[] = [
  {
    id: 'vis-1',
    unit: 'Departamento 101',
    propertyTitle: 'Departamento 101',
    location: 'Luque, Central',
    dateTime: '15 oct. 2026 10:00',
    manager: 'Carlos Méndez',
    status: 'Confirmada'
  },
  {
    id: 'vis-2',
    unit: 'Departamento 204',
    propertyTitle: 'Departamento 204',
    location: 'Luque, Central',
    dateTime: '12 oct. 2026 15:00',
    manager: 'María López',
    status: 'Realizada'
  },
  {
    id: 'vis-3',
    unit: 'Departamento 303',
    propertyTitle: 'Departamento 303',
    location: 'Luque, Central',
    dateTime: '10 oct. 2026 11:30',
    manager: 'Carlos Méndez',
    status: 'Cancelada'
  },
  {
    id: 'vis-4',
    unit: 'Departamento 102',
    propertyTitle: 'Departamento 102',
    location: 'Luque, Central',
    dateTime: '18 oct. 2026 09:00',
    manager: 'María López',
    status: 'Confirmada'
  }
];

export const INITIAL_RENTAL_APPLICATIONS: import('../types').RentalApplication[] = [
  {
    id: 'app-1',
    propertyId: 'prop-3',
    propertyTitle: 'Departamento en San Lorenzo',
    propertyCity: 'San Lorenzo',
    propertyPrice: 2500000,
    tenantName: 'Ana Pérez',
    tenantPhone: '+595981765432',
    tenantDocument: 'C.I. 4.567.890',
    monthlyIncome: 6500000,
    occupation: 'Ingeniera de Software',
    moveInDate: '01/10/2026',
    message: 'Hola Carlos, me interesa formalizar el alquiler para mudarme a comienzos del próximo mes con mi pareja. Adjunto referencias laborales.',
    status: 'Aprobada',
    createdAt: '14 sep. 2026',
    contractGenerated: true
  },
  {
    id: 'app-2',
    propertyId: 'prop-1',
    propertyTitle: 'Departamento en Asunción',
    propertyCity: 'Asunción',
    propertyPrice: 3500000,
    tenantName: 'Marcos Benítez',
    tenantPhone: '+595971555444',
    tenantDocument: 'C.I. 3.998.112',
    monthlyIncome: 8000000,
    occupation: 'Contador Público',
    moveInDate: '15/10/2026',
    message: 'Buenas tardes, solicito el alquiler para oficina comercial y vivienda particular. Disponibilidad inmediata.',
    status: 'Pendiente',
    createdAt: '15 sep. 2026',
    contractGenerated: false
  }
];

export const INITIAL_CHAT_MESSAGES: import('../types').ChatMessage[] = [];


