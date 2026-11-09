/**
 * Contexto: AppContext.tsx
 * Módulo: Estado Global de AlquiPy
 * Propósito: Administra la sesión de usuario dividida por perfiles (Visitante, Inquilino,
 * Propietario, Inmobiliaria, Administrador), servicio de correo SMTP, pagos y catálogo.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Property, 
  PaymentItem, 
  RentalContract, 
  LandlordRental, 
  AppNotification, 
  UserRole, 
  FilterState, 
  UserProfile, 
  SmtpConfig, 
  ReminderSetting, 
  EmailLog,
  RentalApplication,
  ChatMessage
} from '../types';
import { 
  INITIAL_PROPERTIES, 
  INITIAL_TENANT_PAYMENTS, 
  INITIAL_CONTRACT, 
  INITIAL_LANDLORD_RENTALS, 
  INITIAL_NOTIFICATIONS,
  INITIAL_USERS,
  INITIAL_SMTP_CONFIG,
  INITIAL_REMINDERS,
  INITIAL_EMAIL_LOGS,
  INITIAL_NEARBY_PLACES,
  INITIAL_REVIEWS,
  INITIAL_VISIT_SCHEDULE,
  INITIAL_RENTAL_APPLICATIONS,
  INITIAL_CHAT_MESSAGES
} from '../data/mockData';
import { soundManager } from '../utils/audioNotifications';
import { formatGs } from '../utils/formatters';
import { firebaseAuth } from '../services/firebaseAuth';
import { fetchCloudProperties, saveCloudProperty, moderateCloudProperty } from '../services/propertyCloud';
import { getVisitorId } from '../services/reviewerIdentity';
import { canUseLocalDevAdmin, LOCAL_DEV_ADMIN_EMAIL, LOCAL_DEV_OWNER_EMAIL } from '../services/adminAccessMode';
import { evaluateListing, recordModeration } from '../services/adminGovernance';
import { recordAdminUserAction } from '../services/adminUsers';
import { removeAllOwnerPrivateDocuments } from '../services/privateDocuments';
import { clearOwnerPlanData } from '../data/publicationPlans';
import { clearBillingForOwner } from '../services/billing';


const DEFAULT_FILTERS: FilterState = {
  city: '',
  neighborhood: '',
  propertyTypes: [],
  minPrice: 0,
  maxPrice: 15000000,
  minBedrooms: 0,
  minBathrooms: 0,
  hasParking: false,
  isFurnished: false,
  allowsPets: false,
  hasPool: false,
  hasBalcony: false,
  hasPatio: false,
  query: ''
};

export type AppView = 
  | 'home' 
  | 'search' 
  | 'detail' 
  | 'tenant-payments' 
  | 'notifications' 
  | 'landlord-rentals' 
  | 'favorites' 
  | 'agency' 
  | 'admin' 
  | 'advertiser-settings'
  | 'location-reviews'
  | 'schedule-visits'
  | 'review-payments'
  | 'profile'
  | 'plans'
  | 'policy';

interface AppContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  currentUser: UserProfile | null;
  registeredUsers: UserProfile[];
  loginUser: (user: UserProfile) => void;
  registerUser: (user: UserProfile) => void;
  bootstrapLocalAdmin: (user: UserProfile) => boolean;
  loginDevAdmin: () => boolean;
  loginDevOwner: () => boolean;
  adminSetUserStatus: (id: string, status: 'active' | 'inactive', reason: string) => boolean;
  adminDeleteUser: (id: string, reason: string) => Promise<boolean>;
  logoutUser: () => void;
  updateUserProfile: (data: Partial<UserProfile>) => void;
  toggleAccountStatus: (status?: 'active' | 'inactive') => void;
  deleteCurrentUser: () => void;
  resetAllTestData: () => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  selectedPropertyId: string | null;
  setSelectedPropertyId: (id: string | null) => void;
  properties: Property[];
  favorites: string[];
  toggleFavorite: (id: string) => void;
  compareList: string[];
  toggleCompare: (id: string) => void;
  removeFromCompare: (id: string) => void;
  isCompareOpen: boolean;
  setIsCompareOpen: (open: boolean) => void;
  tenantPayments: PaymentItem[];
  payTenantMonthly: (id: string) => void;
  reviewPayment: (paymentId: string, action: 'approve' | 'reject', reason?: string) => void;
  isReviewModalOpen: boolean;
  setIsReviewModalOpen: (open: boolean) => void;
  selectedPaymentForReview: PaymentItem | null;
  openPaymentReview: (payment: PaymentItem) => void;
  landlordRentals: LandlordRental[];
  recordLandlordPayment: (rentalId: string) => void;
  notifications: AppNotification[];
  addNotification: (notif: Omit<AppNotification, 'id' | 'dateText' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  contract: RentalContract;
  authorizeRentalAcquisition: (propertyId?: string, tenantName?: string, amount?: number) => void;
  finalizeRentalContract: (rentalId?: string, reason?: string) => void;
  signContract: () => void;
  isPremium: boolean;
  setIsPremium: (val: boolean) => void;
  isPremiumModalOpen: boolean;
  setIsPremiumModalOpen: (val: boolean) => void;
  isPublishModalOpen: boolean;
  setIsPublishModalOpen: (val: boolean) => void;
  addProperty: (property: Property) => Promise<void>;
  updateProperty: (property: Property) => Promise<void>;
  deleteProperty: (id: string) => void;
  moderateProperty: (id: string, action: 'approved' | 'removed', reason: string) => Promise<void>;
  reviewModeration: (id: string, status: 'published' | 'hidden') => void;
  togglePropertyStatus: (id: string) => void;
  clearAllProperties: () => void;
  restoreDefaultProperties: () => void;
  editingProperty: Property | null;
  setEditingProperty: (property: Property | null) => void;
  openEditPropertyModal: (property: Property) => void;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  openPropertyDetail: (id: string) => void;
  
  // Servicio de Correo SMTP y Recordatorios
  smtpConfig: SmtpConfig;
  setSmtpConfig: React.Dispatch<React.SetStateAction<SmtpConfig>>;
  reminders: ReminderSetting[];
  setReminders: React.Dispatch<React.SetStateAction<ReminderSetting[]>>;
  emailLogs: EmailLog[];
  testSmtpConnection: () => Promise<boolean>;

  // Pantallas 29, 30 y 32
  nearbyPlaces: import('../types').NearbyPlace[];
  addNearbyPlace: (place: import('../types').NearbyPlace) => void;
  removeNearbyPlace: (id: string) => void;
  reviews: import('../types').PropertyReview[];
  addReview: (review: import('../types').PropertyReview) => void;
  visitSchedule: import('../types').VisitScheduleItem[];
  updateVisitStatus: (id: string, status: 'Confirmada' | 'Realizada' | 'Cancelada') => void;

  // Solicitudes de Alquiler
  rentalApplications: RentalApplication[];
  addRentalApplication: (app: Omit<RentalApplication, 'id' | 'createdAt' | 'status'>) => void;
  updateApplicationStatus: (id: string, status: 'Aprobada' | 'Rechazada') => void;
  isApplicationModalOpen: boolean;
  setIsApplicationModalOpen: (open: boolean) => void;
  applicationProperty: Property | null;
  openApplicationModal: (property?: Property) => void;

  // Chat Web y Mensajería Directa
  chatMessages: ChatMessage[];
  sendChatMessage: (data: { text: string; contractAttachment?: ChatMessage['contractAttachment']; agentContact?: ChatMessage['agentContact'] }) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  chatRecipient: { name: string; role: 'tenant' | 'landlord' | 'agency' | 'ai'; phone?: string; propertyTitle?: string };
  openChatWith: (name: string, role: 'tenant' | 'landlord' | 'agency' | 'ai', phone?: string, propertyTitle?: string, initialMessage?: string, withContract?: boolean) => void;
}



/**
 * Lectura defensiva del almacenamiento de versiones anteriores.
 * Un JSON inválido nunca debe impedir que se abra la web.
 */
function readStored<T>(key: string, fallback: T, valid: (value: unknown) => boolean): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value as T : fallback;
  } catch {
    return fallback;
  }
}
const isList = (value: unknown): value is unknown[] => Array.isArray(value);
const isObject = (value: unknown): value is object => Boolean(value && typeof value === 'object' && !Array.isArray(value));

/**
 * Los anuncios de la muestra se guardan localmente. No se silencian los errores
 * de cuota al crear/editar: el usuario debe saber si sus cambios no persistieron.
 */
function persistPropertyList(properties: Property[]): void {
  const data = JSON.stringify(properties);
  try {
    localStorage.setItem('nde_rogara_properties', data);
    // Compatibilidad con instalaciones anteriores; evitar una segunda copia si
    // ocupa demasiado, ya que el formato principal tiene prioridad.
    try { localStorage.setItem('alquipy_properties', data); }
    catch { localStorage.removeItem('alquipy_properties'); }
  } catch {
    throw new Error('No hay espacio suficiente para guardar las fotografías. Quitá algunas imágenes o liberá almacenamiento del navegador.');
  }
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Crea una identidad anónima por navegador incluso sin iniciar sesión.
  useEffect(() => { getVisitorId(); }, []);
  // Estado de sesión y autenticación: Por defecto Visitante (portal abierto sin cuentas predeterminadas)
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('alquipy_current_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Purgar de forma proactiva perfiles demo de prueba anteriores
      const isDemo = ['usr-tenant', 'usr-landlord', 'usr-agency'].includes(parsed?.id) ||
                     ['ana@email.com', 'carlos@alquipy.com', 'contacto@inmobiliariaejemplo.com.py', 'inmobiliaria@alquipy.com.py', 'usuario@gmail.com', 'usuario@alquipy.com'].includes(parsed?.email?.toLowerCase());
      if (isDemo) {
        localStorage.removeItem('alquipy_current_user');
        localStorage.removeItem('alquipy_firebase_user');
        return null;
      }
      if (!['landlord', 'admin'].includes(parsed?.role)) return null;
      // Las sesiones predeterminadas no sobreviven fuera del entorno de desarrollo local.
      if (['local-dev-admin', 'local-dev-owner'].includes(parsed?.id) && !canUseLocalDevAdmin()) return null;
      // Una cuenta local eliminada o suspendida no puede restaurar una sesión anterior.
      const stored: UserProfile[] = JSON.parse(localStorage.getItem('alquipy_registered_users') || '[]');
      const actual = stored.find(u => u.id === parsed.id && u.email.toLowerCase() === parsed.email?.toLowerCase());
      if (!actual || actual.status === 'inactive') return null;
      // Firebase requiere validar la sesión/claims desde el servicio, nunca desde el localStorage.
      if (firebaseAuth.isConfigured() && actual.role === 'admin' && !(canUseLocalDevAdmin() && actual.id === 'local-dev-admin')) return null;
      return actual;
    } catch {
      return null;
    }
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    return currentUser && ['landlord', 'admin'].includes(currentUser.role) ? currentUser.role : 'visitor';
  });

  // Usuarios registrados auténticamente en la plataforma
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('alquipy_registered_users');
      if (!saved) return [];
      const parsed: UserProfile[] = JSON.parse(saved);
      // Purgar perfiles demo para iniciar 100% limpio
      const cleaned = parsed.filter(u => ['landlord', 'admin'].includes(u?.role) && 
        !['usr-tenant', 'usr-landlord', 'usr-agency'].includes(u?.id) &&
        !['ana@email.com', 'carlos@alquipy.com', 'contacto@inmobiliariaejemplo.com.py', 'inmobiliaria@alquipy.com.py', 'usuario@gmail.com', 'usuario@alquipy.com'].includes(u?.email?.toLowerCase())
      );
      localStorage.setItem('alquipy_registered_users', JSON.stringify(cleaned));
      return cleaned;
    } catch {
      return [];
    }
  });

  const handleSetUserRole = (role: UserRole) => {
    // Cambios a roles privilegiados deben proceder del flujo de autenticación.
    if (role !== 'visitor') return;
    setUserRole('visitor');
    if (role === 'visitor') {
      setCurrentUser(null);
      localStorage.removeItem('alquipy_current_user');
      localStorage.removeItem('alquipy_firebase_user');
      setCurrentView('home');
    }
  };

  const registerUser = (newUser: UserProfile) => {
    if (newUser.role !== 'landlord' || registeredUsers.some(u => u.email.toLowerCase() === newUser.email.toLowerCase())) return;
    setRegisteredUsers(prev => {
      const filtered = prev.filter(u => !(u.email.toLowerCase() === newUser.email.toLowerCase() && u.role === newUser.role));
      const updated = [newUser, ...filtered];
      localStorage.setItem('alquipy_registered_users', JSON.stringify(updated));
      return updated;
    });

    setCurrentUser(newUser);
    setUserRole(newUser.role);
    localStorage.setItem('alquipy_current_user', JSON.stringify(newUser));
    setIsAuthModalOpen(false);

    setCurrentView('landlord-rentals');

    addNotification({
      title: '🎉 Cuenta Creada Exitosamente',
      message: `Bienvenido/a a Nde Rogarã, ${newUser.name}. Tu cuenta de Propietario fue registrada correctamente.`,
      category: 'Sistema',
      type: 'success'
    });
  };

  // Solo permite crear la primera cuenta administrativa en el entorno local de desarrollo.
  // No implementa autenticación ni autorización segura para uso por Internet.
  const bootstrapLocalAdmin = (admin: UserProfile): boolean => {
    if (!import.meta.env.DEV || firebaseAuth.isConfigured() || admin.role !== 'admin' ||
        !admin.password?.startsWith('pbkdf2:') || registeredUsers.some(u => u.role === 'admin') ||
        registeredUsers.some(u => u.email.toLowerCase() === admin.email.toLowerCase())) return false;
    const updated = [{ ...admin, status: 'active' as const }, ...registeredUsers];
    localStorage.setItem('alquipy_registered_users', JSON.stringify(updated));
    setRegisteredUsers(updated);
    setCurrentUser(updated[0]);
    setUserRole('admin');
    localStorage.setItem('alquipy_current_user', JSON.stringify(updated[0]));
    setIsAuthModalOpen(false);
    setCurrentView('admin');
    return true;
  };

  // Exclusivo de Vite DEV en localhost. NUNCA habilitar en producción.
  // Las credenciales se validan en AuthModal; esto solo prepara la sesión temporal local.
  const loginDevAdmin = (): boolean => {
    if (!canUseLocalDevAdmin()) return false;
    const dev: UserProfile = { id: 'local-dev-admin', role: 'admin', name: 'Administración Nde Rogarã', email: LOCAL_DEV_ADMIN_EMAIL, status: 'active' };
    const next = [dev, ...registeredUsers.filter(u => u.id !== dev.id && u.email.toLowerCase() !== dev.email)];
    setRegisteredUsers(next);
    localStorage.setItem('alquipy_registered_users', JSON.stringify(next));
    setCurrentUser(dev); setUserRole('admin');
    localStorage.setItem('alquipy_current_user', JSON.stringify(dev));
    setIsAuthModalOpen(false); setCurrentView('admin');
    return true;
  };
  /** Cuenta inmobiliaria de exhibición: sesión local separada de Firebase. */
  const loginDevOwner = (): boolean => {
    if (!canUseLocalDevAdmin()) return false;
    const existing = registeredUsers.find(u => u.id === 'local-dev-owner');
    if (existing?.status === 'inactive') return false;
    const owner: UserProfile = existing || {
      id: 'local-dev-owner', role: 'landlord', name: 'Inmobiliaria',
      email: LOCAL_DEV_OWNER_EMAIL, phone: '', status: 'active'
    };
    const next = [owner, ...registeredUsers.filter(u => u.id !== owner.id && u.email.toLowerCase() !== owner.email)];
    setRegisteredUsers(next);
    localStorage.setItem('alquipy_registered_users', JSON.stringify(next));
    setCurrentUser(owner);
    setUserRole('landlord');
    localStorage.setItem('alquipy_current_user', JSON.stringify(owner));
    setIsAuthModalOpen(false);
    setCurrentView('landlord-rentals');
    return true;
  };

  const isLocalAdmin = () => Boolean(currentUser && currentUser.role === 'admin' && userRole === 'admin' &&
    currentUser.status !== 'inactive' &&
    ((currentUser.id === 'local-dev-admin' && canUseLocalDevAdmin()) ||
    (firebaseAuth.isConfigured()
      ? firebaseAuth.getCurrentUser()?.uid === currentUser.id && firebaseAuth.getCurrentUser()?.role === 'admin'
      : registeredUsers.some(u => u.id === currentUser.id && u.role === 'admin' && u.status !== 'inactive'))));


  const ownerPropertyMatch = (p: Property, owner: UserProfile) =>
    p.ownerId === owner.id || (!p.ownerId && p.ownerEmail?.toLowerCase() === owner.email.toLowerCase());

  const adminSetUserStatus = (id: string, status: 'active' | 'inactive', reason: string): boolean => {
    if (!isLocalAdmin() || reason.trim().length < 12) return false;
    const owner = registeredUsers.find(u => u.id === id && u.role === 'landlord');
    if (!owner || owner.status === status) return false;
    const next = registeredUsers.map(u => u.id === id ? { ...u, status, restrictionStage: status === 'active' ? undefined : 'suspended' as const } : u);
    localStorage.setItem('alquipy_registered_users', JSON.stringify(next));
    setRegisteredUsers(next);
    // Pausar inmediatamente los avisos al inhabilitar la cuenta. Al reactivarla,
    // el propietario decide qué inmuebles vuelve a publicar.
    if (status === 'inactive') {
      const updated = properties.map(p => ownerPropertyMatch(p, owner) ? { ...p, isActive: false } : p);
      localStorage.setItem('nde_rogara_properties', JSON.stringify(updated));
      localStorage.setItem('alquipy_properties', JSON.stringify(updated));
      setProperties(updated);
    }
    recordAdminUserAction(owner, status === 'inactive' ? 'suspended' : 'reactivated', reason.trim(), currentUser!.email,
      properties.filter(p => ownerPropertyMatch(p, owner)).length);
    return true;
  };

  const adminDeleteUser = async (id: string, reason: string): Promise<boolean> => {
    if (!isLocalAdmin() || reason.trim().length < 12) return false;
    // No es posible borrar el administrador desde la tabla de propietarios.
    const owner = registeredUsers.find(u => u.id === id && u.role === 'landlord');
    if (!owner) return false;
    const related = properties.filter(p => ownerPropertyMatch(p, owner));
    // Si no se pudieron borrar sus documentos locales, NO reportamos una eliminación completa.
    await removeAllOwnerPrivateDocuments(owner.id);
    const remaining = registeredUsers.filter(u => u.id !== id);
    const remainingProperties = properties.filter(p => !ownerPropertyMatch(p, owner));
    setRegisteredUsers(remaining);
    localStorage.setItem('alquipy_registered_users', JSON.stringify(remaining));
    setProperties(remainingProperties);
    localStorage.setItem('nde_rogara_properties', JSON.stringify(remainingProperties));
    localStorage.setItem('alquipy_properties', JSON.stringify(remainingProperties));
    const relatedIds = new Set(related.map(p => p.id));
    setReviews(prev => prev.filter(r => !r.propertyId || !relatedIds.has(r.propertyId)));
    clearOwnerPlanData(owner.id);
    clearBillingForOwner(owner.id);
    recordAdminUserAction(owner, 'deleted', reason.trim(), currentUser!.email, related.length);
    return true;
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  const [currentView, setCurrentView] = useState<AppView>(() => new URLSearchParams(window.location.search).has('inmueble') ? 'detail' : 'home');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(() => new URLSearchParams(window.location.search).get('inmueble') || 'prop-3');
  
  const [properties, setProperties] = useState<Property[]>(() => {
    // Si existe un formato antiguo o corrupto, iniciar el catálogo sin bloquear React.
    const isPropertyList = (value: unknown) => isList(value) && value.every(item =>
      isObject(item) && 'id' in item && 'title' in item && 'city' in item && 'images' in item,
    );
    try {
      const raw = localStorage.getItem('nde_rogara_properties') || localStorage.getItem('alquipy_properties');
      if (!raw) return INITIAL_PROPERTIES;
      const parsed: unknown = JSON.parse(raw);
      return isPropertyList(parsed) ? parsed as Property[] : INITIAL_PROPERTIES;
    } catch {
      return INITIAL_PROPERTIES;
    }
  });

  // Sincroniza avisos compartidos al abrir la web, cambiar de cuenta y mientras
  // esté abierto el panel. Cada cuenta conserva sus borradores locales previos.
  useEffect(() => {
    let active=true, migrated=false;
    const scope=userRole==='admin'?'admin':currentUser?'mine':'public';
    const initialLocal=properties.filter(p=>currentUser && p.ownerId===currentUser.id && p.id.startsWith('prop-'));
    const sync=async()=>{
      try{
        const remote=await fetchCloudProperties(scope);
        if(!active)return;
        setProperties(previous=>{
          const keys=new Set(remote.map(p=>p.id));
          const merged=[...remote,...previous.filter(p=>!keys.has(p.id))];
          try{persistPropertyList(merged);}catch{/* Catálogo remoto permanece disponible aunque el navegador no tenga espacio. */}
          return merged;
        });
        // Recuperar avisos creados antes de habilitar Firestore, solo del titular
        // autenticado. Nunca migrar un aviso ajeno usando permisos de admin.
        if(!migrated && currentUser && scope!=='public'){
          migrated=true;
          const known=new Set(remote.map(p=>p.id));
          const missing=initialLocal.filter(p=>!known.has(p.id));
          for(const old of missing) {
            if(!active)break;
            try{
              const saved=await saveCloudProperty(old);
              if(active)setProperties(previous=>previous.map(p=>p.id===saved.id?saved:p));
            }catch(error){if(import.meta.env.DEV)console.warn('No se pudo migrar aviso local:',error);}
          }
        }
      }catch(error){
        // No borrar publicaciones locales si Firestore está momentáneamente caído.
        if(import.meta.env.DEV)console.warn('Catálogo remoto no disponible:',error);
      }
    };
    void sync();
    const interval=window.setInterval(()=>{if(!document.hidden)void sync();},scope==='public'?45000:15000);
    return ()=>{active=false;window.clearInterval(interval);};
  },[currentUser?.id,userRole]);

  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('alquipy_favorites');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length === 2 && parsed.includes('prop-1') && parsed.includes('prop-3')) {
            localStorage.removeItem('alquipy_favorites');
            return [];
          }
          return parsed;
        }
      }
    } catch (_) {}
    return [];
  });

  const [compareList, setCompareList] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);

  const [tenantPayments, setTenantPayments] = useState<PaymentItem[]>(() =>
    readStored('alquipy_tenant_payments', INITIAL_TENANT_PAYMENTS, isList),
  );

  const [landlordRentals, setLandlordRentals] = useState<LandlordRental[]>(() =>
    readStored('alquipy_landlord_rentals', INITIAL_LANDLORD_RENTALS, isList),
  );

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('alquipy_notifications');
      if (saved) {
        const parsed: AppNotification[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(n => !['notif-1', 'notif-2', 'notif-3', 'notif-4', 'notif-5'].includes(n.id));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('alquipy_notifications', JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch (_) {}
    return [];
  });

  const addNotification = (notif: Omit<AppNotification, 'id' | 'dateText' | 'read'>) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      dateText: 'Ahora',
      read: false,
      ...notif
    };
    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      try { localStorage.setItem('alquipy_notifications', JSON.stringify(updated)); }
      catch { console.warn('No se pudo almacenar el historial local de avisos.'); }
      return updated;
    });
  };

  // Configuración de correo SMTP propio
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() =>
    readStored('alquipy_smtp_config', INITIAL_SMTP_CONFIG, isObject),
  );

  const [reminders, setReminders] = useState<ReminderSetting[]>(() =>
    readStored('alquipy_reminders', INITIAL_REMINDERS, isList),
  );

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(INITIAL_EMAIL_LOGS);

  // Contrato Digital de Alquiler (Visualización tras autorización del propietario/agente)
  const [contract, setContract] = useState<RentalContract>(() =>
    readStored('alquipy_contract', { ...INITIAL_CONTRACT, isAuthorized: true, status: 'Autorizado' }, isObject),
  );

  const authorizeRentalAcquisition = (propertyId?: string, tenantName?: string, amount?: number) => {
    const authDate = new Date().toLocaleDateString('es-PY');
    setContract(prev => {
      const updated: RentalContract = {
        ...prev,
        isAuthorized: true,
        authorizedAt: authDate,
        status: 'Autorizado'
      };
      localStorage.setItem('alquipy_contract', JSON.stringify(updated));
      return updated;
    });

    const effectiveAmount = amount || contract.monthlyAmount || 2500000;
    const effectiveTenant = tenantName || contract.tenantName || currentUser?.name || 'Inquilino';
    const effectiveProperty = propertyId 
      ? (properties.find(p => p.id === propertyId)?.title || contract.propertyTitle) 
      : contract.propertyTitle;

    setLandlordRentals(prev => {
      const exists = prev.find(r => r.propertyTitle === effectiveProperty || r.tenantName === effectiveTenant);
      if (exists) {
        const updated = prev.map(r => r.id === exists.id ? { ...r, status: 'Pagado' as const, lastPaymentDate: authDate } : r);
        localStorage.setItem('alquipy_landlord_rentals', JSON.stringify(updated));
        return updated;
      }
      const newRental: LandlordRental = {
        id: `rental-${Date.now()}`,
        tenantName: effectiveTenant,
        tenantPhone: '+595 981 765 432',
        propertyId: propertyId || 'prop-3',
        propertyTitle: effectiveProperty,
        monthlyAmount: effectiveAmount,
        nextPaymentDate: '05/10/2026',
        status: 'Pagado',
        lastPaymentDate: authDate
      };
      const updated = [newRental, ...prev];
      localStorage.setItem('alquipy_landlord_rentals', JSON.stringify(updated));
      return updated;
    });

    addNotification({
      title: '🎉 Adquisición Autorizada y Contrato Habilitado',
      message: `Se autorizó la adquisición de "${effectiveProperty}" para ${effectiveTenant}. El contrato está habilitado para su visualización y el ingreso mensual de ${formatGs(effectiveAmount)} se ha sumado a tu panel.`,
      category: 'Sistema',
      type: 'success'
    });
  };

  /**
   * Finaliza o cancela un contrato de alquiler cuando vence o por rescisión acordada
   */
  const finalizeRentalContract = (rentalId?: string, reason?: string) => {
    setContract(prev => {
      const updated: RentalContract = {
        ...prev,
        status: 'Finalizado'
      };
      localStorage.setItem('alquipy_contract', JSON.stringify(updated));
      return updated;
    });

    setLandlordRentals(prev => {
      const updated = prev.map(r => {
        if (!rentalId || r.id === rentalId || r.propertyTitle === contract.propertyTitle) {
          return { ...r, status: 'Finalizado' as const };
        }
        return r;
      });
      localStorage.setItem('alquipy_landlord_rentals', JSON.stringify(updated));
      return updated;
    });

    addNotification({
      title: '📁 Alquiler Finalizado / Contrato Vencido',
      message: `El alquiler de "${contract.propertyTitle}" ha sido dado por finalizado ${reason ? `(${reason})` : 'por vencimiento de plazo'}. El inmueble queda archivado en tu historial.`,
      category: 'Sistema',
      type: 'alert'
    });
  };

  const signContract = () => {
    authorizeRentalAcquisition();
  };

  // Solicitudes de Alquiler (Postulaciones)
  const [rentalApplications, setRentalApplications] = useState<RentalApplication[]>(() =>
    readStored('alquipy_rental_applications', INITIAL_RENTAL_APPLICATIONS, isList),
  );
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationProperty, setApplicationProperty] = useState<Property | null>(null);

  const openApplicationModal = (prop?: Property) => {
    if (!currentUser || userRole === 'visitor') {
      setAuthModalMode('register');
      setIsAuthModalOpen(true);
      addNotification({
        title: '🔒 Registro Requerido',
        message: 'Debes registrarte para más información y poder solicitar el alquiler.',
        category: 'Sistema',
        type: 'alert'
      });
      return;
    }
    setApplicationProperty(prop || properties[2]);
    setIsApplicationModalOpen(true);
  };

  const addRentalApplication = (appData: Omit<RentalApplication, 'id' | 'createdAt' | 'status'>) => {
    const newApp: RentalApplication = {
      id: `app-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('es-PY'),
      status: 'Pendiente',
      ...appData
    };
    setRentalApplications(prev => {
      const updated = [newApp, ...prev];
      localStorage.setItem('alquipy_rental_applications', JSON.stringify(updated));
      return updated;
    });

    const targetProp = properties.find(p => p.id === appData.propertyId || p.title === appData.propertyTitle);
    const targetOwnerEmail = targetProp?.ownerEmail;

    addNotification({
      title: `📝 Nueva solicitud de alquiler: ${appData.propertyTitle}`,
      message: `${appData.tenantName} (${appData.tenantPhone}) envió una postulación con ingreso mensual de Gs. ${appData.monthlyIncome.toLocaleString('es-PY')}.${targetOwnerEmail ? ` Notificado al correo registrado: ${targetOwnerEmail}.` : ''}`,
      category: 'Consultas',
      type: 'message',
      senderName: appData.tenantName,
      senderPhone: appData.tenantPhone,
      recipientEmail: targetOwnerEmail,
      recipientPhone: targetProp?.ownerPhone,
      propertyTitle: appData.propertyTitle
    });
  };

  const updateApplicationStatus = (id: string, status: 'Aprobada' | 'Rechazada') => {
    setRentalApplications(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, status, contractGenerated: status === 'Aprobada' } : a);
      localStorage.setItem('alquipy_rental_applications', JSON.stringify(updated));
      return updated;
    });

    const targetApp = rentalApplications.find(a => a.id === id);
    if (targetApp) {
      addNotification({
        title: status === 'Aprobada' ? '🎉 Solicitud de Alquiler Aprobada' : 'ℹ️ Solicitud de Alquiler Actualizada',
        message: status === 'Aprobada'
          ? `La solicitud de ${targetApp.tenantName} para "${targetApp.propertyTitle}" fue aprobada. Podés emitir y enviarle el contrato digital.`
          : `La postulación para "${targetApp.propertyTitle}" fue rechazada.`,
        category: 'Sistema',
        type: status === 'Aprobada' ? 'success' : 'alert'
      });
    }
  };

  // Chat Web y Mensajería Directa
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('alquipy_chat_messages');
      if (saved) {
        const parsed: ChatMessage[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(m => !['msg-1', 'msg-2', 'msg-3'].includes(m.id));
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('alquipy_chat_messages', JSON.stringify(cleaned));
          }
          return cleaned;
        }
      }
    } catch (_) {}
    return [];
  });

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatRecipient, setChatRecipient] = useState<{
    name: string;
    role: 'tenant' | 'landlord' | 'agency' | 'ai';
    phone?: string;
    propertyTitle?: string;
  }>({
    name: 'Asesor Inmobiliario Nde Rogarã',
    role: 'ai',
    phone: '+595 21 000 000',
    propertyTitle: 'Consultas Generales'
  });

  const openChatWith = (
    name: string,
    role: 'tenant' | 'landlord' | 'agency' | 'ai',
    phone?: string,
    propertyTitle?: string,
    initialMessage?: string,
    withContract?: boolean
  ) => {
    setChatRecipient({ name, role, phone, propertyTitle });
    setIsChatOpen(true);

    if (initialMessage || withContract) {
      const senderRoleText = currentUser?.name || (userRole === 'landlord' ? 'Propietario' : (userRole === 'tenant' ? 'Inquilino' : 'Visitante'));
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: currentUser ? currentUser.id : 'visitor',
        senderName: currentUser ? currentUser.name : (userRole === 'visitor' ? 'Visitante interesado' : senderRoleText),
        senderRole: currentUser ? userRole : 'visitor',
        recipientName: name,
        recipientRole: role,
        text: initialMessage || (withContract ? `📄 Te comparto el Contrato de Locación Digital para ${propertyTitle || 'el inmueble'}.` : 'Hola, me gustaría consultar detalles del alquiler.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        propertyTitle,
        contractAttachment: withContract ? {
          contractId: contract.id,
          propertyTitle: propertyTitle || contract.propertyTitle,
          monthlyAmount: contract.monthlyAmount,
          status: contract.isAuthorized ? 'Autorizado' : 'Pendiente de autorización'
        } : undefined
      };
      setChatMessages(prev => {
        const updated = [...prev, newMsg];
        localStorage.setItem('alquipy_chat_messages', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const sendChatMessage = (data: {
    text: string;
    contractAttachment?: ChatMessage['contractAttachment'];
    agentContact?: ChatMessage['agentContact'];
  }) => {
    const defaultSenderName = userRole === 'landlord' ? 'Propietario' : (userRole === 'tenant' ? 'Inquilino' : 'Visitante');
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUser ? currentUser.id : 'user',
      senderName: currentUser ? currentUser.name : defaultSenderName,
      senderRole: userRole,
      recipientName: chatRecipient.name,
      recipientRole: chatRecipient.role,
      text: data.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      propertyTitle: chatRecipient.propertyTitle,
      contractAttachment: data.contractAttachment,
      agentContact: data.agentContact,
      status: 'delivered'
    };

    setChatMessages(prev => {
      const updated = [...prev, newMsg];
      localStorage.setItem('alquipy_chat_messages', JSON.stringify(updated));
      return updated;
    });

    soundManager.playMessageSent();

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const channel = new BroadcastChannel('alquipy_realtime_chat');
        channel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: newMsg });
        channel.close();
      } catch {}
    }

    // Respuesta inteligente contextual en tiempo real si quien escribe es Inquilino o Visitante
    if (userRole === 'tenant' || userRole === 'visitor') {
      setTimeout(() => {
        const lowerText = data.text.toLowerCase();
        let replyText = `¡Hola! Gracias por comunicarte. Con respecto a ${chatRecipient.propertyTitle || 'el inmueble'}, te confirmo que la disponibilidad es inmediata y está en excelentes condiciones.`;

        if (lowerText.includes('contrato') || lowerText.includes('requisito') || lowerText.includes('adquirir') || lowerText.includes('alquilar')) {
          replyText = `¡Hola! Con mucho gusto. Para que puedas visualizar el contrato oficial de locación, te autorizo la adquisición del alquiler directamente en la plataforma una vez que acordemos las condiciones.`;
        } else if (lowerText.includes('visita') || lowerText.includes('ver') || lowerText.includes('cuando')) {
          replyText = `¡Excelente! Podemos coordinar una visita para conocer el departamento. Avisame qué día y horario te queda mejor (mañana o tarde) para agendarte.`;
        } else if (lowerText.includes('descuento') || lowerText.includes('precio') || lowerText.includes('oferta') || lowerText.includes('rebaja')) {
          replyText = `El precio ya cuenta con la rebaja promocional exclusiva en Nde Rogarã. Si confirmas tu interés esta semana, te garantizamos el canon preferencial.`;
        }

        const autoReply: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          senderId: 'owner-auto',
          senderName: chatRecipient.name || 'Carlos González (Propietario)',
          senderRole: chatRecipient.role || 'landlord',
          recipientName: currentUser ? currentUser.name : 'Inquilino',
          recipientRole: userRole,
          text: replyText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          propertyTitle: chatRecipient.propertyTitle,
          status: 'read'
        };

        setChatMessages(prev => {
          const updated = [...prev, autoReply];
          localStorage.setItem('alquipy_chat_messages', JSON.stringify(updated));
          return updated;
        });

        soundManager.playMessageReceived();

        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          try {
            const channel = new BroadcastChannel('alquipy_realtime_chat');
            channel.postMessage({ type: 'NEW_CHAT_MESSAGE', message: autoReply });
            channel.close();
          } catch {}
        }
      }, 1600);
    }
  };

  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Estados para Revisión de Pagos (Pantalla 31)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [selectedPaymentForReview, setSelectedPaymentForReview] = useState<PaymentItem | null>(null);

  // Estados para Lugares Cercanos (Pantalla 29), Reseñas (Pantalla 30) y Visitas (Pantalla 32)
  const [nearbyPlaces, setNearbyPlaces] = useState<import('../types').NearbyPlace[]>(INITIAL_NEARBY_PLACES);
  const [reviews, setReviews] = useState<import('../types').PropertyReview[]>(() => {
    try { const saved = JSON.parse(localStorage.getItem('nderogara_reviews_v2') || 'null'); return Array.isArray(saved) ? saved : []; }
    catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem('nderogara_reviews_v2', JSON.stringify(reviews)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ } }, [reviews]);
  const [visitSchedule, setVisitSchedule] = useState<import('../types').VisitScheduleItem[]>(INITIAL_VISIT_SCHEDULE);

  const openPaymentReview = (payment: PaymentItem) => {
    setSelectedPaymentForReview(payment);
    setIsReviewModalOpen(true);
  };

  const addNearbyPlace = (place: import('../types').NearbyPlace) => {
    setNearbyPlaces(prev => [...prev, place]);
  };

  const removeNearbyPlace = (id: string) => {
    setNearbyPlaces(prev => prev.filter(p => p.id !== id));
  };

  const addReview = (newReview: import('../types').PropertyReview) => {
    if (!newReview.propertyId || !properties.some(p => p.id === newReview.propertyId && p.isActive !== false && (p.moderationStatus || 'approved') === 'approved')) return;
    setReviews(prev => [{ ...newReview, status: 'pending', isVerified: false }, ...prev]);
  };
  const reviewModeration = (id: string, status: 'published' | 'hidden') => {
    if (userRole !== 'admin' || !currentUser || !isLocalAdmin()) return;
    setReviews(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const updateVisitStatus = (id: string, status: 'Confirmada' | 'Realizada' | 'Cancelada') => {
    setVisitSchedule(prev => prev.map(v => v.id === id ? { ...v, status } : v));
  };


  // Sincronización con LocalStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('alquipy_current_user', JSON.stringify(currentUser));
      setUserRole(currentUser.role);
    } else {
      localStorage.removeItem('alquipy_current_user');
      setUserRole('visitor');
    }
  }, [currentUser]);

  useEffect(() => {
    // La persistencia crítica se hace antes de cerrar el formulario de edición.
    // No convertir un fallo de almacenamiento en una pantalla blanca.
    try { persistPropertyList(properties); }
    catch (error) { console.warn('No se pudo sincronizar el catálogo local:', error); }
  }, [properties]);

  useEffect(() => {
    try { localStorage.setItem('alquipy_favorites', JSON.stringify(favorites)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ }
  }, [favorites]);

  useEffect(() => {
    try { localStorage.setItem('alquipy_tenant_payments', JSON.stringify(tenantPayments)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ }
  }, [tenantPayments]);

  useEffect(() => {
    try { localStorage.setItem('alquipy_landlord_rentals', JSON.stringify(landlordRentals)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ }
  }, [landlordRentals]);

  useEffect(() => {
    try { localStorage.setItem('alquipy_notifications', JSON.stringify(notifications)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ }
  }, [notifications]);

  useEffect(() => {
    try { localStorage.setItem('alquipy_smtp_config', JSON.stringify(smtpConfig)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ }
  }, [smtpConfig]);

  useEffect(() => {
    try { localStorage.setItem('alquipy_reminders', JSON.stringify(reminders)); } catch { /* Cuota local excedida: no bloquear toda la aplicación. */ }
  }, [reminders]);

  /**
   * Inicia sesión con un usuario concreto y lo redirige a su panel respectivo
   */
  const loginUser = (user: UserProfile) => {
    // Si el usuario ya está registrado en localStorage, estirar sus datos propios (nombre, teléfono, etc.)
    const registered = readStored<UserProfile[]>('alquipy_registered_users', [], isList);
    const existing = registered.find(u => u.email.toLowerCase() === user.email.toLowerCase());
    // En producción nunca recuperar privilegios desde un perfil guardado en el navegador.
    const finalUser = firebaseAuth.isConfigured() ? user : (existing || user);
    if (finalUser.status === 'inactive') return;

    setCurrentUser(finalUser);
    setUserRole(finalUser.role);
    localStorage.setItem('alquipy_current_user', JSON.stringify(finalUser));
    setIsAuthModalOpen(false);

    setCurrentView(finalUser.role === 'admin' ? 'admin' : 'landlord-rentals');
  };

  /**
   * Cierra la sesión activa y devuelve al usuario al rol de visitante
   */
  const logoutUser = () => {
    setCurrentUser(null);
    setUserRole('visitor');
    localStorage.removeItem('alquipy_current_user');
    localStorage.removeItem('alquipy_firebase_user');
    firebaseAuth.signOut().catch(() => {});
    setCurrentView('home');
  };

  /**
   * Actualiza los datos del perfil del usuario en sesión
   */
  const updateUserProfile = (data: Partial<UserProfile>) => {
    if (!currentUser) return;
    // Actualizar cada estado por separado, nunca llamar setState desde el callback
    // de otro setState: React podía fallar al guardar el perfil.
    const allowed: (keyof UserProfile)[] = [
      'name', 'phone', 'city', 'avatar', 'publicContactEmail', 'whatsapp2',
      'whatsapp1Name', 'whatsapp2Name', 'instagram', 'facebook', 'tiktok', 'youtube', 'website',
    ];
    const changes: Partial<UserProfile> = {};
    allowed.forEach(key => {
      if (data[key] !== undefined) Object.assign(changes, { [key]: data[key] });
    });
    const updated = { ...currentUser, ...changes };
    setCurrentUser(updated);
    setRegisteredUsers(users => {
      const found = users.some(user => user.id === updated.id);
      return found
        ? users.map(user => user.id === updated.id ? updated : user)
        : [...users, updated];
    });

    // Nunca sobrescribir contactos personalizados: únicamente sincronizar campos
    // que aún coinciden con los valores anteriores del perfil.
    if (changes.name !== undefined || changes.phone !== undefined || changes.avatar !== undefined) {
      setProperties(existing => existing.map(property => {
        const owned = property.ownerId
          ? property.ownerId === updated.id
          : property.ownerEmail?.toLowerCase() === updated.email.toLowerCase();
        if (!owned) return property;
        return {
          ...property,
          ...(changes.name !== undefined && property.ownerName === currentUser.name
            ? { ownerName: updated.name } : {}),
          ...(changes.phone !== undefined && property.ownerPhone === currentUser.phone
            ? { ownerPhone: updated.phone || '' } : {}),
          ...(changes.avatar !== undefined && (!property.ownerAvatar || property.ownerAvatar === currentUser.avatar)
            ? { ownerAvatar: updated.avatar || '' } : {}),
        };
      }));
    }
  };

  /**
   * Alterna el estado del perfil entre activo e inactivo / pausado
   */
  const toggleAccountStatus = (status?: 'active' | 'inactive') => {
    setCurrentUser(prev => {
      if (!prev) return null;
      const nextStatus = status || (prev.status === 'inactive' ? 'active' : 'inactive');
      const updated = { ...prev, status: nextStatus };
      localStorage.setItem('alquipy_current_user', JSON.stringify(updated));
      setRegisteredUsers(users => {
        const updatedList = users.map(u => u.id === updated.id || u.email.toLowerCase() === updated.email.toLowerCase() ? updated : u);
        localStorage.setItem('alquipy_registered_users', JSON.stringify(updatedList));
        return updatedList;
      });
      return updated;
    });

    const isNowInactive = status === 'inactive' || (!status && currentUser?.status !== 'inactive');
    addNotification({
      title: isNowInactive ? '⏸️ Perfil Inactivado / Pausado' : '✅ Perfil Reactivado',
      message: isNowInactive
        ? 'Tu perfil ha sido puesto en pausa. Tus inmuebles no recibirán nuevas consultas hasta que lo reactives.'
        : 'Tu perfil ha sido reactivado con éxito y está visible en la plataforma.',
      category: 'Sistema',
      type: isNowInactive ? 'alert' : 'success'
    });
  };

  /**
   * Elimina el perfil del usuario actual permanentemente
   */
  const deleteCurrentUser = () => {
    if (!currentUser) return;
    const targetId = currentUser.id;
    const targetEmail = currentUser.email.toLowerCase();

    // Eliminar de la lista de usuarios registrados
    setRegisteredUsers(prev => {
      const updated = prev.filter(u => u.id !== targetId && u.email.toLowerCase() !== targetEmail);
      localStorage.setItem('alquipy_registered_users', JSON.stringify(updated));
      return updated;
    });

    // Retirar de la lista local los anuncios asociados con la cuenta eliminada.
    // La eliminación de datos de servicios externos requiere un backend propio.
    setProperties(prev => prev.filter(property =>
      property.ownerId ? property.ownerId !== targetId : property.ownerEmail?.toLowerCase() !== targetEmail
    ));

    // Cerrar cualquier resto de sesión en Firebase.
    firebaseAuth.signOut().catch(() => {});

    // Limpiar sesión activa
    setCurrentUser(null);
    setUserRole('visitor');
    localStorage.removeItem('alquipy_current_user');
    localStorage.removeItem('alquipy_firebase_user');
    setCurrentView('home');

    addNotification({
      title: 'Cuenta de acceso eliminada',
      message: 'Se eliminó la cuenta de autenticación y los datos locales asociados en este navegador.',
      category: 'Sistema',
      type: 'alert'
    });
  };

  /**
   * Limpia todas las sesiones y usuarios de prueba para empezar 100% desde cero
   */
  const resetAllTestData = () => {
    localStorage.removeItem('alquipy_current_user');
    localStorage.removeItem('alquipy_firebase_user');
    localStorage.removeItem('alquipy_registered_users');
    localStorage.removeItem('nde_rogara_registered_users');
    localStorage.removeItem('alquipy_notifications');
    localStorage.removeItem('alquipy_favorites');
    localStorage.removeItem('alquipy_chat_messages');
    firebaseAuth.signOut().catch(() => {});
    setCurrentUser(null);
    setUserRole('visitor');
    setRegisteredUsers([]);
    setNotifications([]);
    setFavorites([]);
    setCompareList([]);
    setChatMessages([]);
    setCurrentView('home');
  };

  // Listener para sincronización de chat entre pestañas (BroadcastChannel) y Firebase Auth
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel('alquipy_realtime_chat');
        channel.onmessage = (event) => {
          if (event.data?.type === 'NEW_CHAT_MESSAGE') {
            setChatMessages(prev => {
              if (prev.some(m => m.id === event.data.message.id)) return prev;
              return [...prev, event.data.message];
            });
            soundManager.playMessageReceived();
          }
        };
      } catch {}
    }

    const unsubscribeFb = firebaseAuth.isConfigured() ? firebaseAuth.onAuthStateChanged((fbUser) => {
      if (fbUser?.email) {
        // El token de Firebase es la única fuente autorizada para el rol.
        // localStorage guarda preferencias del perfil, nunca permisos administrativos.
        const registered = readStored<UserProfile[]>('alquipy_registered_users', [], isList);
        const existing = registered.find(u => u.id === fbUser.uid && u.email.toLowerCase() === fbUser.email?.toLowerCase());
        if (existing?.status === 'inactive') return;
        const verified: UserProfile = {
          id: fbUser.uid,
          email: fbUser.email,
          name: existing?.name || fbUser.displayName || fbUser.email.split('@')[0],
          role: fbUser.role === 'admin' ? 'admin' : 'landlord',
          status: 'active',
          phone: existing?.phone || '',
          city: existing?.city,
          avatar: existing?.avatar,
        };
        setCurrentUser(verified);
        setUserRole(verified.role);
        localStorage.setItem('alquipy_current_user', JSON.stringify(verified));
        // No navegar automáticamente si el usuario está editando su perfil.
      } else if (!firebaseAuth.getCurrentUser()) {
        setCurrentUser(null);
        setUserRole('visitor');
        localStorage.removeItem('alquipy_current_user');
      }
    }) : () => {};

    return () => {
      channel?.close();
      unsubscribeFb();
    };
  }, []);

  /**
   * Prueba el servicio de correo SMTP configurado por el anunciante
   */
  const testSmtpConnection = async (): Promise<boolean> => {
    // El frontend no puede probar SMTP ni declarar un envío exitoso.
    // El Centro de correo utiliza el backend autenticado cuando está configurado.
    return false;
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleCompare = (id: string) => {
    setCompareList(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 3) {
        alert('Podés comparar un máximo de 3 propiedades simultáneamente.');
        return prev;
      }
      return [...prev, id];
    });
  };

  const removeFromCompare = (id: string) => {
    setCompareList(prev => prev.filter(item => item !== id));
  };

  const payTenantMonthly = (paymentId: string) => {
    setTenantPayments(prev => 
      prev.map(item => {
        if (item.id === paymentId) {
          return {
            ...item,
            status: 'En revisión',
            paymentDate: new Date().toLocaleDateString('es-PY'),
            receiptNumber: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
            paymentMethod: 'Transferencia Bancaria',
            receiptFile: 'Comprobante_adjunto_PDF.pdf'
          };
        }
        return item;
      })
    );

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title: 'Comprobante remitido para verificación',
      message: `Tu comprobante de pago fue enviado al propietario para su revisión y confirmación.`,
      category: 'Pagos',
      dateText: 'Ahora',
      read: false,
      type: 'reminder'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  /**
   * Pantalla 31: Revisar pagos con motivo de rechazo
   */
  const reviewPayment = (paymentId: string, action: 'approve' | 'reject', reason?: string) => {
    setTenantPayments(prev => 
      prev.map(item => {
        if (item.id === paymentId) {
          return {
            ...item,
            status: action === 'approve' ? 'Pagado' : 'Pendiente',
            rejectionReason: action === 'reject' ? reason : undefined
          };
        }
        return item;
      })
    );
  };

  const recordLandlordPayment = (rentalId: string) => {
    setLandlordRentals(prev => 
      prev.map(item => {
        if (item.id === rentalId) {
          return {
            ...item,
            status: 'Pagado',
            lastPaymentDate: new Date().toLocaleDateString('es-PY')
          };
        }
        return item;
      })
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  const openEditPropertyModal = (property: Property) => {
    const admin = userRole === 'admin' && isLocalAdmin();
    if (property.moderationStatus === 'removed' && !admin) return;
    if (!admin && (!currentUser || (property.ownerId ? property.ownerId !== currentUser.id : property.ownerEmail?.toLowerCase() !== currentUser.email.toLowerCase()))) return;
    // Editar siempre el registro actual; no el objeto antiguo de una tarjeta.
    const latest = properties.find(item => item.id === property.id);
    if (!latest) return;
    setEditingProperty({...latest, images:[...(latest.images||[])], videos:[...(latest.videos||[])]});
    setIsPublishModalOpen(true);
  };

  const addProperty = async (newProp: Property):Promise<void> => {
    if (!currentUser || currentUser.status === 'inactive' || !(userRole === 'landlord' || userRole === 'admin' && isLocalAdmin())) return;
    const propWithStatus: Property = {
      ...newProp,
      // Se fija el propietario a la sesión activa para evitar suplantaciones desde formularios.
      ownerId: currentUser.id,
      ownerEmail: currentUser.email,
      createdAt: new Date().toISOString(),
      moderationStatus: 'flagged',
      moderationReason: 'Evaluando contenido',
      moderationRequestedAt: new Date().toISOString(),
      isVerified: false,
      verifiedAt: undefined,
      isActive: false
    };
    const alertReason = evaluateListing(propWithStatus);
    // El texto permitido no requiere intervención. Las fotos y videos siguen
    // pendientes porque no se puede certificar su seguridad solo con palabras.
    const mediaPending = (propWithStatus.images?.length || 0) > 0 || (propWithStatus.videos?.length || 0) > 0;
    const flagged = Boolean(alertReason || mediaPending);
    propWithStatus.moderationStatus = flagged ? 'flagged' : 'approved';
    propWithStatus.moderationRequestedAt = flagged ? new Date().toISOString() : undefined;
    propWithStatus.moderationReason = alertReason || (mediaPending ? 'Fotografías o videos pendientes de verificación' : undefined);
    propWithStatus.isActive = !flagged;
    // Guardar primero: si el navegador agotó su cuota, el formulario mostrará
    // el problema sin cerrar ni dar por publicada una operación incompleta.
    const cloud=await saveCloudProperty(propWithStatus);
    const updated = [cloud, ...properties.filter(p=>p.id!==cloud.id)];
    try{persistPropertyList(updated);}catch{/* Guardado compartido correcto: no cancelar el anuncio por cuota local. */}
    setProperties(updated);
    if (flagged) recordModeration(propWithStatus, 'flagged',
      alertReason || 'Pendiente de revisión administrativa',
      alertReason ? 'Filtro automático (revisión pendiente)' : 'Control previo a publicación');
    addNotification({
      title: flagged ? 'Aviso pendiente de revisión' : 'Aviso publicado',
      message: flagged ? `El aviso «${propWithStatus.title}» quedó pendiente de revisión: ${propWithStatus.moderationReason}.` : `El aviso «${propWithStatus.title}» pasó el filtro de texto y se publicó.`,
      category: 'Propiedades',
      type: flagged ? 'alert' : 'success'
    });
  };

  const updateProperty = async (updated: Property):Promise<void> => {
    if (currentUser?.status === 'inactive') return;
    const admin = userRole === 'admin' && isLocalAdmin();
    const previous = properties.find(p => p.id === updated.id);
    if (previous?.moderationStatus === 'removed' && !admin) return;
    if (!previous || (!admin && (!currentUser || (previous.ownerId ? previous.ownerId !== currentUser.id : previous.ownerEmail?.toLowerCase() !== currentUser.email.toLowerCase())))) return;
    // Un propietario no puede eliminar el estado de bloqueo mediante la edición del anuncio.
    const guarded: Property = {
      ...updated,
      // El aviso no puede cambiar de propietario ni reescribir su fecha original por edición.
      ownerId: previous.ownerId,
      ownerEmail: previous.ownerEmail,
      createdAt: previous.createdAt,
      // Cada edición requiere nueva revisión para conservar un distintivo confiable.
      moderationStatus: 'flagged', moderationReason: 'Evaluando edición',
      isVerified: false, verifiedAt: undefined, isActive: false,
    };
    const nextFlag = evaluateListing(guarded);
    // Revisión visual solo si se añaden fotografías o videos nuevos.
    // Reordenar portada, quitar medios o corregir datos no despublica un aviso aprobado.
    const mediaAdded =
      guarded.images.some(url=>!previous.images.includes(url)) ||
      (guarded.videos||[]).some(url=>!(previous.videos||[]).includes(url));
    const pendingReview = previous.moderationStatus === 'flagged';
    const flagged=Boolean(nextFlag || mediaAdded || pendingReview);
    guarded.moderationStatus=flagged?'flagged':'approved';
    guarded.moderationRequestedAt=flagged
      ? (nextFlag || mediaAdded ? new Date().toISOString() : previous.moderationRequestedAt || previous.createdAt)
      : undefined;
    guarded.moderationReason=nextFlag ||
      (mediaAdded?'Fotografías o videos nuevos pendientes de verificación':
        pendingReview?previous.moderationReason:undefined);
    guarded.isActive=flagged?false:previous.isActive!==false;
    guarded.isVerified=flagged?false:previous.isVerified;
    guarded.verifiedAt=flagged?undefined:previous.verifiedAt;
    if(flagged && !admin && (nextFlag || mediaAdded)) recordModeration(guarded,'flagged',
      guarded.moderationReason||'Requiere revisión',
      nextFlag?'Filtro automático de texto':'Multimedia nueva pendiente de revisión');

    const cloud=await saveCloudProperty(guarded);
    const list = properties.map(p => p.id === updated.id ? cloud : p);
    try{persistPropertyList(list);}catch{/* El servidor conserva los cambios aunque se llene el navegador. */}
    setProperties(list);
    // El formulario se cierra solo al confirmar: no reiniciar antes de mostrar éxito.
    addNotification({
      title: flagged ? 'Edición pendiente' : 'Inmueble actualizado',
      message: flagged ? `«${updated.title}» requiere revisión: ${guarded.moderationReason}.` : `«${updated.title}» pasó el filtro de texto.`,
      category: 'Propiedades',
      type: flagged ? 'alert' : 'success'
    });
  };

  const moderateProperty = async (id: string, action: 'approved' | 'removed', reason: string):Promise<void> => {
    if (!currentUser || userRole !== 'admin' || !isLocalAdmin()) return;
    const target = properties.find(p => p.id === id);
    if (!target || !reason.trim()) return;
    const owner = registeredUsers.find(user => user.role === 'landlord' && ownerPropertyMatch(target, user));
    // Aun con aprobación manual, nunca reactivar un aviso de una cuenta sancionada.
    if (action === 'approved' && owner?.status === 'inactive') return;
    await moderateCloudProperty(id,action,reason.trim());
    const approvedAt = new Date().toISOString();
    const next: Property = {
      ...target, moderationStatus: action, moderationReason: reason.trim(),
      moderatedAt: approvedAt, moderationRequestedAt: undefined, isActive: action === 'approved',
      isVerified: action === 'approved', verifiedAt: action === 'approved' ? approvedAt : undefined,
    };
    setProperties(prev => prev.map(p => p.id === id ? next : p));
    recordModeration(next, action, reason.trim(), currentUser.email);
    // Sólo una infracción confirmada por el administrador genera una sanción.
    // Primera infracción: suspensión. Reincidencia: bloqueo LOCAL de la cuenta.
    // No se toman estas decisiones únicamente por coincidencia de palabras.
    if (action === 'removed' && target.moderationStatus !== 'removed') {
      const owner = registeredUsers.find(user => user.role === 'landlord' && ownerPropertyMatch(target, user));
      if (owner) {
        const count = (owner.confirmedViolations || 0) + 1;
        const restrictionStage = count === 1 ? 'suspended' : 'blocked';
        const nextUsers: UserProfile[] = registeredUsers.map(user => user.id === owner.id ? {
          ...user, status: 'inactive', confirmedViolations: count, restrictionStage,
        } : user);
        setRegisteredUsers(nextUsers);
        localStorage.setItem('alquipy_registered_users', JSON.stringify(nextUsers));
        setProperties(prev => prev.map(property => ownerPropertyMatch(property, owner) ? { ...property, isActive: false } : property));
        recordAdminUserAction(owner, 'suspended', `${restrictionStage === 'blocked' ? 'Bloqueo' : 'Suspensión'} por infracción confirmada: ${reason.trim()}`, currentUser.email,
          properties.filter(property => ownerPropertyMatch(property, owner)).length);
        addNotification({
          title: restrictionStage === 'blocked' ? 'Cuenta bloqueada' : 'Cuenta suspendida',
          message: `Se registró una infracción confirmada en «${target.title}»: ${reason.trim()}. Consultá a administración.`,
          type: 'alert', category: 'Sistema', recipientEmail: owner.email,
        });
      }
    }
    addNotification({ title: action === 'removed' ? 'Aviso retirado por administración' : 'Aviso aprobado', message: `«${next.title}»: ${reason.trim()}`, category: 'Propiedades', type: action === 'removed' ? 'alert' : 'success', recipientEmail: next.ownerEmail, recipientPhone: next.ownerPhone, propertyTitle: next.title });
  };

  const deleteProperty = (id: string) => {
    const target = properties.find(p => p.id === id);
    if (!target || currentUser?.status === 'inactive' || (userRole === 'admin' && !isLocalAdmin()) || (userRole !== 'admin' && (!currentUser || (target.ownerId ? target.ownerId !== currentUser.id : target.ownerEmail?.toLowerCase() !== currentUser.email.toLowerCase())))) return;
    if (userRole === 'admin') recordModeration(target, 'removed', 'Aviso eliminado definitivamente por administración', currentUser?.email || 'admin');
    setReviews(prev => prev.filter(review => review.propertyId !== id));
    setProperties(prev => {
      const list = prev.filter(p => p.id !== id);
      localStorage.setItem('nde_rogara_properties', JSON.stringify(list));
      localStorage.setItem('alquipy_properties', JSON.stringify(list));
      return list;
    });
    addNotification({
      title: '🗑️ Inmueble Eliminado',
      message: 'La propiedad fue retirada de tus publicaciones.',
      category: 'Propiedades',
      type: 'alert'
    });
  };

  const togglePropertyStatus = (id: string) => {
    const target = properties.find(p => p.id === id);
    if (!target || currentUser?.status === 'inactive' || target.moderationStatus === 'removed' || target.moderationStatus === 'flagged' || (userRole !== 'admin' && (!currentUser || (target.ownerId ? target.ownerId !== currentUser.id : target.ownerEmail?.toLowerCase() !== currentUser.email.toLowerCase())))) return;
    let title = '';
    let willBeActive = true;
    setProperties(prev => {
      const updated = prev.map(p => {
        if (p.id === id) {
          title = p.title;
          const nextActive = p.isActive === false ? true : false;
          willBeActive = nextActive;
          return { ...p, isActive: nextActive };
        }
        return p;
      });
      localStorage.setItem('nde_rogara_properties', JSON.stringify(updated));
      localStorage.setItem('alquipy_properties', JSON.stringify(updated));
      return updated;
    });

    addNotification({
      title: willBeActive ? '🟢 Inmueble Publicado' : '⏸️ Inmueble Pausado',
      message: willBeActive 
        ? `"${title || 'El inmueble'}" ahora está activo y visible para todos en el catálogo público.`
        : `"${title || 'El inmueble'}" fue pausado (inactivo) y ya no se mostrará en las búsquedas ni mapa público.`,
      category: 'Propiedades',
      type: willBeActive ? 'success' : 'alert'
    });
  };

  const clearAllProperties = () => {
    setProperties([]);
    localStorage.setItem('nde_rogara_properties', JSON.stringify([]));
    localStorage.setItem('alquipy_properties', JSON.stringify([]));
    addNotification({
      title: '🗑️ Catálogo Limpio',
      message: 'Se han eliminado todas las propiedades de prueba. El catálogo ahora está listo para cargar tus publicaciones reales.',
      category: 'Propiedades',
      type: 'alert'
    });
  };

  const restoreDefaultProperties = () => {
    setProperties(INITIAL_PROPERTIES);
    localStorage.setItem('nde_rogara_properties', JSON.stringify(INITIAL_PROPERTIES));
    localStorage.setItem('alquipy_properties', JSON.stringify(INITIAL_PROPERTIES));
    addNotification({
      title: '🔄 Inmuebles de Prueba Restaurados',
      message: 'Se restauraron las propiedades predeterminadas del sistema.',
      category: 'Propiedades',
      type: 'success'
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const openPropertyDetail = (id: string) => {
    setSelectedPropertyId(id);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AppContext.Provider
      value={{
        userRole,
        setUserRole: handleSetUserRole,
        currentUser,
        registeredUsers,
        loginUser,
        registerUser,
        bootstrapLocalAdmin,
        loginDevAdmin,
        loginDevOwner,
        adminSetUserStatus,
        adminDeleteUser,
        logoutUser,
        updateUserProfile,
        toggleAccountStatus,
        deleteCurrentUser,
        resetAllTestData,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        currentView,
        setCurrentView,
        selectedPropertyId,
        setSelectedPropertyId,
        properties,
        favorites,
        toggleFavorite,
        compareList,
        toggleCompare,
        removeFromCompare,
        isCompareOpen,
        setIsCompareOpen,
        tenantPayments,
        payTenantMonthly,
        reviewPayment,
        landlordRentals,
        recordLandlordPayment,
        notifications,
        addNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        contract,
        authorizeRentalAcquisition,
        finalizeRentalContract,
        signContract,
        isPremium,
        setIsPremium,
        isPremiumModalOpen,
        setIsPremiumModalOpen,
        isPublishModalOpen,
        setIsPublishModalOpen,
        addProperty,
        updateProperty,
        deleteProperty,
        moderateProperty,
        reviewModeration,
        togglePropertyStatus,
        clearAllProperties,
        restoreDefaultProperties,
        editingProperty,
        setEditingProperty,
        openEditPropertyModal,
        filters,
        setFilters,
        resetFilters,
        openPropertyDetail,
        smtpConfig,
        setSmtpConfig,
        reminders,
        setReminders,
        emailLogs,
        testSmtpConnection,
        isReviewModalOpen,
        setIsReviewModalOpen,
        selectedPaymentForReview,
        openPaymentReview,
        nearbyPlaces,
        addNearbyPlace,
        removeNearbyPlace,
        reviews,
        addReview,
        visitSchedule,
        updateVisitStatus,
        rentalApplications,
        addRentalApplication,
        updateApplicationStatus,
        isApplicationModalOpen,
        setIsApplicationModalOpen,
        applicationProperty,
        openApplicationModal,
        chatMessages,
        sendChatMessage,
        isChatOpen,
        setIsChatOpen,
        chatRecipient,
        openChatWith
      }}
    >

      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
