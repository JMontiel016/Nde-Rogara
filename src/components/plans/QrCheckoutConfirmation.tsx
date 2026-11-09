import React, { useEffect, useState } from 'react';
import { CheckCircle2, CircleHelp, ShieldCheck } from 'lucide-react';

/** Pantalla accesible desde la cámara del celular; no precisa iniciar sesión. */
export const QrCheckoutConfirmation: React.FC<{ token: string; ownerId?: string }> = ({ token, ownerId }) => {
  const [state, setState] = useState<'loading' | 'pending' | 'complete' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<{planName: string; amount: number} | null>(null);

  useEffect(() => {
    fetch(`/api/checkout/status/${encodeURIComponent(token)}`, {
      cache: 'no-store',
      headers: ownerId ? { 'X-Checkout-Owner': ownerId } : {},
    })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error(response.status === 403 ? 'Este QR corresponde a otra cuenta. Generá uno desde tu propio perfil.' : 'El enlace venció o no está disponible.')))
      .then((data) => { setDetails({planName: data.planName, amount: data.amount}); setState(data.state === 'confirmed' ? 'complete' : 'pending'); })
      .catch((error: Error) => { setNotice(error.message); setState('error'); });
  }, [token, ownerId]);

  const confirm = async () => {
    setLoading(true);
    setNotice('');
    try {
      const response = await fetch(`/api/checkout/confirm/${encodeURIComponent(token)}`, {
        method: 'POST', headers: ownerId ? { 'X-Checkout-Owner': ownerId } : {},
      });
      if (!response.ok) throw new Error(response.status === 403 ? 'Este QR pertenece a otra cuenta.' : 'No se pudo registrar la confirmación.');
      setState('complete');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo registrar la confirmación.');
    } finally { setLoading(false); }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-5">
    <section className="w-full max-w-md rounded-[30px] border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
        {state === 'complete' ? <CheckCircle2 size={30}/> : <ShieldCheck size={30}/>}
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Nde Rogarã · Contratación</p>
      <h1 className="mt-3 text-2xl font-black text-slate-900">
        {state === 'complete' ? 'Pago confirmado' : state === 'error' ? 'Enlace no disponible' : 'Confirmación de contratación'}
      </h1>
      <p className="mt-4 text-sm leading-6 text-slate-600">
        {state === 'complete'
          ? 'Contratación confirmada. El sistema notificará al propietario y enviará el comprobante por correo si el servicio SMTP está disponible.'
          : 'Presioná Pagar para confirmar esta contratación de prueba en Nde Rogarã.'}
      </p>
      {details && <div className="mt-5 rounded-2xl bg-sky-50 px-5 py-4 text-left"><p className="text-xs font-bold uppercase tracking-wide text-sky-700">Plan seleccionado</p><p className="mt-1 font-black text-slate-900">{details.planName}</p><p className="mt-1 text-lg font-black text-slate-950">Gs. {new Intl.NumberFormat('es-PY').format(details.amount)}</p></div>}
      {state === 'pending' && <button onClick={() => void confirm()} disabled={loading} className="mt-7 w-full rounded-2xl bg-sky-600 px-5 py-4 text-sm font-black text-white hover:bg-sky-700 disabled:opacity-50">
        {loading ? 'Confirmando…' : 'Pagar'}
      </button>}
      {state === 'loading' && <p className="mt-6 text-sm text-slate-500">Cargando solicitud…</p>}
      {notice && <p role="alert" className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{notice}</p>}
      <div className="mt-7 flex items-start gap-2 rounded-2xl bg-slate-50 p-4 text-left text-xs leading-5 text-slate-500">
        <CircleHelp size={16} className="mt-0.5 shrink-0"/>
        Pago de prueba: esta acción confirma la contratación de demostración, sin transferir dinero ni realizar un cobro bancario.
      </div>
    </section>
  </main>;
};
