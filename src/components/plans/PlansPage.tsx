import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft, ArrowRight, BadgeCheck, Check, CheckCircle2, Copy,
  CreditCard, Download, ExternalLink, FileText, Images, LockKeyhole,
  QrCode, ShieldCheck, Sparkles, Star, Video, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PUBLICATION_PLANS, effectiveOwnerPlan, readOwnerPlan, simulatePlanActivation, type PublicationPlan } from '../../data/publicationPlans';
import { formatGs } from '../../utils/formatters';
import { PublicationPolicyCompact } from '../policy/PublicationPolicy';
import {
  type BillingProfile, type PaymentMethod, loadBillingProfile, saveBillingProfile, validateBilling,
  newPaymentRequest, savePaymentRequest, completeDemoPayment, validateDemoCard,
  saveDemoCardReference, readDemoSavedCard,
} from '../../services/billing';
import { createDemoInvoice, viewFiscalInvoice, type FiscalInvoice } from '../../services/invoices';
import { preparePlanMail } from '../../services/mailQueue';
import { downloadQr, makeQrSvg } from '../../services/qrCode';

const inputClass = 'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100';
const labelClass = 'block text-xs font-bold text-slate-700';
/** Identificación visual únicamente. No autentica ni procesa una tarjeta. */
function demoCardBrand(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^5[1-5]/.test(digits) || /^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'American Express';
  return digits ? 'Otra tarjeta' : 'Tipo de tarjeta';
}
function formatDemoCardNumber(value: string): string {
  const digits=value.replace(/\D/g,'').slice(0,19);
  return /^3[47]/.test(digits)
    ? [digits.slice(0,4),digits.slice(4,10),digits.slice(10,15)].filter(Boolean).join(' ')
    : digits.replace(/(.{4})/g,'$1 ').trim();
}
function formatDemoExpiry(value: string): string {
  const digits=value.replace(/\D/g,'').slice(0,4);
  return digits.length<=2 ? digits : `${digits.slice(0,2)}/${digits.slice(2)}`;
}
const emptyProfile: BillingProfile = { fullName: '', email: '', phone: '', invoiceRequested: false, taxName: '', ruc: '', address: '', autoRenew: false };

type QrSession = { token: string; ownerId: string; reference: string };

/**
 * Contratación local en dos pasos.
 * Los datos completos de tarjeta nunca se persisten ni se envían por red.
 * La confirmación QR se comunica mediante el servidor de desarrollo.
 */
export const PlansPage: React.FC = () => {
  const { currentUser, userRole, setCurrentView, setIsAuthModalOpen, setAuthModalMode } = useApp();
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [accepted, setAccepted] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const policyCloseRef = useRef<HTMLButtonElement>(null);
  const policyTriggerRef = useRef<HTMLButtonElement>(null);

  // Devuelve el foco al enlace del formulario al cerrar el cuadro informativo.
  const closePolicy = () => {
    setShowPolicy(false);
    policyTriggerRef.current?.focus();
  };
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [billing, setBilling] = useState<BillingProfile>(emptyProfile);
  const [cardMode, setCardMode] = useState<'once' | 'saved'>('once');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [securityCode, setSecurityCode] = useState('');
  const [cardholder, setCardholder] = useState('');
  const [rememberCard, setRememberCard] = useState(false);
  const [qrSession, setQrSession] = useState<QrSession | null>(null);
  const [qrOrigin, setQrOrigin] = useState(() => window.location.origin);
  const [qrStatus, setQrStatus] = useState('');
  const confirmedRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pageNotice, setPageNotice] = useState('');
  const [successInvoice, setSuccessInvoice] = useState<FiscalInvoice | null>(null);

  useEffect(() => {
    const profile = loadBillingProfile(currentUser?.id);
    setBilling({
      ...profile,
      fullName: profile.fullName || currentUser?.name || '',
      email: profile.email || currentUser?.email || '',
      phone: profile.phone || currentUser?.phone || '',
    });
  }, [currentUser?.id, currentUser?.email, currentUser?.name, currentUser?.phone]);

  // El cuadro de políticas se abre por encima del pago, sin salir del formulario.
  useEffect(() => {
    if (!showPolicy) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        closePolicy();
      }
    };
    window.addEventListener('keydown', handleKey);
    policyCloseRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKey);
  }, [showPolicy]);

  useEffect(() => {
    const refresh = () => setRevision((old) => old + 1);
    window.addEventListener('nderogara-plan-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('nderogara-plan-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const plan = useMemo(() => PUBLICATION_PLANS.find((entry) => entry.id === selected) || null, [selected]);
  const active = effectiveOwnerPlan(currentUser?.id);
  const selection = readOwnerPlan(currentUser?.id);
  const savedCard = readDemoSavedCard(currentUser?.id);
  void revision;

  // El enlace contiene únicamente un token aleatorio, sin información del comprador.
  const qrLink = useMemo(() => {
    if (!qrSession) return '';
    try {
      const base = new URL(qrOrigin.trim());
      if (!['http:', 'https:'].includes(base.protocol)) return '';
      return `${base.origin}/?confirmarPago=${encodeURIComponent(qrSession.token)}`;
    } catch { return ''; }
  }, [qrSession, qrOrigin]);

  const qrImage = useMemo(() => {
    try { return qrLink ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(makeQrSvg(qrLink))}` : ''; }
    catch { return ''; }
  }, [qrLink]);

  const begin = (id: string) => {
    if (!currentUser) { setAuthModalMode('register'); setIsAuthModalOpen(true); return; }
    if (userRole !== 'landlord') {
      setPageNotice('Los planes están disponibles para cuentas de propietarios. Ingresá con una cuenta de propietario para continuar.');
      return;
    }
    setSelected(id); setStep(1); setAccepted(false); setMethod('card'); setCardMode('once');
    setCardholder(''); setCardNumber(''); setExpiry(''); setSecurityCode(''); setRememberCard(false);
    setQrSession(null); setQrStatus(''); confirmedRef.current = false;
    setError(''); setShowPolicy(false); setSuccessInvoice(null);
  };

  const field = <K extends keyof BillingProfile>(key: K, value: BillingProfile[K]) =>
    setBilling((old) => ({ ...old, [key]: value }));

  const chooseMethod = (next: PaymentMethod) => {
    setMethod(next); setError(''); setQrSession(null); setQrStatus(''); confirmedRef.current = false;
  };

  const finishPayment = (chosenMethod: PaymentMethod) => {
    if (!currentUser || !plan || !accepted || busy) return;
    // Un QR ajeno nunca puede habilitar un plan en otra cuenta.
    if (chosenMethod === 'qr' && (!qrSession || qrSession.ownerId !== currentUser.id)) {
      setError('Este QR no corresponde a la cuenta actual. Generá uno nuevo.');
      return;
    }
    const issue = validateBilling(billing);
    if (issue) { setError(issue); return; }
    setBusy(true);
    setError('');
    try {
      const buyer = {
        ...billing,
        fullName: billing.fullName.trim(), email: billing.email.trim().toLowerCase(),
        taxName: billing.taxName.trim(), ruc: billing.ruc.trim(),
      };
      saveBillingProfile(currentUser.id, buyer);
      const payment = newPaymentRequest({
        ownerId: currentUser.id, ownerEmail: currentUser.email, planId: plan.id,
        planName: plan.name, amount: plan.price, method: chosenMethod, billing: buyer,
        cardLast4: chosenMethod === 'card' ? (cardMode === 'saved' ? savedCard?.last4 : cardNumber.replace(/\D/g, '').slice(-4)) : undefined,
      }, 'pending');
      savePaymentRequest(payment);
      // La habilitación es únicamente un flujo local, sin cobro bancario.
      const completed = completeDemoPayment(payment);
      simulatePlanActivation(currentUser.id, plan.id, billing.autoRenew);
      const invoice = createDemoInvoice(completed);
      // El aviso queda como borrador para administración; solo SMTP confirma envío real.
      preparePlanMail(completed, invoice);
      if (chosenMethod === 'card' && cardMode === 'once' && rememberCard) {
        saveDemoCardReference(currentUser.id, cardNumber.replace(/\D/g, '').slice(-4), demoCardBrand(cardNumber));
      }
      // Limpiar inmediatamente las entradas sensibles tras la operación.
      setCardNumber(''); setExpiry(''); setSecurityCode(''); setCardholder('');
      setSuccessInvoice(invoice); setSelected(null); setShowPolicy(false); setQrSession(null); setRevision((v) => v + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar la contratación.');
    } finally { setBusy(false); }
  };

  const payCard = () => {
    const issue = validateBilling(billing);
    if (issue) { setError(issue); return; }
    if (cardMode === 'saved' && !savedCard) { setError('No hay una tarjeta guardada.'); return; }
    if (cardMode === 'once') {
      if (cardholder.trim().length < 4) { setError('Ingresá el nombre completo del titular de la tarjeta.'); return; }
      const cardIssue = validateDemoCard(cardNumber, expiry, securityCode);
      if (cardIssue) { setError(cardIssue); return; }
    } else if (!/^\d{3,4}$/.test(securityCode)) {
      setError('Ingresá el código de seguridad de la tarjeta.'); return;
    }
    finishPayment('card');
  };

  const generateQr = async () => {
    if (!accepted) { setError('Aceptá las políticas de contratación para generar el QR.'); return; }
    if (!currentUser || !plan) { setError('Ingresá como propietario para generar tu QR.'); return; }
    const issue = validateBilling(billing);
    if (issue) { setError(issue); return; }
    setError(''); setBusy(true);
    try {
      const response = await fetch(`/api/checkout?plan=${encodeURIComponent(plan.id)}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'X-Checkout-Owner': currentUser.id },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('No se pudo generar un enlace de pago.');
      const data: { token: string; reference: string } = await response.json();
      // Cada respuesta del servidor corresponde a un nuevo intento de pago.
      setQrSession({ token: data.token, ownerId: currentUser.id, reference: data.reference });
      setQrStatus('Esperando confirmación desde el enlace del QR…');
      confirmedRef.current = false;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'El servicio de confirmación no está disponible.');
    } finally { setBusy(false); }
  };

  // El teléfono confirma en el servidor local; esta pestaña detecta el cambio.
  useEffect(() => {
    if (!qrSession || !selected || method !== 'qr' || !currentUser) return;
    if (qrSession.ownerId !== currentUser.id) {
      setQrSession(null);
      setQrStatus('La cuenta cambió. Generá un nuevo código QR.');
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const response = await fetch(`/api/checkout/status/${encodeURIComponent(qrSession.token)}`, {
          cache: 'no-store', headers: { 'X-Checkout-Owner': currentUser.id },
        });
        if (!response.ok) throw new Error('El enlace expiró. Generá otro QR.');
        const data: { state: string } = await response.json();
        if (data.state === 'confirmed' && !cancelled && !confirmedRef.current) {
          if (!accepted) { setQrStatus('Aceptá las políticas de contratación para continuar.'); return; }
          const issue = validateBilling(billing);
          if (issue) { setError(issue); return; }
          confirmedRef.current = true;
          finishPayment('qr');
        }
      } catch (cause) {
        if (!cancelled) setQrStatus(cause instanceof Error ? cause.message : 'No se pudo consultar el estado del QR.');
      }
    };
    const interval = window.setInterval(() => { void check(); }, 1800);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [qrSession, selected, method, accepted, billing, currentUser?.id]);

  // El cupo y los beneficios se detallan directamente dentro de cada tarjeta del plan.
  const planDescription=(p:PublicationPlan)=>p.photoMode==='pooled' ? `${p.maxPhotos} fotos compartidas entre todos tus inmuebles` : `${p.maxPhotos} fotos por publicación`;
  return <main className="min-h-screen bg-[#f5f8fc] pb-24">
    <section className="relative overflow-hidden bg-[#0a1930] px-4 pb-20 pt-16 text-white sm:pt-20">
      <div className="pointer-events-none absolute -right-20 -top-40 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"/>
      <div className="relative mx-auto max-w-6xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-4 py-2 text-xs font-bold tracking-wide text-sky-200"><Sparkles size={15}/> Publicá, destacá y conectá con más interesados</span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Planes que se adaptan a tus propiedades</h1>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">Gestioná tus avisos de alquiler, distribuyendo fotos entre inmuebles y dando mayor visibilidad a tus mejores oportunidades. Elegí cómo presentar cada propiedad.</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-200"><span className="inline-flex items-center gap-2"><CheckCircle2 className="text-sky-300" size={16}/>Contacto directo</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="text-sky-300" size={16}/>Ubicación en mapa</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="text-sky-300" size={16}/>Control de fotos y videos</span></div>
      </div>
    </section>
    <section className="relative mx-auto -mt-9 max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {PUBLICATION_PLANS.map(p=><article key={p.id} className={`group relative flex flex-col rounded-[28px] border bg-white p-6 shadow-lg shadow-slate-800/5 transition duration-300 hover:-translate-y-1 hover:shadow-xl ${p.id==='premium'?'border-2 border-sky-500 ring-4 ring-sky-200/50':'border-slate-200'}`}>
          {p.featured&&<span className="absolute -top-3 right-5 inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 text-[11px] font-black text-white shadow-md"><Star size={13} fill="currentColor"/> Más elegido</span>}
          <div className="min-h-[62px]"><h2 className="text-lg font-black text-slate-900">{p.name}</h2><p className="mt-1 text-xs text-slate-500">{p.id==='basic'?'Para empezar a publicar':p.id==='quarterly'?'Más espacio y permanencia':p.id==='premium'?'Para destacar tus mejores inmuebles':'Para gestionar varias propiedades'}</p></div>
          <div className="mt-4 border-b border-slate-100 pb-5"><p className="text-3xl font-black tracking-tight text-slate-950">{formatGs(p.price)}</p><p className="mt-1 text-xs text-slate-500">Vigencia de {p.term}</p></div>
          <div className="my-5 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-slate-50 p-3"><Images size={18} className="text-sky-600"/><p className="mt-2 text-lg font-black">{p.maxPhotos}</p><p className="text-[11px] text-slate-500">{p.photoMode==='pooled'?'Fotos totales':'Fotos por aviso'}</p></div>
            <div className="rounded-2xl bg-slate-50 p-3"><Video size={18} className="text-sky-600"/><p className="mt-2 text-lg font-black">{p.maxVideos}</p><p className="text-[11px] text-slate-500">Videos totales</p></div>
          </div>
          <p className="mb-4 text-xs font-semibold text-slate-700">{p.photoMode==='pooled'?`Creá varios avisos usando un cupo total de ${p.maxPhotos} fotos.`:`Hasta ${p.maxActive} avisos activos, con fotos por inmueble.`}</p>
          <ul className="mb-7 flex-1 space-y-3">{p.benefits.map(b=><li key={b} className="flex items-start gap-2.5 text-[12px] leading-5 text-slate-600"><Check size={16} className="mt-0.5 shrink-0 text-emerald-600"/>{b}</li>)}</ul>
          <button onClick={()=>begin(p.id)} className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 ${p.featured?'bg-sky-600 text-white hover:bg-sky-700':'bg-slate-900 text-white hover:bg-slate-700'}`}>{active?.id===p.id?'Renovar este plan':'Elegir este plan'} <ArrowRight size={16}/></button>
        </article>)}
      </div>
      {pageNotice&&<div role="status" className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm font-semibold text-sky-900">{pageNotice}<button className="ml-4 underline" onClick={()=>setPageNotice('')}>Cerrar</button></div>}
      {selection&&currentUser&&<div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm"><p className="font-semibold text-sky-950"><BadgeCheck size={18} className="mr-2 inline text-sky-700"/>Tu plan: <strong>{active?.name||'Vencido'}</strong> · Vigencia hasta {new Date(selection.expiresAt).toLocaleDateString('es-PY')}</p><button onClick={()=>setCurrentView('landlord-rentals')} className="hidden text-sky-700 underline sm:block">Administrar publicaciones</button></div>}
    </section>

    {selected && plan && currentUser && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="Contratación de un plan">
      <section className="relative flex max-h-[95vh] w-full max-w-4xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-100 p-5 sm:px-8 sm:py-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600">Contratación · Paso {step} de 2</p>
            <h2 className="mt-1 text-xl font-black text-slate-950 sm:text-2xl">{step === 1 ? 'Revisá el plan seleccionado' : 'Completá tu contratación'}</h2>
            <p className="mt-1 text-xs text-slate-500">{plan.name} · {plan.term}</p>
          </div>
          <button onClick={() => setSelected(null)} aria-label="Cerrar contratación" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><X size={19}/></button>
        </header>
        <div className="flex h-1.5 bg-slate-100"><span className="bg-sky-600 transition-all duration-300" style={{ width: step === 1 ? '50%' : '100%' }}/></div>
        <div className="space-y-6 overflow-y-auto p-5 sm:px-8 sm:py-6">
          {step === 1 ? <>
            <div className="rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <h3 className="text-lg font-black text-slate-950">{plan.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{planDescription(plan)} · {plan.maxVideos} videos · {plan.maxFeatured ? `${plan.maxFeatured} espacios destacados` : 'Sin espacios destacados'}</p>
              <div className="mt-4 border-t border-sky-100 pt-4"><span className="text-xs text-slate-500">Importe a contratar</span><p className="text-2xl font-black text-slate-950">{formatGs(plan.price)}</p></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4"><CheckCircle2 className="text-sky-600" size={21}/><strong className="mt-2 block text-sm">Publicaciones flexibles</strong><p className="mt-1 text-xs leading-5 text-slate-500">Administrá tus avisos según el cupo de tu plan.</p></div>
              <div className="rounded-2xl border border-slate-200 p-4"><ShieldCheck className="text-sky-600" size={21}/><strong className="mt-2 block text-sm">Gestión desde tu perfil</strong><p className="mt-1 text-xs leading-5 text-slate-500">Controlá publicaciones, destacados y vigencia.</p></div>
            </div>
            <button onClick={() => setStep(2)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 py-3.5 text-sm font-black text-white hover:bg-sky-700">Continuar con el pago <ArrowRight size={16}/></button>
          </> : <>
            {/* El importe precede al método de pago para dar contexto a la operación. */}
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
              <div><p className="text-xs font-semibold text-slate-600">Total de contratación</p><p className="mt-1 text-3xl font-black text-slate-950">{formatGs(plan.price)}</p><p className="mt-1 text-xs text-slate-500">{plan.name} · {plan.term}</p></div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-800"><LockKeyhole size={16}/> Sin cargo bancario</div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_0.92fr]">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><CreditCard size={19} className="text-sky-600"/> Método de pago</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => chooseMethod('card')} className={`rounded-2xl border p-4 text-left text-sm font-bold transition focus-visible:outline-sky-600 ${method === 'card' ? 'border-sky-600 bg-sky-50 text-sky-900' : 'border-slate-200 hover:border-slate-300'}`} aria-pressed={method === 'card'}><CreditCard size={22} className="mb-2"/> Tarjeta</button>
                  <button type="button" onClick={() => chooseMethod('qr')} className={`rounded-2xl border p-4 text-left text-sm font-bold transition focus-visible:outline-sky-600 ${method === 'qr' ? 'border-sky-600 bg-sky-50 text-sky-900' : 'border-slate-200 hover:border-slate-300'}`} aria-pressed={method === 'qr'}><QrCode size={22} className="mb-2"/> Pago con QR</button>
                </div>

                {method === 'card' ? <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <button type="button" className={`rounded-xl px-3 py-2 ${cardMode === 'once' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => { setCardMode('once'); setSecurityCode(''); }}>Tarjeta ocasional</button>
                    <button type="button" disabled={!savedCard} className={`rounded-xl px-3 py-2 disabled:opacity-40 ${cardMode === 'saved' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'}`} onClick={() => { setCardMode('saved'); setSecurityCode(''); }}>Guardada {savedCard ? `•••• ${savedCard.last4}` : ''}</button>
                  </div>
                  {cardMode === 'once' ? <>
                    <label className={labelClass}>Titular de la tarjeta *<input className={inputClass} value={cardholder} onChange={(event) => setCardholder(event.target.value)} autoComplete="off" placeholder="Nombre y apellido" /></label>
                    <label className={labelClass}>Número de tarjeta *
                      <div className="relative">
                        <input className={`${inputClass} pr-32`} value={cardNumber} onChange={(event) => setCardNumber(formatDemoCardNumber(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000 0000" maxLength={23} />
                        <span aria-live="polite" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">{demoCardBrand(cardNumber)}</span>
                      </div>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <label className={labelClass}>Vencimiento (MM/AA) *<input className={inputClass} value={expiry} onChange={(event) => setExpiry(formatDemoExpiry(event.target.value))} autoComplete="off" placeholder="MM/AA"/></label>
                      <label className={labelClass}>Código de seguridad *<input className={inputClass} value={securityCode} onChange={(event) => setSecurityCode(event.target.value.replace(/\D/g, '').slice(0, 4))} type="password" inputMode="numeric" autoComplete="off" placeholder="CVV"/></label>
                    </div>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-slate-600"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-sky-600" checked={rememberCard} onChange={(event) => setRememberCard(event.target.checked)}/><span>Recordar la tarjeta para una próxima contratación (solo sus últimos cuatro dígitos).</span></label>
                  </> : <>
                    <p className="rounded-xl bg-sky-50 p-3 text-sm font-semibold text-sky-900">{savedCard?.brand} •••• {savedCard?.last4}</p>
                    <label className={labelClass}>Código de seguridad *<input className={inputClass} value={securityCode} onChange={(event) => setSecurityCode(event.target.value.replace(/\D/g, '').slice(0, 4))} type="password" inputMode="numeric" autoComplete="off" placeholder="CVV"/></label>
                  </>}
                  <p className="rounded-xl bg-sky-50 p-3 text-[11px] leading-5 text-sky-900"><strong>Pago de demostración — sin cobro real.</strong> Usá únicamente números de prueba: Visa 4242 4242 4242 4242 o Mastercard 5555 5555 5555 4444. No ingreses tarjetas reales. El número, la fecha y el código de seguridad no se guardan ni se envían.</p>
                </section> : <section className="space-y-4 rounded-2xl border border-sky-200 bg-sky-50 p-5">
                  <h4 className="font-black text-slate-900">Pago mediante código QR</h4>
                  <p className="text-xs leading-5 text-slate-600">Generá el QR, descargalo o escanealo con tu teléfono. El enlace permitirá confirmar la solicitud de contratación.</p>
                  {!qrSession ? <button type="button" disabled={busy} onClick={() => void generateQr()} className="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50">{busy ? 'Generando…' : 'Generar código QR'}</button> : <>
                    <div className="mx-auto w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">{qrImage && <img className="aspect-square w-full" src={qrImage} alt="Código QR de confirmación de contratación"/>}</div>
                    <label className="block text-xs font-bold text-slate-700">Dirección de acceso desde el celular<input className={inputClass} value={qrOrigin} onChange={(event) => setQrOrigin(event.target.value)} inputMode="url" placeholder="http://192.168.1.10:5173"/></label>
                    {['localhost','127.0.0.1'].includes(new URL(window.location.href).hostname) && <p className="text-[11px] leading-5 text-slate-600">Si escaneás desde otro dispositivo, reemplazá localhost por la dirección de red que muestra Vite al iniciar el proyecto.</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={!qrLink} onClick={() => qrLink && downloadQr(qrLink, `NdeRogara-${plan.id}-QR.svg`)} className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-3 text-xs font-bold text-sky-800 disabled:opacity-50"><Download size={16}/> Descargar QR</button>
                      <button type="button" disabled={!qrLink} onClick={() => void navigator.clipboard.writeText(qrLink).then(() => setQrStatus('Enlace copiado.')).catch(() => setQrStatus('No se pudo copiar el enlace.'))} className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white px-3 py-3 text-xs font-bold text-sky-800 disabled:opacity-50"><Copy size={16}/> Copiar enlace</button>
                    </div>
                    <a href={qrLink || undefined} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-xs font-semibold text-sky-700 hover:underline"><ExternalLink size={14}/> Abrir enlace de confirmación</a>
                    <div aria-live="polite" className="rounded-xl bg-white p-3 text-xs font-semibold text-slate-700">{qrStatus}</div><button type="button" disabled={busy} onClick={() => void generateQr()} className="text-xs font-bold text-sky-700 hover:underline disabled:opacity-50">Generar un nuevo QR</button>
                  </>}
                </section>}
              </div>
              <section className="space-y-4">
                <h3 className="flex items-center gap-2 text-base font-black text-slate-900"><FileText className="text-sky-600" size={19}/> Datos del comprador</h3>
                <div className="grid gap-3">
                  <label className={labelClass}>Nombre completo *<input className={inputClass} value={billing.fullName} onChange={(event) => field('fullName', event.target.value)} autoComplete="name" placeholder="Nombre y apellido" /></label>
                  <label className={labelClass}>Correo para comprobantes *<input className={inputClass} value={billing.email} onChange={(event) => field('email', event.target.value)} type="email" autoComplete="email" placeholder="correo@dominio.com" /></label>
                  <label className={labelClass}>Celular / WhatsApp *<input className={inputClass} value={billing.phone} onChange={(event) => field('phone', event.target.value)} autoComplete="tel" placeholder="Número de contacto" /></label>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" className="mt-1 h-4 w-4 accent-sky-600" checked={billing.invoiceRequested} onChange={(event) => field('invoiceRequested', event.target.checked)}/><span><strong>Factura con RUC</strong><small className="mt-1 block text-xs text-slate-500">Si no seleccionás esta opción, el comprobante se registra con tu nombre e identificación «X».</small></span></label>
                {billing.invoiceRequested && <div className="grid gap-3 rounded-2xl bg-slate-50 p-3">
                  <label className={labelClass}>Nombre / razón social *<input className={inputClass} value={billing.taxName} onChange={(event) => field('taxName', event.target.value)}/></label>
                  <label className={labelClass}>RUC con dígito verificador *<input className={inputClass} value={billing.ruc} onChange={(event) => field('ruc', event.target.value)} placeholder="RUC"/></label>
                  <label className={labelClass}>Dirección de facturación *<input className={inputClass} value={billing.address} onChange={(event) => field('address', event.target.value)}/></label>
                </div>}
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm"><input type="checkbox" checked={billing.autoRenew} onChange={(event) => field('autoRenew', event.target.checked)} className="mt-1 h-4 w-4 accent-sky-600"/><span><strong>Renovación automática</strong><small className="mt-1 block text-xs text-slate-500">Guardaremos tu preferencia para próximas renovaciones.</small></span></label>
                <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600">
                  <label className="flex cursor-pointer items-start gap-2"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-sky-600" checked={accepted} onChange={(event) => setAccepted(event.target.checked)}/><span>Leí y acepto las políticas de publicación, privacidad y contratación.</span></label>
                  <button ref={policyTriggerRef} type="button" className="mt-2 font-bold text-sky-700 hover:underline focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500" onClick={() => setShowPolicy(true)}>Leer políticas y privacidad</button>
                </div>
              </section>
            </div>

            {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button type="button" onClick={() => { setStep(1); setError(''); setQrSession(null); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"><ArrowLeft size={16}/> Volver</button>
              {method === 'card' ? <button type="button" disabled={busy || !accepted} onClick={payCard} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50">{busy ? 'Registrando…' : 'Confirmar pago con tarjeta'} <ArrowRight size={16}/></button> : <span className="text-xs font-semibold text-slate-500">La contratación continuará al confirmar desde el QR.</span>}
            </div>
          </>}
        </div>

      </section>
    </div>}

    {/* Portal al body: el cuadro queda SIEMPRE delante del pago, sin heredar
        el recorte ni el desplazamiento del formulario de contratación. */}
    {selected && step === 2 && showPolicy && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4"
        onMouseDown={(event) => { if (event.target === event.currentTarget) closePolicy(); }}
      >
        <section
          role="dialog"
          aria-modal="true"
          aria-labelledby="nderogara-politicas-titulo"
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ width: 'min(360px, calc(100vw - 32px))', height: 'min(360px, calc(100dvh - 32px))' }}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-sky-700">Condiciones de contratación</p>
              <h2 id="nderogara-politicas-titulo" className="mt-0.5 text-sm font-black text-slate-950">Políticas y privacidad</h2>
            </div>
            <button
              ref={policyCloseRef}
              type="button"
              aria-label="Cerrar políticas"
              onClick={closePolicy}
              className="shrink-0 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-500"
            ><X size={16}/></button>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
            <PublicationPolicyCompact />
          </div>
          <footer className="shrink-0 border-t border-slate-100 bg-white px-4 py-3">
            <button type="button" onClick={closePolicy} className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-sky-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500">
              Volver al pago
            </button>
          </footer>
        </section>
      </div>,
      document.body,
    )}

    {successInvoice && <div className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-label="Contratación registrada">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-7 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600"><CheckCircle2 size={34}/></div>
        <h2 className="mt-5 text-2xl font-black text-slate-950">Contratación registrada</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Tu plan está disponible para gestionar publicaciones. Encontrarás el comprobante en la sección de Facturas.</p>
        <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-left text-sm"><p className="font-black">{successInvoice.planName}</p><p className="mt-1 text-slate-500">{successInvoice.customerName} · {successInvoice.customerRuc} · {formatGs(successInvoice.amount)}</p><p className="mt-1 text-xs text-slate-500">Comprobante {successInvoice.documentNumber}</p></div>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => { void viewFiscalInvoice(successInvoice.id).catch((cause) => setPageNotice(cause instanceof Error ? cause.message : 'No se pudo abrir el comprobante.')); }} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold hover:bg-slate-50">Ver comprobante</button>
          <button type="button" onClick={() => { setSuccessInvoice(null); setCurrentView('landlord-rentals'); }} className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white hover:bg-sky-700">Ir a mis publicaciones</button>
        </div>
        <button type="button" onClick={() => setSuccessInvoice(null)} className="mt-5 text-xs font-semibold text-slate-500 hover:text-slate-900">Cerrar</button>
        <p className="mt-4 text-[11px] text-slate-500">Este registro no acredita un débito bancario ni constituye una factura fiscal.</p>
      </div>
    </div>}
  </main>;
};
