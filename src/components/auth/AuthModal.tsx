import React, { useEffect, useState } from 'react';
import { AlertCircle, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { firebaseAuth, formatFirebaseAuthError } from '../../services/firebaseAuth';
import type { UserProfile } from '../../types';
import { canUseLocalDevAdmin, LOCAL_DEV_ADMIN_EMAIL, LOCAL_DEV_OWNER_EMAIL } from '../../services/adminAccessMode';

const hex = (array: Uint8Array) => Array.from(array).map(v => v.toString(16).padStart(2, '0')).join('');
const fromHex = (value: string) => new Uint8Array(value.match(/.{1,2}/g)?.map(x => parseInt(x, 16)) || []);
async function digest(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const result = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 250000, hash: 'SHA-256' }, key, 256);
  return hex(new Uint8Array(result));
}
async function encodePassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2:${hex(salt)}:${await digest(password, salt)}`;
}
async function verifyPassword(password: string, encoded?: string, admin = false): Promise<boolean> {
  if (!encoded) return false;
  if (!encoded.startsWith('pbkdf2:')) return !admin && encoded === password; // Legado solo para propietarios de prueba.
  const [, salt, hash] = encoded.split(':');
  return Boolean(salt && hash && await digest(password, fromHex(salt)) === hash);
}

/** Alta administrativa inicial disponible ÚNICAMENTE en desarrollo local, no en un despliegue público. */
export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode, loginUser, registerUser, bootstrapLocalAdmin, loginDevAdmin, loginDevOwner, registeredUsers, setCurrentView } = useApp();
  const [adminSetup, setAdminSetup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const local = !firebaseAuth.isConfigured();
  const allowDevAdmin = canUseLocalDevAdmin();
  const hasAdmin = registeredUsers.some(u => u.role === 'admin');
  const allowBootstrap = import.meta.env.DEV && local && !hasAdmin;
  useEffect(() => {
    // Limpiar también el correo y el nombre: cada apertura empieza sin credenciales precargadas.
    setError(''); setAdminSetup(false); setEmail(''); setPassword('');
    setPasswordConfirm(''); setName(''); setPhone(''); setAcceptedPolicy(false);
  }, [authModalMode, isAuthModalOpen]);

  // Los secretos de las cuentas de demostración quedan en el servidor Vite local.
  // Nunca se incluyen contraseñas en el código fuente ni en el bundle de producción.
  const authorizeLocalDemo = async (mail: string, secret: string): Promise<boolean> => {
    const result = await fetch('/__nde_local_auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, password: secret }),
    });
    return result.ok;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    const mail = email.trim().toLowerCase();
    if (!mail || password.length < (adminSetup ? 12 : 6)) {
      setError(`Ingresá un correo válido y una contraseña de al menos ${adminSetup ? 12 : 6} caracteres.`); return;
    }
    if ((adminSetup || authModalMode === 'register') && !name.trim()) { setError('Completá el nombre.'); return; }
    if (!adminSetup && authModalMode === 'register' && !phone.trim()) { setError('Completá un teléfono de contacto.'); return; }
    if (adminSetup && password !== passwordConfirm) { setError('Las contraseñas no coinciden.'); return; }
    if (!adminSetup && authModalMode==='register' && !acceptedPolicy) { setError('Tenés que leer y aceptar las políticas de publicación y uso.'); return; }
    setBusy(true);
    try {
      if (!adminSetup && authModalMode === 'login' && allowDevAdmin && mail === LOCAL_DEV_ADMIN_EMAIL) {
        // Cuentas predeterminadas exclusivamente para demos locales; nunca autorización Firebase.
        if (!(await authorizeLocalDemo(mail, password)) || !loginDevAdmin()) throw new Error('Credenciales de demostración inválidas o no configuradas en .env.local.');
      } else if (!adminSetup && authModalMode === 'login' && allowDevAdmin && mail === LOCAL_DEV_OWNER_EMAIL) {
        if (!(await authorizeLocalDemo(mail, password)) || !loginDevOwner()) throw new Error('Credenciales de demostración inválidas o cuenta suspendida.');
      } else if (adminSetup) {
        if (!allowBootstrap) throw new Error('El administrador ya existe o la configuración inicial no está disponible.');
        const hashed = await encodePassword(password);
        const profile: UserProfile = { id: `local-admin-${crypto.randomUUID()}`, role: 'admin', name: name.trim(), email: mail, password: hashed, status: 'active' };
        if (!bootstrapLocalAdmin(profile)) throw new Error('No se pudo crear la cuenta de administrador.');
      } else if (firebaseAuth.isConfigured()) {
        if (authModalMode === 'register') {
          const fb = await firebaseAuth.signUpWithEmail(mail, password, name.trim(), 'landlord');
          registerUser({ id: fb.uid, role: 'landlord', name: name.trim(), email: mail, phone: phone.trim(), policyAcceptedAt: new Date().toISOString(), status: 'active' });
        } else {
          const fb = await firebaseAuth.signInWithEmail(mail, password, 'landlord');
          // Un perfil local NO debe otorgar funciones administrativas a una cuenta Firebase.
          const profile = registeredUsers.find(u => u.id === fb.uid && u.email.toLowerCase() === mail && u.role === 'landlord');
          if (profile?.status === 'inactive') { await firebaseAuth.signOut(); throw new Error('Esta cuenta está suspendida. Contactá a administración.'); }
          loginUser(profile || { id: fb.uid, name: fb.displayName || mail.split('@')[0], email: mail, role: 'landlord', phone: '', status: 'active' });
        }
      } else if (authModalMode === 'register') {
        if (registeredUsers.some(u => u.email.toLowerCase() === mail)) throw new Error('Ese correo ya está registrado.');
        registerUser({ id: `local-${crypto.randomUUID()}`, role: 'landlord', name: name.trim(), email: mail, phone: phone.trim(), password: await encodePassword(password), policyAcceptedAt: new Date().toISOString(), status: 'active' });
      } else {
        const account = registeredUsers.find(u => u.email.toLowerCase() === mail && (u.role === 'landlord' || u.role === 'admin'));
        if (!account || !(await verifyPassword(password, account.password, account.role === 'admin')))
          throw new Error('Correo o contraseña incorrectos. Si es tu primera vez, configurá el administrador local.');
        if (account.status === 'inactive') throw new Error('Esta cuenta está suspendida. Contactá a administración.');
        loginUser(account);
      }
    } catch (err) {
      setError(err instanceof Error ? (firebaseAuth.isConfigured() ? formatFirebaseAuthError(err) : err.message) : 'No se pudo ingresar.');
    } finally { setBusy(false); }
  };

  return <Modal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} maxWidth="md" title={adminSetup ? 'Crear administrador local' : authModalMode === 'register' ? 'Registrarse como propietario' : 'Ingresar a mi cuenta'}>
    <form onSubmit={submit} autoComplete="off" className="space-y-4">
      {adminSetup ? <p className="text-sm text-slate-700 bg-sky-50 rounded-xl p-3">Configuración inicial del panel de administración <strong>para pruebas en este navegador</strong>. Elegí tu propio correo y contraseña. No hay claves predeterminadas.</p> : <p className="text-sm text-slate-600">Buscá y contactá propiedades sin cuenta. Ingresá para gestionar tus publicaciones o el panel de administración.</p>}
      {(adminSetup || authModalMode === 'register') && <label className="block text-sm font-semibold">Nombre completo<input required value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200" autoComplete="name" /></label>}
      {!adminSetup && authModalMode === 'register' && <label className="block text-sm font-semibold">Teléfono / WhatsApp<input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0981 123456" className="mt-1 w-full p-3 rounded-xl border border-slate-200" /></label>}
      <label className="block text-sm font-semibold">Correo electrónico<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200" autoComplete="off" /></label>
      <label className="block text-sm font-semibold">Contraseña<input required type="password" minLength={adminSetup ? 12 : 6} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200" autoComplete="off" /></label>
      {adminSetup && <label className="block text-sm font-semibold">Confirmar contraseña<input required type="password" minLength={12} value={passwordConfirm} onChange={e => setPasswordConfirm(e.target.value)} className="mt-1 w-full p-3 rounded-xl border border-slate-200" autoComplete="new-password" /></label>}
      {!adminSetup && authModalMode === 'register' && <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-2 text-xs text-slate-700">
        <p className="font-bold">Antes de registrarte</p>
        <p>Solo se admiten inmuebles reales en alquiler. Se rechazan fotos sexuales, violentas, ilegales, publicidad ajena al rubro, insultos y reseñas ofensivas. El contenido puede retirarse por infracción.</p>
        <button type="button" className="font-bold text-brand-700 underline" onClick={()=>{setIsAuthModalOpen(false);setCurrentView('policy');}}>Leer políticas completas</button>
        <label className="flex gap-2 items-start cursor-pointer"><input type="checkbox" checked={acceptedPolicy} onChange={e=>setAcceptedPolicy(e.target.checked)} className="mt-0.5" required />Leí y acepto las políticas de publicaciones, moderación y contratación de Nde Rogarã.</label>
      </div>}
      {error && <p role="alert" className="flex items-start gap-2 text-xs text-red-700 p-3 bg-red-50 rounded-xl"><AlertCircle className="w-4 h-4 shrink-0" />{error}</p>}
      {local && <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-xl p-3"><LockKeyhole className="w-4 h-4 shrink-0" />Las cuentas y sus contraseñas derivadas se guardan solo en este navegador. No tienen seguridad de servidor ni funcionan en otros dispositivos. No usar con datos reales.</p>}
      {!local && <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-xl p-3"><ShieldCheck className="w-4 h-4 shrink-0" />Con Firebase conectado, el administrador debe habilitarse mediante permisos verificados en un servidor. Crear una cuenta de propietario no concede privilegios.</p>}
      <button disabled={busy} className="w-full p-3 rounded-xl bg-brand-600 text-white font-bold disabled:opacity-60" type="submit">{busy ? 'Procesando...' : adminSetup ? 'Crear mi administrador' : authModalMode === 'register' ? 'Crear cuenta de propietario' : 'Ingresar'}</button>
      {allowBootstrap && authModalMode === 'login' && <button type="button" className="w-full border border-sky-300 bg-sky-50 text-sky-800 rounded-xl p-3 text-sm font-bold flex items-center justify-center gap-2" onClick={() => { setAdminSetup(v => !v); setError(''); setPassword(''); setPasswordConfirm(''); }}><KeyRound className="w-4 h-4" />{adminSetup ? 'Volver al inicio de sesión' : 'Configurar administrador (primera vez)'}</button>}
      {!adminSetup && <button type="button" className="w-full text-center text-brand-700 text-sm font-bold py-2" onClick={() => setAuthModalMode(authModalMode === 'register' ? 'login' : 'register')}>{authModalMode === 'register' ? 'Ya tengo una cuenta' : 'Crear cuenta para publicar'}</button>}
    </form>
  </Modal>;
};
