/**
 * Archivo: types/index.ts
 * Módulo: Tipos y Modelos de Dominio
 * Propósito: Definición exhaustiva de interfaces TypeScript para los perfiles de usuario,
 * inmuebles, contratos, configuración de correo SMTP, gestión inmobiliaria y auditoría administrativa.
 */

export type PropertyType = 
  | 'Departamento' 
  | 'Casa' 
  | 'Habitación' 
  | 'Local comercial' 
  | 'Oficina' 
  | 'Dúplex'
  | 'Depósito'
  | (string & {}); // Permite otros tipos escritos por el propietario; no pierde el nombre real.

export type City = 
  | 'Asunción' 
  | 'San Lorenzo' 
  | 'Luque' 
  | 'Fernando de la Mora' 
  | 'Lambaré'
  | 'Capiatá'
  | 'Mariano Roque Alonso'
  | 'Ñemby'
  | 'Villa Elisa'
  | 'San Antonio'
  | 'Limpio'
  | 'Itauguá'
  | 'Areguá'
  | 'Ypané'
  | 'Ciudad del Este'
  | 'Encarnación'
  | (string & {});

export interface Property {
  id: string;
  title: string;
  type: PropertyType;
  city: City;
  neighborhood: string;
  address: string;
  priceMonth: number; // in Guaraníes (Gs.)
  bedrooms: number;
  bathrooms: number;
  parkingSpots: number;
  areaM2: number;
  isVerified: boolean;
  /** Momento en que el administrador aprobó y revisó este inmueble. */
  verifiedAt?: string;
  images: string[];
  videos?: string[]; // Referencias de videos del inmueble (almacenamiento local o URL segura)
  ownerInstagram?: string;
  ownerFacebook?: string;
  /** Contactos alternativos públicos para el anuncio; pueden editarse por inmueble. */
  ownerPhoneName?: string; // Persona que responde el WhatsApp principal
  ownerPhone2?: string;
  ownerPhone2Name?: string;
  ownerPublicEmail?: string;
  ownerAvatar?: string;
  ownerTiktok?: string;
  ownerYoutube?: string;
  ownerWebsite?: string;
  description: string;
  features: string[];
  expenses: {
    buildingFees?: number;
    water: 'Incluida' | 'No incluida';
    internet: 'Incluida' | 'No incluida';
    electricity: 'Medidor independiente' | 'Incluida' | 'Medidor trifásico';
  };
  availableFrom: string;
  requirements: string[];
  lat: number;
  lng: number;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  ownerId?: string; // Identificador del propietario que creó el aviso
  requiresActivePlan?: boolean; // Aviso nuevo: se oculta al vencer su suscripción
  discountPercent?: number;
  discountedPrice?: number;
  discountBadge?: string;
  furnishingStatus?: string;
  petPolicy?: string;
  depositWarranty?: string;
  propertyFloors?: number;
  nearbyPlaces?: string[];
  rentalAllowedRules?: string[]; // Condiciones de uso permitidas informadas por el propietario
  rentalProhibitedRules?: string[]; // Restricciones informadas por el propietario
  contactHours?: string;
  moderationStatus?: 'approved' | 'flagged' | 'removed';
  moderationReason?: string;
  moderatedAt?: string;
  createdAt?: string;
  isActive?: boolean; // true por defecto; si es false, está inactivo/pausado y oculto del catálogo público
}

export interface PaymentItem {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  status: 'Pagado' | 'Pendiente' | 'Próximo' | 'Vencido' | 'En revisión';
  paymentDate?: string;
  receiptNumber?: string;
  paymentMethod?: 'Transferencia Bancaria' | 'Tarjeta Débito/Crédito' | 'Efectivo';
  receiptFile?: string; // Nombre o URL de comprobante adjunto PDF
  rejectionReason?: string; // Motivo obligatorio en caso de rechazo
  notes?: string;
}

export interface RentalContract {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyType?: string;
  propertyImage?: string;
  city?: string;
  neighborhood?: string;
  propertyAddress: string;
  tenantName: string;
  tenantDocument: string;
  landlordName: string;
  landlordDocument: string;
  monthlyAmount: number;
  dueDay: number;
  startDate: string;
  endDate: string;
  depositAmount: number;
  guarantorName: string;
  clauses: string[];
  documents?: { name: string; size: string; date: string }[];
  isAuthorized?: boolean;
  authorizedAt?: string;
  status?: 'Pendiente de autorización' | 'Autorizado' | 'Enviado' | 'Activo' | 'Finalizado' | 'Vencido';
  features?: string[];
  expenses?: {
    water?: string;
    electricity?: string;
    internet?: string;
    buildingFees?: number;
  };
}

export interface LandlordRental {
  id: string;
  tenantName: string;
  tenantPhone: string;
  propertyId: string;
  propertyTitle: string;
  propertyType?: string;
  location?: string;
  contractEndDate?: string;
  monthlyAmount: number;
  nextPaymentDate: string;
  status: 'Pagado' | 'Próximo' | 'Vencido' | 'Finalizado';
  lastPaymentDate?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: 'Pagos' | 'Recordatorios' | 'Sistema' | 'Consultas' | 'Propiedades';
  dateText: string;
  read: boolean;
  type: 'reminder' | 'success' | 'alert' | 'message';
  senderName?: string;
  senderPhone?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  propertyTitle?: string;
}

// Perfiles del sistema según documento de tesis e imágenes
export type UserRole = 
  | 'visitor'      // Visitante no autenticado
  | 'tenant'       // Inquilino / Interesado
  | 'landlord'     // Propietario particular
  | 'agency'       // Inmobiliaria
  | 'admin';       // Administrador de AlquiPy

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  password?: string;
  policyAcceptedAt?: string;
  role: UserRole;
  phone?: string;
  documentNumber?: string;
  city?: string;
  address?: string;
  avatar?: string;
  /** Datos públicos opcionales: el correo de acceso no se modifica. */
  publicContactEmail?: string;
  whatsapp1Name?: string; // Nombre público del primer contacto
  whatsapp2?: string;
  whatsapp2Name?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  organization?: string;
  status?: 'active' | 'inactive';
  /** Estado disciplinario de la demostración local; no reemplaza el bloqueo en Firebase. */
  restrictionStage?: 'suspended' | 'blocked';
  confirmedViolations?: number;
  agencyTaxId?: string;
  agencyRegistration?: string;
  agencyDirectorName?: string;
  agencyDirectorPhone?: string;
  agencyDirectorEmail?: string;
  agencyDefaultCommission?: number;
  agencyOperatingExpenseLimit?: number;
  bankName?: string;
  bankAccount?: string;
}



// Configuración de Correo SMTP del Anunciante (Pantalla 25)
export interface SmtpConfig {
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  smtpHost: string;
  smtpPort: number;
  security: 'TLS' | 'SSL' | 'Ninguna';
  password: string;
  isConfigured: boolean;
}

// Configuración de Recordatorios y Eventos (Pantalla 26)
export interface ReminderSetting {
  id: string;
  event: string;
  emailEnabled: boolean;
  internalEnabled: boolean;
}

export interface EmailLog {
  id: string;
  status: 'Enviado' | 'Fallido';
  date: string;
  recipient: string;
  subject: string;
}

// Gestión Inmobiliaria (Pantallas Gestión Inmobiliaria)
export interface RepresentedOwner {
  id: string;
  name: string;
  propertyCount: number;
  phone: string;
  email: string;
}

export interface AgencyAgent {
  id: string;
  name: string;
  documentId?: string;
  phone?: string;
  email?: string;
  roleTitle: string;
  commissionRate?: number;
  status: 'Activo' | 'Inactivo';
  permissions: {
    viewAssignedProperties: boolean;
    manageVisits: boolean;
    reviewInquiries: boolean;
    confirmPayments: boolean;
    manageContracts?: boolean;
  };
  assignedProperties: string[];
  stats?: {
    totalRevenue: number;
    commissionEarned: number;
    closedContracts: number;
    activeVisits: number;
    inquiriesHandled: number;
  };
}

export interface AgentExpense {
  id: string;
  agentId: string;
  agentName: string;
  category: 'Publicidad & Portales' | 'Movilidad & Viáticos' | 'Mantenimiento & Cerrajería' | 'Gestión Notarial' | 'Otros';
  description: string;
  amount: number;
  date: string;
  receiptNumber?: string;
}

export interface AgentActivityLog {
  id: string;
  agentId: string;
  agentName: string;
  action: string;
  target: string;
  date: string;
  badgeType: 'success' | 'warning' | 'info';
}

export interface InternalMessage {
  id: string;
  senderName: string;
  senderPhone?: string;
  propertyName: string;
  unit: string;
  date: string;
  preview: string;
  status: 'Pendiente' | 'En gestión' | 'Resueltas';
  assignedAgentId?: string;
  assignedAgentName?: string;
  creatorId?: string;
  messages: { sender: string; text: string; time: string }[];
}

// Auditoría y Administración (Pantalla 33 a 36)
export interface PlatformReport {
  id: string;
  propertyTitle: string;
  unit: string;
  reason: string;
  status: 'Pendiente' | 'Resuelto' | 'Descartado';
  date: string;
  responsible: string;
  description: string;
}

export interface AuditLogItem {
  id: string;
  date: string;
  user: string;
  action: string;
  resource: string;
}

// Pantallas 29 y 30: Ubicación, Entorno y Reseñas
export interface NearbyPlace {
  id: string;
  name: string;
  type: 'Supermercado' | 'Farmacia' | 'Parada de colectivo' | 'Colegio' | 'Parque' | 'Gimnasio';
  distance?: string;
}

export interface PropertyReview {
  id: string;
  /** ID local del navegador anónimo o ID de la cuenta registrada. */
  reviewerId?: string;
  /** No publicar identidad personal de visitantes anónimos. */
  authorRegistered?: boolean;
  propertyId?: string;
  status?: 'pending' | 'published' | 'hidden';
  author: string;
  authorAvatar?: string;
  date: string;
  rating: number;
  comment: string;
  isVerified: boolean;
  propertyTitle: string;
  unit: string;
  ownerReply?: {
    text: string;
    date: string;
  };
}

// Pantalla 32: Agenda del Encargado
export interface VisitScheduleItem {
  id: string;
  unit: string;
  propertyTitle: string;
  location: string;
  dateTime: string;
  manager: string;
  status: 'Confirmada' | 'Realizada' | 'Cancelada';
  notes?: string;
}

export interface FilterState {
  city: string;
  neighborhood: string;
  propertyTypes: PropertyType[];
  minPrice: number;
  maxPrice: number;
  minBedrooms: number;
  minBathrooms: number;
  hasParking: boolean;
  isFurnished: boolean;
  allowsPets: boolean;
  hasPool: boolean;
  hasBalcony: boolean;
  hasPatio: boolean;
  query?: string;
}

// Solicitud formal de alquiler (Postulación del Inquilino)
export interface RentalApplication {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyCity: string;
  propertyPrice: number;
  tenantName: string;
  tenantPhone: string;
  tenantDocument: string;
  monthlyIncome: number;
  occupation: string;
  moveInDate: string;
  message: string;
  status: 'Pendiente' | 'Aprobada' | 'Rechazada';
  createdAt: string;
  contractGenerated?: boolean;
}

// Mensajería y Chat Web entre usuarios e Inteligencia Artificial
export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole | 'ai';
  recipientName: string;
  recipientRole: UserRole | 'ai';
  text: string;
  timestamp: string;
  propertyTitle?: string;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  contractAttachment?: {
    contractId: string;
    propertyTitle: string;
    monthlyAmount: number;
    status: 'Pendiente de autorización' | 'Autorizado';
    isAuthorized?: boolean;
  };
  agentContact?: {
    name: string;
    phone: string;
    role: string;
    agencyName: string;
    avatar?: string;
  };
}

