import { InstagramIcon as Instagram, FacebookIcon as Facebook } from '../common/SocialIcons';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, BedDouble, Bath, Car, Ruler, MapPin, Phone, MessageCircle, CheckCircle2, ChevronLeft, ChevronRight, X, CalendarDays, Edit3, ArrowUpRight, Share2,  } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PropertyMap } from './PropertyMap';
import { PropertyReviews } from './PropertyReviews';
import { LocalVideoGallery } from './LocalVideoGallery';
import { socialProfileUrl } from '../../services/socialLinks';
import { formatGs, formatWhatsAppUrl } from '../../utils/formatters';
import { ownerHasProperty, isPropertyPublic } from '../../data/publicationPlans';
import { trackContactClick, trackPropertyView } from '../../services/localMetrics';

export const PropertyDetail: React.FC = () => {
  const { selectedPropertyId, properties, setCurrentView, userRole, currentUser, openEditPropertyModal } = useApp();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const property = properties.find(p => p.id === selectedPropertyId);
  useEffect(() => { if (property && property.isActive !== false) trackPropertyView(property.id); }, [property?.id]);
  if (!property || (!isPropertyPublic(property) && userRole !== 'admin' && !ownerHasProperty(property, currentUser))) return <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4"><h1 className="text-xl font-black">Este aviso no está disponible</h1><button className="text-brand-700 font-bold text-sm" onClick={() => setCurrentView('search')}>Volver al catálogo</button></div>;
  const canEdit = userRole === 'admin' || ownerHasProperty(property, currentUser);
  const contactReady = Boolean(property.ownerPhone?.replace(/\D/g, '').length >= 8);
  const whatsAppUrl = formatWhatsAppUrl(property.ownerPhone, `Hola, vi el aviso "${property.title}" en Nde Rogarã (${property.city}, ${formatGs(property.priceMonth)}/mes). ¿Sigue disponible?`);
  const photos = property.images?.filter(Boolean) || [];
  const movePhoto = (direction: number) => setPhotoIndex(p => (p + direction + photos.length) % photos.length);
  const contact = <div className="grid grid-cols-2 gap-3">
    <a aria-disabled={!contactReady} onClick={() => { if (contactReady) trackContactClick(property.id, 'whatsapp'); }} href={contactReady ? whatsAppUrl : undefined} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm ${contactReady ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}><MessageCircle className="w-4 h-4" />WhatsApp</a>
    <a aria-disabled={!contactReady} onClick={() => { if (contactReady) trackContactClick(property.id, 'calls'); }} href={contactReady ? `tel:${property.ownerPhone.replace(/[^\d+]/g, '')}` : undefined} className={`flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm ${contactReady ? 'bg-brand-600 hover:bg-brand-700 text-white' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}><Phone className="w-4 h-4" />Llamar</a>
  </div>;
  // Datos públicos que el propietario configuró al publicar el aviso.
  const otherPhone = property.ownerPhone2?.replace(/\D/g, '') || '';
  const otherWhatsapp = otherPhone.length >= 8 ? formatWhatsAppUrl(property.ownerPhone2 || '', `Hola, consulto por «${property.title}» en Nde Rogarã.`) : '';
  const extraSocials: Array<{ label: string; url: string | null }> = [
    { label: 'Instagram', url: socialProfileUrl(property.ownerInstagram, 'instagram') },
    { label: 'Facebook', url: socialProfileUrl(property.ownerFacebook, 'facebook') },
    { label: 'TikTok', url: socialProfileUrl(property.ownerTiktok, 'tiktok') },
    { label: 'YouTube', url: socialProfileUrl(property.ownerYoutube, 'youtube') },
    { label: 'Sitio web', url: socialProfileUrl(property.ownerWebsite, 'website') },
  ];
  // Los enlaces proceden exclusivamente de lo que el propietario publicó en este inmueble.
  const extraContacts = <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
    {property.ownerAvatar && <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
      <img src={property.ownerAvatar} alt="Imagen pública del propietario" className="h-12 w-12 rounded-xl border border-slate-200 object-cover" />
      <span className="text-xs font-semibold text-slate-700">{property.ownerName}</span>
    </div>}
    {contactReady && <div className="rounded-xl border border-slate-200 px-3 py-2.5">
      <span className="block text-[11px] font-semibold text-slate-500">Atención principal</span>
      <strong className="mt-1 block text-sm text-slate-800">{property.ownerPhoneName || property.ownerName}</strong>
      <span className="block text-xs text-slate-600">{property.ownerPhone}</span>
    </div>}
    {otherWhatsapp && <a href={otherWhatsapp} rel="noopener noreferrer" target="_blank" onClick={() => trackContactClick(property.id, 'whatsapp')}
      className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-emerald-800 transition hover:bg-emerald-100">
      <MessageCircle size={19} className="shrink-0"/>
      <span className="min-w-0"><span className="block text-xs font-black">WhatsApp adicional · {property.ownerPhone2Name || 'Otro contacto'}</span><span className="block text-xs">{property.ownerPhone2}</span></span>
      <ArrowUpRight size={15} className="ml-auto shrink-0"/>
    </a>}
    {property.ownerPublicEmail && <a href={`mailto:${property.ownerPublicEmail}`} className="flex items-center gap-2 break-all rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-bold text-sky-700 hover:bg-sky-100">
      Correo de consultas: {property.ownerPublicEmail} <ArrowUpRight size={14}/>
    </a>}
    {extraSocials.some(item => Boolean(item.url)) && <div>
      <p className="mb-2 text-xs font-bold text-slate-600">Redes sociales y sitio web</p>
      <div className="grid grid-cols-2 gap-2">{extraSocials.filter(item => Boolean(item.url)).map(item => <a key={item.label} href={item.url!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50">{item.label}<ArrowUpRight size={14}/></a>)}</div>
    </div>}
  </div>;
  return <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-14 space-y-7">
    <div className="flex justify-between items-center gap-2"><button onClick={() => setCurrentView('search')} className="flex items-center gap-2 text-xs font-bold text-slate-600"><ArrowLeft className="w-4 h-4" />Volver a inmuebles</button><div className="flex gap-2">{canEdit && <button onClick={() => openEditPropertyModal(property)} className="inline-flex gap-1.5 items-center px-3 py-2 rounded-xl text-xs bg-amber-50 text-amber-800 font-bold"><Edit3 className="w-4 h-4" />Editar</button>}<button onClick={() => { const url = `${location.origin}${location.pathname}?inmueble=${encodeURIComponent(property.id)}`; if (navigator.share) void navigator.share({ title: property.title, url }); else void navigator.clipboard?.writeText(url); }} className="inline-flex gap-1.5 items-center px-3 py-2 rounded-xl text-xs border font-bold"><Share2 className="w-4 h-4" />Compartir</button></div></div>
    <div className="grid gap-3 grid-cols-1 md:grid-cols-3 h-auto md:h-[420px]">
      <button className="md:col-span-2 relative rounded-2xl overflow-hidden bg-slate-100 h-64 md:h-full" onClick={() => { setPhotoIndex(0); setGalleryOpen(true); }}><img className="w-full h-full object-cover" src={photos[0]} alt={property.title} /><span className="absolute bottom-3 left-3 bg-slate-950/75 text-white text-xs rounded-lg px-3 py-1.5">{photos.length} fotos · Ver galería</span></button>
      <div className="hidden md:grid grid-rows-2 gap-3 min-h-0">{[1,2].map(i => <button key={i} className="rounded-2xl overflow-hidden bg-slate-100" onClick={() => { setPhotoIndex(Math.min(i, photos.length - 1)); setGalleryOpen(true); }}><img className="w-full h-full object-cover" src={photos[i] || photos[0]} alt={`Vista ${i+1}`} /></button>)}</div>
    </div>
    <div className="grid lg:grid-cols-3 gap-7 items-start">
      <div className="lg:col-span-2 space-y-8">
        <div><div className="flex items-center gap-2 text-xs font-bold text-brand-700 uppercase mb-2"><span>{property.type}</span><span className="text-slate-300">·</span><span>{property.isActive === false ? 'Pausado' : 'Disponible para consultas'}</span>{property.verifiedAt && property.isVerified && <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 normal-case">✓ Verificado por administración</span>}</div><h1 className="text-2xl sm:text-3xl font-black text-slate-900">{property.title}</h1><p className="text-sm text-slate-500 flex gap-1 items-center mt-2"><MapPin className="w-4 h-4" />{property.neighborhood}, {property.city}</p><div className="mt-3 text-2xl font-black text-brand-700">{formatGs(property.discountedPrice || property.priceMonth)}<span className="text-sm font-normal text-slate-500"> / mes</span></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[[BedDouble,`${property.bedrooms} dormitorios`],[Bath,`${property.bathrooms} baños`],[Car,`${property.parkingSpots} cochera(s)`],[Ruler,`${property.areaM2} m²`]].map(([Icon, label], i) => { const Component = Icon as React.ElementType; return <div key={i} className="rounded-xl border bg-white p-3 text-slate-700 text-xs font-semibold flex items-center gap-2"><Component className="w-5 h-5 text-brand-600 shrink-0" />{label as string}</div>; })}</div>
        <section className="space-y-3"><h2 className="font-black text-lg">Descripción y comodidades</h2><p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{property.description}</p><div className="grid sm:grid-cols-2 gap-2">{property.features.map((feature, i) => <p key={i} className="flex items-center gap-2 text-xs text-slate-700 bg-white border rounded-xl p-3"><CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />{feature}</p>)}</div></section>
        <LocalVideoGallery videos={property.videos||[]}/>
        <section className="space-y-3"><h2 className="font-black text-lg">Condiciones del alquiler</h2><div className="grid sm:grid-cols-2 gap-2">{[
          ['Expensas',property.expenses?.buildingFees ? formatGs(property.expenses.buildingFees) : 'Sin expensas informadas'],
          ['Garantía',property.depositWarranty || 'A consultar'],['Agua',property.expenses?.water || 'A consultar'],['Internet',property.expenses?.internet || 'A consultar'],['Electricidad',property.expenses?.electricity || 'A consultar'],['Amoblamiento',property.furnishingStatus || 'A consultar'],['Mascotas',property.petPolicy || 'A consultar'],['Disponibilidad',property.availableFrom || 'A consultar']
        ].map(([name,value]) => <div key={name} className="flex justify-between gap-3 bg-slate-50 rounded-xl p-3 text-xs"><span className="text-slate-500">{name}</span><strong className="text-right text-slate-800">{value}</strong></div>)}</div><h3 className="text-sm font-bold pt-2">Requisitos</h3>{property.requirements.length ? <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">{property.requirements.map((r,i)=><li key={i}>{r}</li>)}</ul> : <p className="text-xs text-slate-500">Consultar al propietario.</p>}</section>
        {((property.rentalAllowedRules?.length || 0) > 0 || (property.rentalProhibitedRules?.length || 0) > 0) && <section className="space-y-3"><h2 className="font-black text-lg">Normas de convivencia y uso del inmueble</h2><div className="grid gap-3 sm:grid-cols-2">{(property.rentalAllowedRules?.length || 0) > 0 && <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4"><h3 className="mb-2 text-sm font-black text-emerald-800">Permitido</h3><ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">{property.rentalAllowedRules?.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}{(property.rentalProhibitedRules?.length || 0) > 0 && <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4"><h3 className="mb-2 text-sm font-black text-rose-800">No permitido</h3><ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">{property.rentalProhibitedRules?.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}</div><p className="text-xs text-slate-500">Condiciones indicadas por el propietario. Consultá antes de contratar.</p></section>}
        <section className="space-y-3"><div className="flex items-center justify-between gap-3"><h2 className="font-black text-lg">Ubicación aproximada</h2><a className="text-xs text-brand-700 inline-flex gap-1 items-center font-semibold" target="_blank" rel="noopener noreferrer" href={`https://earth.google.com/web/search/${property.lat},${property.lng}`}><ArrowUpRight className="w-4 h-4" />Explorar 3D si hay cobertura</a></div><PropertyMap properties={[property]} height="480px" center={[property.lat,property.lng]} zoom={15} showUnpublished /><p className="text-xs text-slate-600">Dirección informada: <strong>{property.address || `${property.neighborhood}, ${property.city}`}</strong>. Verificá la ubicación antes de visitar.</p></section>
        <section className="rounded-3xl border border-slate-200 bg-white p-5 lg:hidden"><h2 className="text-lg font-black">Contacto del propietario</h2><p className="mt-2 text-sm text-slate-700">{property.ownerName}</p><p className="mb-4 mt-1 text-xs text-slate-500">{property.contactHours || 'Consultá directamente por disponibilidad.'}</p>{contact}{extraContacts}</section>
        {isPropertyPublic(property) && <PropertyReviews property={property} />}
      </div>
      <aside className="hidden lg:block sticky top-24 bg-white rounded-3xl shadow-lg border border-slate-200 p-6 space-y-4"><h2 className="font-black text-xl">Contactá al propietario</h2><p className="text-sm text-slate-700 font-semibold">{property.ownerName || 'Propietario'}</p><p className="text-xs text-slate-500">{contactReady ? property.ownerPhone : 'Sin teléfono de contacto válido'}</p>{contact}{extraContacts}{property.contactHours && <p className="flex items-start gap-1.5 text-xs text-slate-500"><CalendarDays className="w-4 h-4 shrink-0" />{property.contactHours}</p>}<div className="border-t pt-3 text-xs text-slate-500">Consultá directamente sin registrarte. Nde Rogarã no interviene en la negociación ni certifica contratos.</div></aside>
    </div>
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-xl p-3"><div className="max-w-3xl mx-auto flex gap-3 items-center"><span className="text-xs font-black text-brand-700 shrink-0">{formatGs(property.discountedPrice || property.priceMonth)}</span><div className="flex-1">{contact}</div></div></div>
    {galleryOpen && photos.length > 0 && <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col p-4" role="dialog" aria-modal="true" aria-label="Galería"><div className="flex justify-between text-white"><span className="text-sm">{photoIndex+1} / {photos.length}</span><button aria-label="Cerrar" onClick={() => setGalleryOpen(false)}><X /></button></div><div className="flex-1 flex items-center justify-center gap-2 min-h-0"><button className="p-2 rounded-full text-white bg-white/10" onClick={() => movePhoto(-1)} aria-label="Foto anterior"><ChevronLeft /></button><img src={photos[photoIndex]} className="max-h-[80vh] max-w-[75vw] object-contain" alt={`Fotografía ${photoIndex+1}`} /><button className="p-2 rounded-full text-white bg-white/10" onClick={() => movePhoto(1)} aria-label="Foto siguiente"><ChevronRight /></button></div></div>}
  </main>;
};
