import React, { useEffect, useMemo, useState } from 'react';
import { AdminSmtpSettings } from './AdminSmtpSettings';
import { CheckCircle2, Copy, ExternalLink, Mail, Send, ShieldCheck } from 'lucide-react';
import { getPayments } from '../../services/billing';
import {
  addMailItem, getMailItems, getMailPreferences, mailtoFor, preparePlanMail,
  saveMailPreferences, sendMailFromServer, type MailItem, type MailKind,
} from '../../services/mailQueue';
import { moderationEvents } from '../../services/adminGovernance';
import { prepareModerationMail } from '../../services/mailQueue';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-sky-400';
const kindNames: Record<MailKind, string> = { plan: 'Contratación de plan', moderation: 'Moderación de anuncio', general: 'Comunicación general' };

export const AdminMailCenter: React.FC = () => {
  const [revision, setRevision] = useState(0);
  const [kind, setKind] = useState<MailKind>('general');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preferences, setPreferences] = useState(getMailPreferences);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => setRevision(x => x + 1);
    window.addEventListener('nderogara-mail-updated', refresh);
    window.addEventListener('nderogara-billing-updated', refresh);
    window.addEventListener('nderogara-moderation-changed', refresh);
    return () => {
      window.removeEventListener('nderogara-mail-updated', refresh);
      window.removeEventListener('nderogara-billing-updated', refresh);
      window.removeEventListener('nderogara-moderation-changed', refresh);
    };
  }, []);
  const items = useMemo(() => getMailItems(), [revision]);
  const payments = useMemo(() => getPayments().filter(p => p.status === 'paid'), [revision]);
  const suggestedCount = payments.length;

  const prepareAll = () => {
    payments.forEach(payment => preparePlanMail(payment));
    moderationEvents().filter(evt => evt.action === 'removed').forEach(evt => prepareModerationMail(evt.ownerEmail, evt.propertyId, evt.propertyTitle, evt.reason));
    setOk('Avisos sincronizados con los pagos y las decisiones administrativas registradas.');
    setRevision(v => v + 1);
  };

  const useTemplate = (type: MailKind) => {
    setKind(type); setError(''); setOk('');
    if (type === 'plan') {
      setSubject('Nde Rogarã | Información de tu plan');
      setBody('Hola:\n\nTe contactamos desde Nde Rogarã para informarte sobre tu plan de publicación.\n\nSi necesitás asistencia, respondé a este mensaje.\n\nEquipo Nde Rogarã');
    } else if (type === 'moderation') {
      setSubject('Nde Rogarã | Revisión de publicación');
      setBody('Hola:\n\nTu anuncio requiere una revisión de las condiciones de publicación.\nPor favor, contactá al equipo de soporte.\n\nEquipo Nde Rogarã');
    } else {
      setSubject('Información de Nde Rogarã');
      setBody('Hola:\n\nNos comunicamos para compartir una actualización sobre Nde Rogarã.\n\nSaludos,\nEquipo Nde Rogarã');
    }
  };

  const save = () => {
    setError(''); setOk('');
    try {
      addMailItem({ reference: `manual:${crypto.randomUUID()}`, kind, to: to.trim(), subject: subject.trim(), body: body.trim() });
      setOk('Borrador agregado al buzón. Todavía no se envió.');
      setTo(''); setSubject(''); setBody('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo preparar el mensaje.'); }
  };
  const send = async (item: MailItem) => {
    setSending(item.id); setError(''); setOk('');
    try { await sendMailFromServer(item); setOk(`Envío confirmado por el servidor: ${item.to}.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo enviar el correo.'); }
    finally { setSending(null); }
  };
  const copy = async (item: MailItem) => {
    try { await navigator.clipboard.writeText(`Para: ${item.to}\nAsunto: ${item.subject}\n\n${item.body}`); setOk('Mensaje copiado.'); }
    catch { setError('No se pudo copiar el mensaje.'); }
  };

  return <section className="space-y-5">
    <div>
      <h2 className="text-xl font-black text-slate-900">Centro de correo</h2>
      <p className="mt-1 text-sm text-slate-500">Avisos de contratación, moderación y comunicaciones a propietarios.</p>
    </div>
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      <p className="flex items-center gap-2 font-bold"><ShieldCheck size={17} /> Gestión de comunicaciones</p>
      <p className="mt-1">Los borradores se preparan localmente. Podés abrirlos en tu correo habitual. Para envío directo es necesario configurar el servidor SMTP con una cuenta Firebase autorizada como administradora.</p>
    </div>
    <AdminSmtpSettings />
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-black"><Mail size={17}/> Redactar aviso</h3>
          <button type="button" onClick={prepareAll} className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100">Actualizar avisos ({suggestedCount} planes)</button>
        </div>
        <label className="block text-xs font-bold">Tipo de comunicación
          <select value={kind} onChange={e=>useTemplate(e.target.value as MailKind)} className={`mt-2 ${inputClass}`}>
            {Object.entries(kindNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold">Destinatario
          <input type="email" autoComplete="off" placeholder="correo@dominio.com" value={to} onChange={e=>setTo(e.target.value)} className={`mt-2 ${inputClass}`} />
        </label>
        <label className="block text-xs font-bold">Asunto
          <input autoComplete="off" value={subject} onChange={e=>setSubject(e.target.value)} className={`mt-2 ${inputClass}`} />
        </label>
        <label className="block text-xs font-bold">Mensaje
          <textarea value={body} onChange={e=>setBody(e.target.value)} rows={8} className={`mt-2 ${inputClass}`} />
        </label>
        <button onClick={save} type="button" className="rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white hover:bg-sky-700">Guardar en buzón</button>
      </div>
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-black">Identidad del remitente</h3>
        <p className="text-xs text-slate-500">La identidad visible será utilizada en las plantillas. Las contraseñas SMTP se configuran únicamente en el servidor.</p>
        <label className="block text-xs font-bold">Nombre de remitente
          <input value={preferences.senderName} onChange={e=>setPreferences({...preferences,senderName:e.target.value})} className={`mt-2 ${inputClass}`}/>
        </label>
        <label className="block text-xs font-bold">Correo de respuesta
          <input type="email" autoComplete="off" value={preferences.replyTo} placeholder="soporte@dominio.com" onChange={e=>setPreferences({...preferences,replyTo:e.target.value})} className={`mt-2 ${inputClass}`}/>
        </label>
        <button onClick={()=>{try{saveMailPreferences(preferences);setError('');setOk('Datos del remitente guardados.');}catch(err){setError(err instanceof Error?err.message:'No se pudo guardar.');}}} type="button" className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-800 hover:bg-slate-50">Guardar remitente</button>
        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <strong>Estados de mensajes</strong>
          <p className="mt-2">Preparado: guardado en este navegador. Enviado: aceptado por el servicio SMTP. Abrir tu correo no permite confirmar automáticamente la entrega.</p>
        </div>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {ok && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{ok}</p>}
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-black">Buzón de salida</h3><span className="text-xs text-slate-500">{items.length} mensajes</span></div>
      {items.length === 0 ? <p className="rounded-xl bg-slate-50 p-5 text-center text-sm text-slate-500">Todavía no hay avisos preparados. Generá un mensaje o actualizá los avisos de contratación.</p> : <div className="space-y-3">
        {items.map(item => <article key={item.id} className="rounded-2xl border border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold text-slate-900">{item.subject}</p><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.status==='sent'?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>{item.status==='sent'?'Enviado':'Preparado'}</span></div>
          <p className="mt-1 text-xs text-slate-500">{item.to} · {new Date(item.createdAt).toLocaleString('es-PY')}</p>
          <details className="mt-3"><summary className="cursor-pointer text-xs font-semibold text-sky-700">Ver mensaje</summary><p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{item.body}</p></details>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={mailtoFor(item)} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white"><ExternalLink size={14}/>Abrir en mi correo</a>
            <button onClick={()=>void copy(item)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"><Copy size={14}/>Copiar</button>
            {item.status==='prepared' && <button onClick={()=>void send(item)} disabled={sending===item.id} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-50"><Send size={14}/>{sending===item.id?'Enviando':'Enviar por servidor'}</button>}
            {item.status==='sent' && <span className="inline-flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 size={14}/>Confirmación SMTP</span>}
          </div>
        </article>)}
      </div>}
    </div>
  </section>;
};
