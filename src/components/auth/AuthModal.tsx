import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Home, LockKeyhole, Mail, Phone, UserRound } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { firebaseAuth, formatFirebaseAuthError } from '../../services/firebaseAuth';
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
  if (!encoded.startsWith('pbkdf2:')) return !admin && encoded === password;
  const [, salt, hash] = encoded.split(':');
  return Boolean(salt && hash && await digest(password, fromHex(salt)) === hash);
}

const input = 'block w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10';
const label = 'block space-y-1.5 text-sm font-semibold text-slate-700';

/** Acceso y registro unificados: los permisos de administración nunca se conceden desde el registro. */
export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen, setIsAuthModalOpen, authModalMode, setAuthModalMode,
    loginUser, registerUser, loginDevAdmin, loginDevOwner, registeredUsers, setCurrentView
  } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const registering = authModalMode === 'register';

  useEffect(() => {
    setName(''); setEmail(''); setPhone(''); setPassword('');
    setConfirmPassword(''); setShowPassword(false);
    setAcceptedPolicy(false); setError(''); setResetMode(false); setResetSent(false);
  }, [authModalMode, isAuthModalOpen]);

  const authorizeLocalDemo = async (mail: string, secret: string): Promise<boolean> => {
    const response = await fetch('/__nde_local_auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mail, password: secret })
    });
    return response.ok;
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!email.trim()) { setError('Ingresá tu correo electrónico.'); return; }
    setBusy(true);
    try {
      await firebaseAuth.requestPasswordReset(email);
      // Respuesta neutral para no revelar si un usuario existe.
      setResetSent(true);
    } catch (err) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/invalid-email') setError('Ingresá una dirección de correo válida.');
      else if (code === 'auth/too-many-requests') setError('Demasiados intentos. Probá nuevamente más tarde.');
      else setError('No se pudo enviar el enlace. Intentá nuevamente.');
    } finally { setBusy(false); }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    const mail = email.trim().toLowerCase();
    if (!mail || password.length < 6) {
      setError('Ingresá un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    if (registering) {
      if (!name.trim() || !phone.trim()) { setError('Completá tu nombre y número de contacto.'); return; }
      if (password !== confirmPassword) { setError('Las contraseñas no coinciden.'); return; }
      if (!acceptedPolicy) { setError('Debés aceptar las políticas para crear una cuenta.'); return; }
    }
    if (import.meta.env.PROD && !firebaseAuth.isConfigured()) {
      setError('El servicio de cuentas no está disponible. Contactá al soporte de Nde Rogarã.');
      return;
    }
    setBusy(true);
    try {
      if (!registering && canUseLocalDevAdmin() && mail === LOCAL_DEV_ADMIN_EMAIL) {
        if (!(await authorizeLocalDemo(mail, password)) || !loginDevAdmin()) throw new Error('Correo o contraseña incorrectos.');
      } else if (!registering && canUseLocalDevAdmin() && mail === LOCAL_DEV_OWNER_EMAIL) {
        if (!(await authorizeLocalDemo(mail, password)) || !loginDevOwner()) throw new Error('Correo o contraseña incorrectos.');
      } else if (firebaseAuth.isConfigured()) {
        if (registering) {
          const fb = await firebaseAuth.signUpWithEmail(mail, password, name.trim(), 'landlord');
          registerUser({
            id: fb.uid, role: 'landlord', name: name.trim(), email: mail,
            phone: phone.trim(), policyAcceptedAt: new Date().toISOString(), status: 'active'
          });
        } else {
          const fb = await firebaseAuth.signInWithEmail(mail, password, 'landlord');
          // Solo los claims firmados de Firebase conceden permisos administrativos.
          const isAdmin = await firebaseAuth.isVerifiedAdmin();
          const profile = registeredUsers.find(u => u.id === fb.uid && u.email.toLowerCase() === mail && u.role === 'landlord');
          if (profile?.status === 'inactive') {
            await firebaseAuth.signOut();
            throw new Error('Esta cuenta está suspendida. Contactá a soporte.');
          }
          loginUser({
            id: fb.uid,
            name: profile?.name || fb.displayName || mail.split('@')[0],
            email: mail,
            role: isAdmin ? 'admin' : 'landlord',
            phone: profile?.phone || '',
            status: 'active'
          });
        }
      } else if (registering) {
        if (registeredUsers.some(u => u.email.toLowerCase() === mail)) throw new Error('Este correo ya está registrado.');
        registerUser({
          id: `local-${crypto.randomUUID()}`, role: 'landlord', name: name.trim(),
          email: mail, phone: phone.trim(), password: await encodePassword(password),
          policyAcceptedAt: new Date().toISOString(), status: 'active'
        });
      } else {
        const account = registeredUsers.find(u => u.email.toLowerCase() === mail && (u.role === 'landlord' || u.role === 'admin'));
        if (!account || !(await verifyPassword(password, account.password, account.role === 'admin'))) {
          throw new Error('Correo o contraseña incorrectos.');
        }
        if (account.status === 'inactive') throw new Error('Esta cuenta está suspendida. Contactá a soporte.');
        loginUser(account);
      }
    } catch (err) {
      setError(err instanceof Error
        ? (firebaseAuth.isConfigured() && 'code' in err ? formatFirebaseAuthError(err) : err.message)
        : 'No pudimos completar la operación. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      maxWidth="md"
      title={resetMode ? 'Recuperar contraseña' : registering ? 'Crear cuenta' : 'Iniciar sesión'}
    >
      <form onSubmit={resetMode ? resetPassword : submit} className="space-y-5" autoComplete="on">
        <div className="flex items-center gap-3 pb-1">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <Home size={23} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-slate-900">Nde Rogarã</h3>
            <p className="text-sm text-slate-500">
              {resetMode ? 'Te enviaremos un enlace para establecer una nueva contraseña.' : registering ? 'Creá tu perfil para publicar inmuebles.' : 'Bienvenido de nuevo a tu espacio.'}
            </p>
          </div>
        </div>

        {!resetMode && registering && (
          <>
            <label className={label}>
              <span>Nombre completo</span>
              <span className="relative block">
                <UserRound aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                <input required className={input} value={name} onChange={e => setName(e.target.value)}
                  placeholder="Nombre y apellido" autoComplete="name" maxLength={120} />
              </span>
            </label>
            <label className={label}>
              <span>Teléfono / WhatsApp</span>
              <span className="relative block">
                <Phone aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                <input required className={input} type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="Ej. 0981 123456" autoComplete="tel" maxLength={30} />
              </span>
            </label>
          </>
        )}

        <label className={label}>
          <span>Correo electrónico</span>
          <span className="relative block">
            <Mail aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
            <input required type="email" className={input} value={email} onChange={e => setEmail(e.target.value)}
              placeholder="nombre@correo.com" autoComplete="email" maxLength={254} />
          </span>
        </label>
        {!resetMode && <label className={label}>
          <span>Contraseña</span>
          <span className="relative block">
            <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
            <input required type={showPassword ? 'text' : 'password'} className={input + ' pr-12'}
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={registering ? 'new-password' : 'current-password'}
              minLength={6} placeholder={registering ? 'Mínimo 6 caracteres' : 'Ingresá tu contraseña'} />
            <button type="button" onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              className="absolute right-3 top-2.5 rounded-lg p-1.5 text-slate-400 transition hover:text-sky-700">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </span>
        </label>}

        {!resetMode && !registering && <button type="button" className="-mt-2 block w-full text-right text-sm font-bold text-sky-700 hover:underline" onClick={() => { setResetMode(true); setResetSent(false); setError(''); setPassword(''); }}>¿Olvidaste tu contraseña?</button>}

        {!resetMode && registering && (
          <>
            <label className={label}>
              <span>Confirmar contraseña</span>
              <span className="relative block">
                <LockKeyhole aria-hidden="true" size={18} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                <input required type={showPassword ? 'text' : 'password'} className={input}
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu contraseña" autoComplete="new-password" minLength={6} />
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 text-xs leading-relaxed text-slate-600">
              <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
                checked={acceptedPolicy} onChange={e => setAcceptedPolicy(e.target.checked)} required />
              <span>
                Acepto las{' '}
                <button type="button" className="font-bold text-sky-700 underline underline-offset-2 hover:text-sky-900"
                  onClick={e => { e.preventDefault(); setIsAuthModalOpen(false); setCurrentView('policy'); }}>
                  políticas de publicación y uso
                </button>
                {' '}de Nde Rogarã.
              </span>
            </label>
          </>
        )}

        {resetMode && resetSent && <p role="status" className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-800">Si el correo está registrado con contraseña, recibirás un enlace de recuperación. Revisá también la carpeta de spam.</p>}
        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />{error}
          </p>
        )}
        <button type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-60">
          {busy ? 'Procesando…' : resetMode ? 'Enviar enlace de recuperación' : registering ? 'Crear mi cuenta' : 'Ingresar'}
          {!busy && <ArrowRight size={17} aria-hidden="true" />}
        </button>
        <div className="border-t border-slate-100 pt-4 text-center text-sm text-slate-500">
          {resetMode ? '¿Recordaste tu contraseña?' : registering ? '¿Ya tenés una cuenta?' : '¿Todavía no tenés una cuenta?'}{' '}
          <button type="button" className="font-bold text-sky-700 hover:text-sky-900 hover:underline"
            onClick={() => { setError(''); if (resetMode) { setResetMode(false); setResetSent(false); } else setAuthModalMode(registering ? 'login' : 'register'); }}>
            {resetMode ? 'Volver a iniciar sesión' : registering ? 'Iniciá sesión' : 'Registrate'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
