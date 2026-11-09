import React, { useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { defaultSiteBlocks, readSiteContent, saveSiteContent, SITE_BLOCK_KINDS, SITE_SECTIONS, blockDestination, type SiteBlock, type SiteBlockKind, type SiteSection } from '../../services/siteContent';
import { useApp } from '../../context/AppContext';

const sections: SiteSection[] = ['identity', 'navigation', 'support'];
const kinds: SiteBlockKind[] = ['text', 'link', 'whatsapp', 'phone', 'email', 'social', 'image'];
const field = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-sky-500';
const smallButton = 'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50';

/** Editor de bloques: solo disponible a través de la sesión administrativa local. */
export const SiteContentEditor: React.FC = () => {
  const { currentUser, userRole } = useApp();
  const [blocks, setBlocks] = useState<SiteBlock[]>(() => readSiteContent().blocks);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (userRole !== 'admin' || currentUser?.role !== 'admin') return null;

  const update = (id: string, patch: Partial<SiteBlock>) => {
    setBlocks(existing => existing.map(block => block.id === id ? { ...block, ...patch } : block));
    setMessage(''); setError('');
  };
  const add = (section: SiteSection) => setBlocks(existing => [...existing, { id: crypto.randomUUID(), kind: 'text', section, title: '', value: '' }]);
  const remove = (id: string) => setBlocks(existing => existing.filter(block => block.id !== id));
  const move = (id: string, direction: -1 | 1) => setBlocks(existing => {
    const current = existing.findIndex(block => block.id === id);
    if (current < 0) return existing;
    const neighbors = existing.flatMap((block, index) => block.section === existing[current].section ? [index] : []);
    const pos = neighbors.indexOf(current);
    const other = neighbors[pos + direction];
    if (other === undefined) return existing;
    const next = [...existing];
    [next[current], next[other]] = [next[other], next[current]];
    return next;
  });
  const save = () => {
    setError('');setMessage('');
    if (blocks.some(block => !block.title.trim() || !block.value.trim())) { setError('Completá el título y contenido de todos los bloques o eliminá los que no necesites.'); return; }
    const invalid = blocks.find(block => block.kind !== 'text' && !blockDestination(block));
    if (invalid) { setError(`Revisá la dirección o número del bloque «${invalid.title}».`); return; }
    try {
      saveSiteContent({ blocks });
      setMessage('Pie de página y canales de soporte actualizados en este navegador.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron guardar los cambios.'); }
  };
  const uploadImage = async (id: string, file?: File) => {
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 500_000) {
      setError('Para el pie de página usá JPG, PNG o WebP de hasta 500 KB.'); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string' && reader.result.length < 350_000) update(id, { value: reader.result });
      else setError('La imagen es demasiado grande para el almacenamiento local.');
    };
    reader.onerror = () => setError('No se pudo cargar la imagen.');
    reader.readAsDataURL(file);
  };

  return <section className="space-y-5">
    <div><h2 className="text-xl font-black text-slate-900">Contenido del sitio y soporte</h2><p className="mt-1 text-sm text-slate-500">Organizá el pie de página con bloques de texto, contactos, enlaces y fotos. Arrastrar no es necesario: usá las flechas para cambiar el orden.</p></div>
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900">Configuración local para la presentación del sistema. Para que todos los visitantes vean lo mismo y para limitar permisos de forma segura, se necesitará almacenamiento y autorización de servidor.</div>
    {sections.map(section => <div key={section} className="space-y-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-bold text-slate-900">{SITE_SECTIONS[section]}</h3><button type="button" onClick={() => add(section)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Plus size={16}/>Agregar bloque</button></div>
      {blocks.filter(block => block.section === section).length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No hay elementos. Agregá uno para mostrarlo en esta sección.</p>}
      {blocks.filter(block => block.section === section).map(block => <article key={block.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><strong className="text-sm text-slate-800">{block.title || 'Nuevo bloque'}</strong><div className="flex gap-1"><button type="button" title="Subir" aria-label="Subir bloque" className={smallButton} onClick={() => move(block.id, -1)}><ArrowUp size={15}/></button><button type="button" title="Bajar" aria-label="Bajar bloque" className={smallButton} onClick={() => move(block.id, 1)}><ArrowDown size={15}/></button><button type="button" title="Eliminar" aria-label="Eliminar bloque" className={`${smallButton} text-rose-700`} onClick={() => remove(block.id)}><Trash2 size={15}/></button></div></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-bold text-slate-700">Tipo de contenido<select className={field} value={block.kind} onChange={event => update(block.id, { kind: event.target.value as SiteBlockKind, value: '' })}>{kinds.map(kind => <option key={kind} value={kind}>{SITE_BLOCK_KINDS[kind]}</option>)}</select></label>
          <label className="space-y-1 text-xs font-bold text-slate-700">Ubicación<select className={field} value={block.section} onChange={event => update(block.id, { section: event.target.value as SiteSection })}>{sections.map(group => <option key={group} value={group}>{SITE_SECTIONS[group]}</option>)}</select></label>
          <label className="space-y-1 text-xs font-bold text-slate-700 sm:col-span-2">Título<input className={field} maxLength={120} value={block.title} onChange={event => update(block.id, { title: event.target.value })} placeholder="Ej.: WhatsApp de soporte" /></label>
          <label className="space-y-1 text-xs font-bold text-slate-700 sm:col-span-2">{block.kind === 'text' ? 'Descripción' : block.kind === 'image' ? 'URL de la imagen o subir archivo' : block.kind === 'link' ? 'Enlace web o sección (#search, #plans, #policy)' : 'Teléfono, correo o enlace'}
            {block.kind === 'text' ? <textarea rows={3} className={field} value={block.value} onChange={event => update(block.id, { value: event.target.value })}/> : <input className={field} value={block.kind === 'image' && block.value.startsWith('data:') ? '(imagen cargada)' : block.value} readOnly={block.kind === 'image' && block.value.startsWith('data:')} onChange={event => update(block.id, { value: event.target.value })} placeholder={block.kind === 'whatsapp' ? '0981 123456' : block.kind === 'phone' ? '(021) 123456' : block.kind === 'email' ? 'soporte@ejemplo.com.py' : 'https://...'} />}
          </label>
          {block.kind === 'image' && <label className="sm:col-span-2 inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-sky-700"><ImagePlus size={17}/>Subir imagen<input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void uploadImage(block.id, event.target.files?.[0]); event.currentTarget.value = ''; }}/></label>}
        </div>
      </article>)}
    </div>)}
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {message && <p role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800"><CheckCircle2 size={17}/>{message}</p>}
    <div className="flex flex-wrap gap-3"><button type="button" onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800"><Save size={17}/>Guardar cambios del sitio</button><button type="button" onClick={() => { setBlocks(defaultSiteBlocks.map(block => ({ ...block }))); setMessage(''); setError(''); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700"><RotateCcw size={16}/>Restablecer borrador</button></div>
  </section>;
};
