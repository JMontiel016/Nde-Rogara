import React, { useMemo, useState } from 'react';
import { AlertCircle, Send, ShieldCheck, Star, UserRound, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Property } from '../../types';
import { checkReviewText } from '../../services/contentGuard';
import { getVisitorId } from '../../services/reviewerIdentity';

/** Las reseñas son anónimas para visitantes y vinculadas a la cuenta para registrados. */
export const PropertyReviews: React.FC<{ property: Property }> = ({ property }) => {
  const { addReview, reviews, currentUser, registeredUsers, properties } = useApp();
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  // Una cuenta administradora siempre opina en modo anónimo y nunca expone su identidad.
  const registered = Boolean(currentUser?.id && !['visitor', 'admin'].includes(currentUser.role));
  const reviewerId = registered ? currentUser!.id : getVisitorId();
  const reviewerName = registered ? currentUser!.name.trim() : 'Anónimo';
  const accepted = useMemo(() => reviews.filter(r => r.propertyId === property.id && r.status === 'published'), [reviews, property.id]);
  const average = accepted.length ? (accepted.reduce((sum, review) => sum + review.rating, 0) / accepted.length).toFixed(1) : null;
  const visibleProfile = profileId ? registeredUsers.find(user => user.id === profileId && user.status !== 'inactive') : null;
  const publicListingsCount = visibleProfile ? properties.filter(p => p.ownerId === visibleProfile.id && p.isActive !== false && p.moderationStatus === 'approved').length : 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (comment.trim().length < 20) { setError('La reseña debe tener al menos 20 caracteres.'); return; }
    // La clave está asociada a la cuenta o al navegador anónimo: no se mezcla entre cuentas.
    const key = `nderogara_review_once_${property.id}_${reviewerId}`;
    if (localStorage.getItem(key) || reviews.some(review => review.propertyId === property.id && review.reviewerId === reviewerId)) {
      setError('Ya enviaste una reseña de este inmueble con esta identidad.');
      return;
    }
    const moderationError = checkReviewText(reviewerName, comment);
    if (moderationError) { setError(moderationError); return; }
    addReview({ id: crypto.randomUUID(), reviewerId, authorRegistered: registered, propertyId: property.id,
      propertyTitle: property.title, author: reviewerName.slice(0, 70), date: new Date().toISOString(),
      rating, comment: comment.trim().slice(0, 1500), isVerified: false, unit: property.neighborhood,
      status: 'pending' });
    localStorage.setItem(key, new Date().toISOString());
    setPending(true);
    setComment('');
  };

  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id="resenas">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-lg font-black text-slate-900">Reseñas del inmueble</h2><p className="mt-1 text-xs text-slate-500">Opiniones sujetas a moderación. No acreditan una operación de alquiler.</p></div>
      <div className="text-right"><span className="text-xl font-black text-slate-900">{average || '—'}</span><p className="text-[11px] text-slate-500">{accepted.length} publicadas</p></div>
    </div>
    {accepted.length === 0 ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Este inmueble todavía no tiene reseñas publicadas.</p> :
      <div className="space-y-3">{accepted.map(review => {
        const linkedUser = registeredUsers.find(user => user.id === review.reviewerId);
        const isAdminReview = linkedUser?.role === 'admin' || (currentUser?.role === 'admin' && currentUser.id === review.reviewerId);
        const canShowProfile = !isAdminReview && review.authorRegistered === true && !!review.reviewerId && Boolean(linkedUser && linkedUser.status !== 'inactive');
        const publishedName = isAdminReview ? 'Anónimo' : review.authorRegistered === false ? 'Anónimo' : review.author;
        return <article key={review.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {canShowProfile ? <button type="button" className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-700 hover:underline" onClick={() => setProfileId(review.reviewerId!)}><UserRound size={15}/>{publishedName}<ShieldCheck size={13} aria-label="Cuenta registrada" /></button> : <strong className="text-sm text-slate-800">{publishedName}</strong>}
            <span aria-label={`${review.rating} de 5 estrellas`} className="text-xs text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
          </div>
          <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">{review.comment}</p>
          <p className="mt-2 text-[11px] text-slate-500">{new Date(review.date).toLocaleDateString('es-PY')} · {canShowProfile ? 'Cuenta registrada' : 'Opinión no verificada'}</p>
        </article>;
      })}</div>}
    <form onSubmit={submit} className="space-y-3 border-t border-slate-200 pt-5">
      <h3 className="font-bold text-sm text-slate-900">Dejá tu reseña</h3>
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
        <UserRound size={17} className="text-sky-700" />
        {registered ? <>Publicarás como <strong>{reviewerName}</strong>.</> : <>Tu opinión se publicará como <strong>Anónimo</strong>. No necesitás registrarte.</>}
      </div>
      <p className="text-xs text-slate-500">Las reseñas se revisan antes de ser visibles. No incluyas insultos, datos personales ni publicidad.</p>
      <div className="flex items-center gap-1" aria-label="Calificación">{[1, 2, 3, 4, 5].map(n => <button type="button" aria-label={`${n} estrellas`} key={n} onClick={() => setRating(n)} className="rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-sky-500"><Star className={`h-6 w-6 ${n <= rating ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}`} /></button>)}</div>
      <label className="block text-xs font-semibold text-slate-700">Tu comentario<textarea value={comment} onChange={event => setComment(event.target.value)} rows={3} required minLength={20} maxLength={1500} className="mt-1 block w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-400" placeholder="Contanos tu experiencia con el inmueble o el anuncio" /></label>
      {error && <p role="alert" className="flex items-center gap-2 text-xs text-red-700"><AlertCircle size={15}/>{error}</p>}
      {pending ? <p role="status" className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-800">Reseña enviada. Queda pendiente de aprobación.</p> : <button className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700"><Send size={16}/>Enviar reseña</button>}
    </form>
    {visibleProfile && <div role="dialog" aria-modal="true" aria-label="Perfil público del usuario" className="fixed inset-0 z-[3500] flex items-center justify-center bg-slate-950/65 p-4" onClick={() => setProfileId(null)}>
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-2"><h3 className="text-lg font-black">Perfil público</h3><button className="rounded-lg p-2 hover:bg-slate-100" onClick={() => setProfileId(null)} aria-label="Cerrar"><X size={18}/></button></div>
        <div className="mt-5 flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50"><UserRound className="text-sky-700"/></span><div><p className="font-bold text-slate-900">{visibleProfile.name}</p><p className="text-xs text-slate-500">Cuenta registrada</p></div></div>
        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{publicListingsCount} inmuebles públicos en Nde Rogarã</div>
        <p className="mt-3 text-xs text-slate-500">Por privacidad, no se publican correo, teléfono, documentos ni datos de facturación.</p>
      </div>
    </div>}
  </section>;
};
