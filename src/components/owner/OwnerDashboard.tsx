import { InstagramIcon as Instagram, FacebookIcon as Facebook } from '../common/SocialIcons';
import React, { useEffect, useState } from 'react';
import { Plus, Edit3, Trash2, Pause, Play, FileText, Download, Upload, MapPin, ExternalLink, AlertTriangle, Star, MessageCircle, Images, Video } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { effectiveOwnerPlan, ownerHasProperty, readOwnerPlan, ownerMediaUsage, canFeatureProperty, toggleOwnerFeatured } from '../../data/publicationPlans';
import { socialShareLinks } from '../../services/socialLinks';
import { formatGs } from '../../utils/formatters';
import { getLocalMetrics } from '../../services/localMetrics';
import { getLocalInvoices, viewFiscalInvoice, INVOICES_CHANGED } from '../../services/invoices';
import { PrivateDocumentRecord, listPrivateDocuments, storePrivateDocument, removePrivateDocument, downloadPrivateDocument } from '../../services/privateDocuments';

export const OwnerDashboard: React.FC = () => {
  const { currentUser, userRole, properties, setCurrentView, setIsPublishModalOpen, openEditPropertyModal, deleteProperty, togglePropertyStatus, openPropertyDetail } = useApp();
  const [docsPropertyId, setDocsPropertyId] = useState<string | null>(null);
  const [docs, setDocs] = useState<PrivateDocumentRecord[]>([]);
  const [docError, setDocError] = useState('');
  const [planVersion, setPlanVersion] = useState(0);
  const [message,setMessage] = useState('');
  const [invoiceRevision,setInvoiceRevision] = useState(0);
  const [receiptNotice,setReceiptNotice] = useState('');
  useEffect(() => { const refresh = () => setInvoiceRevision(v=>v+1); window.addEventListener(INVOICES_CHANGED, refresh); return ()=>window.removeEventListener(INVOICES_CHANGED,refresh); }, []);
  useEffect(() => { const cb = () => setPlanVersion(v => v + 1); window.addEventListener('nderogara-plan-updated', cb); return () => window.removeEventListener('nderogara-plan-updated', cb); }, []);
  const plan = effectiveOwnerPlan(currentUser?.id);
  const selection = readOwnerPlan(currentUser?.id);
  const myInvoices = getLocalInvoices().filter(inv=>inv.ownerId===currentUser?.id);
  void invoiceRevision;
  void planVersion;
  if (!currentUser || (userRole !== 'landlord' && userRole !== 'admin')) return <div className="max-w-xl mx-auto p-8">Iniciá sesión como propietario para administrar tus publicaciones.</div>;
  const myProperties = properties.filter(p => ownerHasProperty(p, currentUser));
  const activeCount = myProperties.filter(p => p.isActive !== false).length;
  const media = ownerMediaUsage(myProperties,currentUser);
  const featuredCount=myProperties.filter(p=>canFeatureProperty(p,properties,currentUser.id)).length;
  const toggleFeatured = (id:string) => {try{toggleOwnerFeatured(currentUser.id,id,properties,currentUser.email);setMessage('Destacados actualizados. Los cambios se reflejan en Inicio y el mapa.');}catch(e){setMessage(e instanceof Error?e.message:'No se pudo cambiar el destacado.');}};
  const share=(p:typeof properties[number],platform:'whatsapp'|'facebook'|'instagram')=>{
    const targets=socialShareLinks(p);
    if(platform==='instagram'){void navigator.clipboard?.writeText(`Mirá este inmueble en Nde Rogarã: ${p.title}, ${p.city}. ${targets.url}`).then(()=>setMessage('Texto copiado para publicar en Instagram.'));window.open(targets.instagram,'_blank','noopener,noreferrer');return;}
    window.open(targets[platform],'_blank','noopener,noreferrer');
  };
  const openDocs = async (id: string) => { setDocError(''); setDocsPropertyId(id); try { setDocs(await listPrivateDocuments(currentUser.id, id)); } catch { setDocError('No se pudieron leer los archivos almacenados en este navegador.'); } };
  const upload = async (file?: File) => {
    if (!file || !docsPropertyId) return;
    try { setDocError(''); await storePrivateDocument(currentUser.id, docsPropertyId, file); setDocs(await listPrivateDocuments(currentUser.id, docsPropertyId)); }
    catch (err) { setDocError(err instanceof Error ? err.message : 'Error al guardar el documento'); }
  };
  const remove = async (docId: string) => {
    if (!docsPropertyId || !window.confirm('¿Eliminar este documento del almacenamiento local?')) return;
    try { await removePrivateDocument(currentUser.id, docsPropertyId, docId); setDocs(await listPrivateDocuments(currentUser.id, docsPropertyId)); }
    catch { setDocError('No se pudo eliminar el archivo.'); }
  };
  const toggle = (p: typeof properties[number]) => {
    if (p.isActive === false && userRole !== 'admin' && (!plan || activeCount >= plan.maxActive)) {
      window.alert('No podés activar más anuncios: revisá tu plan y su vigencia.'); return;
    }
    togglePropertyStatus(p.id);
  };
  return <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-20 space-y-7">
    <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center"><div><h1 className="text-3xl font-black text-slate-900">Mis publicaciones</h1><p className="text-sm text-slate-500 mt-1">Administrá tus avisos, fotos, disponibilidad y documentos privados.</p></div><button onClick={() => plan || userRole === 'admin' ? setIsPublishModalOpen(true) : setCurrentView('plans')} className="rounded-xl bg-brand-600 text-white px-5 py-3 font-bold text-sm flex items-center gap-2 justify-center"><Plus className="w-4 h-4" />Nuevo inmueble</button></div>
    {myInvoices.length > 0 && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
      <div><h2 className="text-base font-black text-slate-900">Mis comprobantes</h2><p className="mt-1 text-xs text-slate-500">Consultá y descargá tus comprobantes. El envío automático se realiza al contratar; los reenvíos posteriores son exclusivos de Administración.</p></div>
      {receiptNotice && <p className="rounded-xl bg-sky-50 p-3 text-xs text-sky-900" role="status">{receiptNotice}</p>}
      <div className="space-y-2">{myInvoices.slice(0,10).map(invoice=><div key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
        <div><p className="text-sm font-bold">{invoice.documentNumber} · {invoice.planName}</p><p className="text-xs text-slate-500">{invoice.customerEmail} · {formatGs(invoice.amount)}</p></div>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold" onClick={()=>void viewFiscalInvoice(invoice.id).catch(e=>setReceiptNotice(e instanceof Error?e.message:'No se pudo abrir.'))}>Ver comprobante</button>
        </div>
      </div>)}</div>
    </section>}
    <section className="grid sm:grid-cols-3 gap-3"><div className="bg-white rounded-2xl p-5 border border-slate-200"><div className="text-xs text-slate-500">Inmuebles cargados</div><strong className="text-2xl">{myProperties.length}</strong></div><div className="bg-white rounded-2xl p-5 border border-slate-200"><div className="text-xs text-slate-500">Avisos visibles</div><strong className="text-2xl">{activeCount}</strong></div><div className="bg-white rounded-2xl p-5 border border-slate-200"><div className="text-xs text-slate-500">Plan de publicación</div><strong className="block text-lg">{plan?.name || (userRole === 'admin' ? 'Administrador' : 'Sin plan vigente')}</strong>{plan && <p className="text-xs mt-1 text-slate-500">{activeCount} de {plan.maxActive} avisos activos · {media.photos} foto(s) · {media.videos} video(s)</p>}</div></section>
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 justify-between sm:items-center"><div className="text-sm text-amber-900"><strong>Estado de tu suscripción.</strong> {selection ? `Vigente hasta ${new Date(selection.expiresAt).toLocaleDateString('es-PY')}.` : 'Todavía no seleccionaste un plan.'} <span className="text-xs text-amber-800">Demostración local, sin cobros bancarios.</span></div><button className="shrink-0 border border-amber-400 rounded-xl px-4 py-2 text-xs font-bold text-amber-900" onClick={() => setCurrentView('plans')}>Ver planes</button></div>
    {message && <div role="status" className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-800">{message}<button onClick={()=>setMessage('')} className="ml-3 text-xs underline">Cerrar</button></div>}
    {plan && <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs text-slate-700"><span className="flex items-center gap-1"><Images size={15} className="text-sky-600"/> {plan.photoMode==='pooled'?`Fotos utilizadas: ${media.photos} / ${plan.maxPhotos} en total`:`Hasta ${plan.maxPhotos} fotos por anuncio`}</span><span className="flex items-center gap-1"><Video size={15} className="text-sky-600"/> Videos: {media.videos} / {plan.maxVideos}</span>{plan.maxFeatured>0&&<span className="flex items-center gap-1"><Star size={15} className="text-sky-600"/> Destacados: {featuredCount} / {plan.maxFeatured}</span>}</div>}
    {myProperties.length === 0 ? <div className="text-center p-12 rounded-2xl border border-slate-200 bg-white space-y-2"><h2 className="text-xl font-bold">Aún no tenés inmuebles cargados</h2><p className="text-sm text-slate-500">Podés empezar creando tu primera publicación.</p></div> : <div className="grid md:grid-cols-2 gap-4">{myProperties.map(p => <article key={p.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4"><img className="w-28 sm:w-36 h-36 object-cover rounded-xl shrink-0 bg-slate-100" src={p.images[0]} alt={p.title} /><div className="min-w-0 flex-1 space-y-2"><div className="flex justify-between gap-2"><span className={`text-[11px] rounded-lg font-semibold px-2 py-1 ${p.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>{p.moderationStatus === 'flagged' ? 'En revisión' : p.moderationStatus === 'removed' ? 'Retirado por administración' : p.isActive === false ? 'Pausado' : 'Publicado'}</span><span className="text-xs font-bold text-brand-700">{formatGs(p.priceMonth)}/mes</span></div><h2 className="text-sm font-black text-slate-900 line-clamp-2">{p.title}</h2>{p.moderationReason && <p className="text-[11px] text-red-700 bg-red-50 p-2 rounded-lg">Moderación: {p.moderationReason}. Consultá a la administración si corresponde.</p>}
      {['premium','professional'].includes(plan?.id || '') && <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg">Estadísticas de este navegador: <strong>{getLocalMetrics(p.id).views}</strong> vistas · <strong>{getLocalMetrics(p.id).whatsapp + getLocalMetrics(p.id).calls}</strong> contactos{plan?.id === 'professional' && ` (${getLocalMetrics(p.id).whatsapp} WhatsApp, ${getLocalMetrics(p.id).calls} llamadas)`}</p>}<p className="text-xs text-slate-500 flex gap-1 items-center"><MapPin className="w-3.5 h-3.5" />{p.city}, {p.neighborhood}</p><div className="flex flex-wrap gap-2 pt-1">
      {plan?.maxFeatured ? <button title="Elegir inmuebles destacados" className={`text-xs font-bold px-2 py-1.5 rounded-lg flex items-center gap-1 ${canFeatureProperty(p,properties,currentUser.id)?'bg-sky-100 text-sky-800':'bg-slate-100 text-slate-700'}`} onClick={()=>toggleFeatured(p.id)}><Star size={14} fill={canFeatureProperty(p,properties,currentUser.id)?'currentColor':'none'}/>{canFeatureProperty(p,properties,currentUser.id)?'Destacado':'Destacar'}</button> : null}
      <button className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 flex items-center gap-1" onClick={()=>share(p,'whatsapp')}><MessageCircle size={14}/>WhatsApp</button>
      {plan && plan.id!=='basic' && <button className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-blue-50 text-blue-800 flex items-center gap-1" onClick={()=>share(p,'facebook')}><Facebook size={14}/>Facebook</button>}
      {plan && plan.id!=='basic' && <button className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-pink-50 text-pink-800 flex items-center gap-1" onClick={()=>share(p,'instagram')}><Instagram size={14}/>Instagram</button>}
      <button className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-brand-50 text-brand-700 flex items-center gap-1" onClick={() => openEditPropertyModal(p)}><Edit3 className="w-3.5 h-3.5" />Editar</button>
      <button disabled={p.moderationStatus === 'removed' || p.moderationStatus === 'flagged'} className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 flex items-center gap-1 disabled:opacity-40" onClick={() => toggle(p)}>{p.isActive === false ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}{p.isActive === false ? 'Activar' : 'Pausar'}</button>
      <button className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 flex items-center gap-1" onClick={() => openDocs(p.id)}><FileText className="w-3.5 h-3.5" />Documentos</button>
      <button title="Ver ficha" className="text-xs font-semibold p-1.5 rounded-lg bg-slate-100" onClick={() => openPropertyDetail(p.id)}><ExternalLink className="w-4 h-4" /></button>
      <button disabled={p.moderationStatus === 'removed'} title="Eliminar anuncio" className="text-xs p-1.5 rounded-lg bg-rose-50 text-rose-700" onClick={() => { if (window.confirm('¿Eliminar definitivamente este aviso?')) deleteProperty(p.id); }}><Trash2 className="w-4 h-4" /></button>
    </div></div></article>)}</div>}
    {docsPropertyId && <div className="fixed inset-0 z-[75] bg-slate-950/60 p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Documentos privados"><section className="w-full max-w-lg bg-white rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"><div className="flex items-center justify-between"><h2 className="font-black text-lg">Documentos del inmueble</h2><button className="text-sm px-3 py-1.5 rounded-xl bg-slate-100" onClick={() => setDocsPropertyId(null)}>Cerrar</button></div><p className="text-xs text-slate-600">Solo son visibles en el panel de este propietario. Se guardan en este navegador mediante IndexedDB; <strong>no son privados frente a otras personas con acceso a este dispositivo y no se sincronizan.</strong> No cargues contratos reales hasta tener un servidor con permisos seguros.</p><label className="cursor-pointer inline-flex items-center gap-2 bg-brand-600 text-white text-xs font-bold px-4 py-3 rounded-xl"><Upload className="w-4 h-4" />Agregar PDF o imagen (máx. 10 MB)<input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" className="hidden" onChange={e => { void upload(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>{docError && <p role="alert" className="text-xs text-red-700">{docError}</p>}{docs.length === 0 ? <p className="text-xs text-slate-500">No hay documentos cargados.</p> : <div className="space-y-2">{docs.map(d => <div className="flex justify-between gap-2 p-3 border border-slate-200 rounded-xl" key={d.id}><div className="min-w-0"><p className="text-xs font-bold break-all">{d.name}</p><p className="text-[11px] text-slate-500">{(d.size / 1024).toFixed(0)} KB</p></div><div className="flex gap-2"><button title="Descargar" onClick={() => downloadPrivateDocument(d)}><Download className="w-4 h-4 text-brand-600" /></button><button title="Eliminar" onClick={() => void remove(d.id)}><Trash2 className="w-4 h-4 text-red-600" /></button></div></div>)}</div>}<p className="text-xs flex gap-2 text-amber-800"><AlertTriangle className="w-4 h-4 shrink-0" />La plataforma no certifica legalmente contratos ni garantiza operaciones inmobiliarias.</p></section></div>}
  </main>;
};
