import React, { useEffect, useState } from 'react';
import { Camera, CheckCircle2, Globe, Image, Mail, MessageCircle, Save, Trash2, UserRound, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { UserProfile } from '../../types';

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
  const { currentUser, updateUserProfile, setCurrentView } = useApp();
  const [form, setForm] = useState<ProfileFields>(() => profileOf(currentUser));
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
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
  </main>;
};
