/**
 * Servicio: firebaseAuth.ts
 * Módulo: Firebase Authentication Oficial para AlquiPy
 * Propósito: Conexión con Google Firebase SDK oficial:
 * 1. Inicialización automática mediante variables de entorno Vite (VITE_FIREBASE_*)
 * 2. Inicio de sesión con Google (GoogleAuthProvider + signInWithPopup)
 * 3. Registro e inicio de sesión con Correo y Contraseña (createUserWithEmailAndPassword, signInWithEmailAndPassword)
 * 4. Sincronización reactiva de estado de sesión (onAuthStateChanged)
 * 5. Detección automática y modo de respaldo si las credenciales aún no fueron configuradas en .env
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged as fbOnAuthStateChanged,
  updateProfile,
  getIdTokenResult,
  Auth,
  User as FirebaseSDKUser
} from 'firebase/auth';
import { UserProfile, UserRole } from '../types';

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  organization?: string;
  providerId: 'google.com' | 'password' | 'anonymous';
  emailVerified: boolean;
  accessToken: string;
}

const STORAGE_KEY = 'nde_rogara_firebase_user';
const LEGACY_STORAGE_KEY = 'alquipy_firebase_user';
const listeners: Array<(user: FirebaseUser | null) => void> = [];

function notifyListeners(user: FirebaseUser | null) {
  listeners.forEach(fn => {
    try {
      fn(user);
    } catch {
      // Ignorar errores en callbacks
    }
  });
}

// Limpiador defensivo para remover comillas o espacios accidentales en .env
const cleanEnv = (val?: string) => (val || '').trim().replace(/^["']|["']$/g, '');

// Configuración leída de variables de entorno Vite (.env / .env.local)
export const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID)
};

// Determina si el proyecto tiene credenciales de Firebase configuradas
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'AIzaSy_TU_API_KEY_AQUI' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'tu-proyecto-id'
);

let firebaseApp: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    firebaseAuthInstance = getAuth(firebaseApp);
    console.info('✅ Conexión con Firebase Authentication inicializada con éxito.');
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar Firebase con la configuración provista:', err);
  }
} else {
  console.info('ℹ️ Firebase Auth: Pendiente de configurar archivo .env con tus credenciales de Firebase Console.');
}

/**
 * Traduce errores técnicos de Firebase a explicaciones claras con guía de solución
 */
export function formatFirebaseAuthError(err: any): string {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code.includes('configuration-not-found') || message.includes('configuration-not-found')) {
    return 'Falta activar los proveedores en Firebase Console: Ve a console.firebase.google.com -> Proyecto "nde-rogara" -> Authentication -> Pestaña "Sign-in method" y activa "Google" y "Correo electrónico/contraseña".';
  }
  if (code.includes('unauthorized-domain') || message.includes('unauthorized-domain')) {
    return 'Dominio no autorizado en Firebase: En Firebase Console ve a Authentication -> Settings -> Authorized domains y agrega "localhost".';
  }
  if (code.includes('popup-closed-by-user') || message.includes('popup-closed-by-user')) {
    return 'Ventana de Google cerrada antes de completar el inicio de sesión.';
  }
  if (code.includes('popup-blocked') || message.includes('popup-blocked')) {
    return 'El navegador bloqueó la ventana emergente de Google. Habilita las ventanas emergentes e inténtalo de nuevo.';
  }
  if (code.includes('email-already-in-use') || message.includes('email-already-in-use')) {
    return 'Este correo ya tiene una cuenta registrada. Por favor inicia sesión con tu contraseña.';
  }
  if (code.includes('wrong-password') || code.includes('invalid-credential') || message.includes('invalid-credential')) {
    return 'Correo o contraseña incorrectos. Verifica tus datos de acceso.';
  }
  if (code.includes('user-not-found') || message.includes('user-not-found')) {
    return 'No se encontró ninguna cuenta con este correo. Por favor regístrate primero.';
  }
  if (code.includes('weak-password') || message.includes('weak-password')) {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (code.includes('network-request-failed') || message.includes('network-request-failed')) {
    return 'Error de conexión a internet. Verifica tu red e intenta nuevamente.';
  }

  return message || 'Ocurrió un error inesperado al autenticar con Firebase.';
}

export class FirebaseAuthService {
  private currentUser: FirebaseUser | null = null;
  private auth: Auth | null = firebaseAuthInstance;

  constructor() {
    // 1. Restaurar sesión persistida de localStorage (purgando datos demo viejos)
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const isDemo = ['usr-tenant', 'usr-landlord', 'usr-agency'].includes(parsed?.uid) ||
                         ['ana@email.com', 'carlos@alquipy.com', 'contacto@inmobiliariaejemplo.com.py', 'inmobiliaria@alquipy.com.py', 'usuario@gmail.com', 'usuario@alquipy.com', 'admin@alquipy.com.py'].includes(parsed?.email?.toLowerCase());
          if (isDemo) {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(LEGACY_STORAGE_KEY);
            this.currentUser = null;
          } else {
            this.currentUser = parsed;
          }
        }
      } catch {
        this.currentUser = null;
      }
    }

    // 2. Si Firebase está activo, sincronizar con onAuthStateChanged oficial
    if (this.auth) {
      try {
        fbOnAuthStateChanged(this.auth, async (sdkUser: FirebaseSDKUser | null) => {
          if (sdkUser) {
            const token = await sdkUser.getIdToken();
            const claims = await getIdTokenResult(sdkUser);
            const existingRole: UserRole = claims.claims.admin === true ? 'admin' : 'landlord';
            const user: FirebaseUser = {
              uid: sdkUser.uid,
              email: sdkUser.email,
              displayName: sdkUser.displayName,
              photoURL: sdkUser.photoURL,
              role: existingRole,
              organization: this.currentUser?.organization,
              providerId: sdkUser.providerData[0]?.providerId === 'google.com' ? 'google.com' : 'password',
              emailVerified: sdkUser.emailVerified,
              accessToken: token
            };
            this.currentUser = user;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            notifyListeners(user);
          } else if (this.currentUser && isFirebaseConfigured) {
            this.currentUser = null;
            localStorage.removeItem(STORAGE_KEY);
            notifyListeners(null);
          }
        });
      } catch (err) {
        console.warn('Error suscribiendo a Firebase onAuthStateChanged:', err);
      }
    }
  }

  /**
   * Indica si Firebase cuenta con claves configuradas
   */
  isConfigured(): boolean {
    return isFirebaseConfigured && this.auth !== null;
  }

  /**
   * Obtiene el usuario actual
   */
  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  async getFreshIdToken(): Promise<string | null> {
    return this.auth?.currentUser ? this.auth.currentUser.getIdToken() : null;
  }

  /** Rol comprobado con claims firmados por Firebase, nunca por email/localStorage. */
  async isVerifiedAdmin(): Promise<boolean> {
    if (!this.auth?.currentUser) return false;
    const token = await getIdTokenResult(this.auth.currentUser, true);
    return token.claims.admin === true;
  }

  /**
   * Suscripción reactiva a cambios de sesión
   */
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    listeners.push(callback);
    callback(this.currentUser);
    return () => {
      const idx = listeners.indexOf(callback);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  }

  /**
   * Inicio de Sesión con Google
   */
  async signInWithGoogle(
    preferredRole: UserRole = 'tenant', 
    customEmail?: string, 
    customName?: string, 
    customOrg?: string
  ): Promise<FirebaseUser> {
    // Si Firebase oficial está conectado, usar signInWithPopup oficial
    if (this.auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(this.auth, provider);
        const token = await result.user.getIdToken();

        const user: FirebaseUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || customName || 'Usuario Google',
          photoURL: result.user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          role: (await getIdTokenResult(result.user)).claims.admin === true ? 'admin' : preferredRole,
          organization: preferredRole === 'agency' ? (customOrg || result.user.displayName || undefined) : undefined,
          providerId: 'google.com',
          emailVerified: result.user.emailVerified,
          accessToken: token
        };

        this.currentUser = user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        notifyListeners(user);
        return user;
      } catch (err: any) {
        console.error('Error en Firebase signInWithPopup:', err);
        throw err;
      }
    }

    // Si Firebase no está configurado en .env, no inventar usuarios falsos
    throw new Error('Debes configurar tus credenciales de Firebase en el archivo .env para iniciar sesión con Google. Por favor registrate con tu correo y contraseña.');
  }

  /**
   * Inicio de sesión con Correo y Contraseña
   */
  async signInWithEmail(email: string, pass: string, role: UserRole = 'tenant'): Promise<FirebaseUser> {
    if (this.auth) {
      try {
        const result = await signInWithEmailAndPassword(this.auth, email, pass);
        const token = await result.user.getIdToken();
        const isAdmin = (await getIdTokenResult(result.user, true)).claims.admin === true;

        const user: FirebaseUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || email.split('@')[0],
          photoURL: result.user.photoURL,
          role: isAdmin ? 'admin' : 'landlord',
          providerId: 'password',
          emailVerified: result.user.emailVerified,
          accessToken: token
        };

        this.currentUser = user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        notifyListeners(user);
        return user;
      } catch (err: any) {
        console.error('Error en Firebase signInWithEmailAndPassword:', err);
        throw err;
      }
    }

    // Modo respaldo local cuando no hay claves en .env
    const namePart = email.split('@')[0];
    const formattedName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const user: FirebaseUser = {
      uid: `firebase-uid-${Date.now()}`,
      email,
      displayName: formattedName || 'Usuario Nde Rogarã',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      role,
      providerId: 'password',
      emailVerified: true,
      accessToken: `fb-token-${Math.random().toString(36).substring(2)}`
    };

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyListeners(user);
    return user;
  }

  /**
   * Registro con Correo y Contraseña
   */
  async signUpWithEmail(
    email: string, 
    pass: string, 
    name: string, 
    role: UserRole, 
    organization?: string
  ): Promise<FirebaseUser> {
    if (this.auth) {
      try {
        const result = await createUserWithEmailAndPassword(this.auth, email, pass);
        if (name) {
          await updateProfile(result.user, { displayName: name });
        }
        const token = await result.user.getIdToken();

        const user: FirebaseUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: name || result.user.displayName,
          photoURL: result.user.photoURL,
          role,
          organization,
          providerId: 'password',
          emailVerified: result.user.emailVerified,
          accessToken: token
        };

        this.currentUser = user;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        notifyListeners(user);
        return user;
      } catch (err: any) {
        console.error('Error en Firebase createUserWithEmailAndPassword:', err);
        throw err;
      }
    }

    // Modo respaldo local
    const user: FirebaseUser = {
      uid: `firebase-uid-${Date.now()}`,
      email,
      displayName: name || 'Nuevo Usuario',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      role,
      organization,
      providerId: 'password',
      emailVerified: true,
      accessToken: `fb-token-${Math.random().toString(36).substring(2)}`
    };

    this.currentUser = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    notifyListeners(user);
    return user;
  }

  /**
   * Cerrar sesión
   */
  async signOut(): Promise<void> {
    if (this.auth) {
      try {
        await fbSignOut(this.auth);
      } catch (err) {
        console.warn('Error cerrando sesión en Firebase:', err);
      }
    }
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEY);
    notifyListeners(null);
  }

  /**
   * Convierte un FirebaseUser en el formato de UserProfile de la aplicación
   */
  toUserProfile(fbUser: FirebaseUser): UserProfile {
    return {
      id: fbUser.uid,
      name: fbUser.displayName || 'Usuario Nde Rogarã',
      email: fbUser.email || '',
      role: fbUser.role,
      avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      organization: fbUser.organization,
      status: 'active'
    };
  }
}

export const firebaseAuth = new FirebaseAuthService();
