import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Globe, Image, Mail, MessageCircle, Save, Trash2, UserRound, Users, KeyRound, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { UserProfile } from '../../types';
import { firebaseAuth, formatFirebaseAuthError } from '../../services/firebaseAuth';

type ProfileFields = Pick<UserProfile,
  'name' | 'phone' | 'city' | 'avatar' | 'publicContactEmail' | 'whatsapp1Name' | 'whatsapp2' |
  'whatsapp2Name' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'website'>;

const profileOf = (user: UserProfile | null): ProfileFields => ({
  name: user?.name || '', phone: user?.phone || '', city: user?.city || '',
  avatar: user?.avatar || '', publicContactEmail: user?.publicContactEmail || '',
  whatsapp1Name: user?.whatsapp1Name || user?.name || '',
  whatsapp2: user?.whatsapp2 || '', whatsapp2Name: user?.whatsapp2Name || '',
  instagram: user?.instagram || '', facebook: user?.facebook || '',
  tiktok: user?.tiktok || '', youtube: user?.youtube || '', website: user?.website || '',
});

const phoneValid = (value: string) => value.replace(/\D/g, '').length >= 8;
const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
const fieldClass = 'block space-y-2 text-xs font-bold text-slate-700';

/** Miniatura de perfil con límite de tamaño para no saturar localStorage. */
async function resizeAvatar(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Elegí una imagen JPG, PNG o WebP.');
  if (file.size > 6 * 1024 * 1024) throw new Error('La imagen original no puede superar 6 MB.');
  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 320 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('El navegador no pudo preparar la fotografía.');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL('image/jpeg', 0.76);
    if (result.length > 420_000) throw new Error('La foto es demasiado grande para el perfil.');
    return result;
  } finally { image.close(); }
}

export const ProfileView: React.FC = () => {
  const { currentUser, updateUserProfile, setCurrentView, deleteCurrentUser } = useApp();
  const [form, setForm] = useState<ProfileFields>(() => profileOf(currentUser));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  useEffect(() => { setForm(profileOf(currentUser)); setNotice(''); setError(''); }, [currentUser?.id]);

  if (!currentUser) return <div className="p-8">Iniciá sesión para editar tu perfil.</div>;
  const set = (key: keyof ProfileFields, value: string) => { setForm(current => ({ ...current, [key]: value })); setNotice(''); };

  const upload = async (file?: File) => {
    if (!file) return;
    setProcessing(true); setError('');
    try { set('avatar', await resizeAvatar(file)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo leer la imagen.'); }
    finally { setProcessing(false); }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (!form.name?.trim()) { setError('Ingresá un nombre para identificar tu perfil.'); return; }
    if (!phoneValid(form.phone || '')) { setError('El WhatsApp principal debe tener al menos 8 dígitos.'); return; }
    if (form.whatsapp2 && !phoneValid(form.whatsapp2)) { setError('Revisá el número del segundo contacto.'); return; }
    if (form.whatsapp2 && !form.whatsapp2Name?.trim()) { setError('Indicá quién atenderá el segundo WhatsApp.'); return; }
    try {
      updateUserProfile(Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value?.trim() || ''])));
      setNotice('Perfil guardado. Estos datos estarán disponibles al crear nuevas publicaciones.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el perfil.'); }
  };

  const errorMessage = (cause: unknown): string => {
    const code = (cause as { code?: string })?.code || '';
    if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') return 'La contraseña actual es incorrecta.';
    if (code === 'auth/requires-recent-login') return 'Por seguridad, cerrá sesión y volvé a ingresar antes de continuar.';
    if (code === 'auth/weak-password') return 'Elegí una contraseña más segura.';
    if (code === 'auth/popup-closed-by-user') return 'Cerraste la verificación de Google.';
    return cause instanceof Error ? ('code' in cause ? formatFirebaseAuthError(cause) : cause.message) : 'No se pudo completar la operación.';
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    if (newPassword.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return; }
    if (newPassword !== confirmNewPassword) { setError('La confirmación de contraseña no coincide.'); return; }
    setSecurityBusy(true);
    try {
      await firebaseAuth.changePassword(currentPassword, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
      setNotice('Contraseña actualizada correctamente.');
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setSecurityBusy(false); }
  };

  const removeAccount = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (deleteConfirmation !== 'ELIMINAR') {
      setError('Escribí ELIMINAR para confirmar la eliminación.'); return;
    }
    setSecurityBusy(true);
    try {
      // Primero eliminar en Firebase; solo después retirar el perfil local.
      await firebaseAuth.permanentlyDeleteAccount(deletePassword);
      deleteCurrentUser();
    } catch (cause) { setError(errorMessage(cause)); setSecurityBusy(false); }
  };

  const textField = (name: string, key: keyof ProfileFields, placeholder: string, type = 'text', required = false) => (
    <label className={fieldClass} key={key}>{name}{required ? ' *' : ''}
      <input className={inputClass} type={type} value={form[key] || ''} required={required}
        onChange={event => set(key, event.target.value)} placeholder={placeholder} />
    </label>
  );

  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
    <header><p className="text-xs font-bold uppercase tracking-wider text-sky-700">Mi cuenta</p><h1 className="mt-1 text-3xl font-black text-slate-950">Mi perfil</h1><p className="mt-2 text-sm text-slate-600">Configurá tus contactos y redes sociales. Se completarán al crear un aviso y podrás modificarlos en cada publicación.</p></header>
    <form className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]" onSubmit={save}>
      <aside className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm h-fit">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border border-sky-100 bg-sky-50">
            {form.avatar ? <img src={form.avatar} alt="Foto o logo del perfil" className="h-full w-full object-cover"/> : <UserRound className="h-12 w-12 text-sky-600"/>}
          </div>
          <p className="font-black text-slate-900">{form.name || currentUser.name}</p>
          <p className="max-w-full break-words text-xs text-slate-500">{currentUser.email}</p>
        </div>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-700 px-3 py-3 text-sm font-bold text-white hover:bg-sky-800">
          <Camera size={17}/> {processing ? 'Procesando foto…' : 'Subir foto o logo'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={processing} onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ''; }}/>
        </label>
        {form.avatar && <button type="button" onClick={() => set('avatar', '')} className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Trash2 size={15}/> Quitar imagen</button>}
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><Image size={15} className="mt-0.5 shrink-0"/>Se guarda una miniatura optimizada en este navegador. No subas documentos personales.</p>
      </aside>

      <div className="space-y-5">
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><UserRound className="text-sky-700" size={19}/> Información del perfil</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField('Nombre', 'name', 'Tu nombre o nombre comercial', 'text', true)}
            {textField('Ciudad de origen (opcional)', 'city', 'Ej.: Asunción')}
            <label className={fieldClass}>Correo de acceso a la cuenta<input value={currentUser.email} readOnly className={`${inputClass} bg-slate-50 text-slate-500`}/></label>
            {textField('Correo para consultas (opcional)', 'publicContactEmail', 'consultas@dominio.com', 'email')}
          </div>
          <p className="flex items-center gap-2 text-xs text-slate-500"><Mail size={15}/>El correo de acceso no cambia aquí; el correo para consultas es opcional y público al publicar.</p>
        </section>
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><MessageCircle className="text-sky-700" size={19}/> Atención por WhatsApp</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField('WhatsApp principal', 'phone', '0981 123456', 'tel', true)}
            {textField('Nombre de quien atiende WhatsApp 1', 'whatsapp1Name', 'Nombre de contacto')}
            {textField('WhatsApp adicional (opcional)', 'whatsapp2', '0982 123456', 'tel')}
            {textField('Nombre de quien atiende (opcional)', 'whatsapp2Name', 'Ej.: Soporte de alquileres')}
          </div>
          <p className="text-xs text-slate-500">Los números se usarán como contactos directos en tus anuncios, salvo que los cambies al publicar.</p>
        </section>
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><Globe className="text-sky-700" size={19}/> Redes sociales y sitio web</h2>
          <p className="text-xs text-slate-500">Todos estos campos son opcionales. Los enlaces aparecerán en los anuncios si tu plan permite redes sociales.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {textField('Instagram', 'instagram', '@inmobiliaria')}
            {textField('Facebook', 'facebook', 'facebook.com/mi-pagina')}
            {textField('TikTok', 'tiktok', '@miusuario')}
            {textField('YouTube', 'youtube', 'youtube.com/@mi-canal')}
            <div className="sm:col-span-2">{textField('Sitio web', 'website', 'https://misitio.com.py', 'url')}</div>
          </div>
        </section>
        {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-800">{error}</p>}
        {notice && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={18}/>{notice}</p>}
        <div className="flex flex-wrap gap-3"><button disabled={processing} type="submit" className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-6 py-3 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-60"><Save size={17}/>Guardar perfil</button><button type="button" onClick={() => setCurrentView('landlord-rentals')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700"><Users size={17}/>Mis publicaciones</button></div>
      </div>
    </form>

    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black text-slate-950"><KeyRound size={20} className="text-sky-700" /> Seguridad de la cuenta</h2>
        <p className="mt-1 text-sm text-slate-500">Administrá el acceso a tu cuenta de Nde Rogarã.</p>
      </div>
      <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-slate-100 p-4">
        <h3 className="font-bold text-slate-900">Cambiar contraseña</h3>
        <p className="text-xs text-slate-500">Disponible para cuentas con acceso por correo y contraseña. Si ingresás con Google, administrá tu contraseña desde Google.</p>
        <div className="grid gap-3 md:grid-cols-3">
          <label className={fieldClass}>Contraseña actual
            <input required type="password" autoComplete="current-password" className={inputClass} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          </label>
          <label className={fieldClass}>Nueva contraseña
            <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </label>
          <label className={fieldClass}>Confirmar contraseña
            <input required type="password" minLength={8} autoComplete="new-password" className={inputClass} value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
          </label>
        </div>
        <button type="submit" disabled={securityBusy} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50">Actualizar contraseña</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 p-4">
        <div>
          <h3 className="flex items-center gap-2 font-bold text-rose-800"><ShieldAlert size={18}/> Eliminar mi cuenta</h3>
          <p className="mt-1 max-w-xl text-xs text-slate-600">La eliminación de acceso es permanente y no se puede deshacer. Tus publicaciones y demás datos pueden requerir una eliminación adicional del almacenamiento de la plataforma.</p>
        </div>
        <button type="button" onClick={() => { setDeleteDialog(true); setDeletePassword(''); setDeleteConfirmation(''); setError(''); }} className="rounded-xl border border-rose-300 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-50">Eliminar cuenta</button>
      </div>
      {deleteDialog && <form onSubmit={removeAccount} className="space-y-3 rounded-2xl border-2 border-rose-200 bg-rose-50/40 p-4">
        <h3 className="font-bold text-rose-900">Confirmar eliminación de cuenta</h3>
        <p className="text-sm text-slate-700">Se eliminará el acceso de <strong>{currentUser.email}</strong> en Firebase Authentication. Para continuar, escribí <strong>ELIMINAR</strong> y verificá tu identidad.</p>
        <label className={fieldClass}>Escribí ELIMINAR
          <input className={inputClass} value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} autoComplete="off" required />
        </label>
        <label className={fieldClass}>Contraseña actual (solo cuentas con contraseña; las cuentas Google mostrarán una ventana de verificación)
          <input className={inputClass} type="password" autoComplete="current-password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button disabled={securityBusy || deleteConfirmation !== 'ELIMINAR'} type="submit" className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Eliminar definitivamente</button>
          <button type="button" disabled={securityBusy} onClick={() => { setDeleteDialog(false); setDeletePassword(''); setDeleteConfirmation(''); setError(''); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold">Cancelar</button>
        </div>
      </form>}
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    </section>
  </main>;
};
