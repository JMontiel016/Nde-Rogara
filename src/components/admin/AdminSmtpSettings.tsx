import React, { useEffect, useState } from 'react';
import { firebaseAuth } from '../../services/firebaseAuth';
import { CheckCircle2, RefreshCw, Send, ShieldCheck, Server, AlertTriangle } from 'lucide-react';

type Settings = {provider:string;host:string;port:number;secure:boolean;user:string;from:string;senderName:string;replyTo:string;enabled:boolean;hasPassword:boolean};
type Log = {id:string;to:string;type:string;status:string;errorCode?:string;errorMessage?:string;documentNumber?:string;paymentId?:string;createdAt?:string};
const defaults: Settings = {provider:'gmail',host:'smtp.gmail.com',port:465,secure:true,user:'016.jmma@gmail.com',from:'016.jmma@gmail.com',senderName:'Nde Rogarã',replyTo:'016.jmma@gmail.com',enabled:false,hasPassword:false};
const field='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500';
const base=(import.meta.env.VITE_MAIL_API_URL||'/api/admin/mail/send').replace(/\/send$/,'');
async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const token=await firebaseAuth.getFreshIdToken();
  if(!token)throw new Error('Se requiere iniciar sesión en Firebase con una cuenta administradora autorizada.');
  const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(response.status===404)throw new Error('No se encontró el servicio de correo (404). Comprobá que las funciones API estén desplegadas en Vercel.');
  if(!response.ok)throw new Error([data.error||'Error del servidor',data.code].filter(Boolean).join(' · '));
  return data as T;
}
export const AdminSmtpSettings:React.FC=()=>{
  const [data,setData]=useState<Settings>(defaults);
  const [password,setPassword]=useState('');
  const [recipient,setRecipient]=useState('016.jmma@gmail.com');
  const [logs,setLogs]=useState<Log[]>([]);
  const [busy,setBusy]=useState('');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const refresh=async()=>{
    setBusy('refresh');setError('');
    try {const [settings,history]=await Promise.all([request<Settings>('/settings'),request<Log[]>('/logs')]);setData({...defaults,...settings,user:settings.user||defaults.user,from:settings.from||defaults.from,replyTo:settings.replyTo||defaults.replyTo});setLogs(history);setLoaded(true);}
    catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la configuración.');}
    finally{setBusy('');}
  };
  // No recargar automáticamente: podía sobrescribir valores que el admin estaba editando.
  // Actualizar solo al entrar o pulsar el botón correspondiente.
  useEffect(()=>{void refresh();},[]);
  const action=async(type:'save'|'verify'|'test')=>{
    setBusy(type);setError('');setStatus('');
    try{
      if(type==='save'){
        const result=await request<Settings>('/settings','PUT',{...data,password:password||undefined});
        setData(result);setPassword('');setStatus(result.hasPassword
          ? 'Configuración almacenada. La contraseña de aplicaciones está protegida y no se muestra de nuevo. Presioná Verificar conexión para comprobar el acceso.'
          : 'Datos guardados, pero falta configurar la contraseña SMTP.');
      }else if(type==='verify'){
        const response=await request<{message:string}>('/verify','POST');
        setStatus(response.message);
      }else{
        if(!recipient.trim())throw new Error('Ingresá un destinatario para la prueba.');
        await request('/test','POST',{to:recipient.trim()});
        setStatus('El proveedor SMTP aceptó el mensaje de prueba. La entrega final depende del destinatario.');
        setLogs(await request<Log[]>('/logs'));
      }
    }catch(e){setError(e instanceof Error?e.message:'La operación falló.');}
    finally{setBusy('');}
  };
  const update=<K extends keyof Settings>(k:K,v:Settings[K])=>setData(d=>({...d,[k]:v}));
  return <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-black"><Server size={19}/> Configuración SMTP</h3><p className="mt-1 text-xs text-slate-500">Cuenta remitente sugerida: 016.jmma@gmail.com. La clave SMTP solo se envía al backend protegido, nunca al código público.</p></div><button type="button" onClick={()=>void refresh()} disabled={!!busy} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Actualizar</button></div>
    {!firebaseAuth.isConfigured() && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mr-2 inline" size={16}/> La cuenta administrativa local de demostración no permite modificar credenciales reales. Configurá Firebase y el backend.</p>}
    <div className="grid gap-4 md:grid-cols-2">
      <label className="text-xs font-bold">Proveedor<select className={field} value={data.provider} onChange={e=>{const v=e.target.value;setData(d=>({...d,provider:v,...(v==='gmail'?{host:'smtp.gmail.com',port:465,secure:true}:v==='outlook'?{host:'smtp.office365.com',port:587,secure:false}:{})}));}}><option value="gmail">Gmail</option><option value="outlook">Microsoft / Outlook</option><option value="custom">SMTP personalizado</option></select></label>
      <label className="text-xs font-bold">Servidor SMTP<input className={field} value={data.host} onChange={e=>update('host',e.target.value)}/></label>
      <label className="text-xs font-bold">Puerto<input className={field} type="number" min={1} max={65535} value={data.port} onChange={e=>update('port',Number(e.target.value))}/></label>
      <label className="flex items-center gap-3 self-end rounded-xl border p-3 text-sm font-bold"><input type="checkbox" checked={data.secure} onChange={e=>update('secure',e.target.checked)}/> SSL/TLS directo (normalmente puerto 465)</label>
      <label className="text-xs font-bold">Usuario SMTP<input className={field} type="email" value={data.user} onChange={e=>update('user',e.target.value)} autoComplete="off"/></label>
      <label className="text-xs font-bold">Correo remitente<input className={field} type="email" value={data.from} onChange={e=>update('from',e.target.value)} autoComplete="off"/></label>
      <label className="text-xs font-bold">Nombre del remitente<input className={field} value={data.senderName} onChange={e=>update('senderName',e.target.value)}/></label>
      <label className="text-xs font-bold">Correo para respuestas (opcional)<input className={field} type="email" value={data.replyTo} onChange={e=>update('replyTo',e.target.value)}/></label>
      <label className="text-xs font-bold md:col-span-2">Contraseña de aplicaciones {data.hasPassword?'(configurada; dejar en blanco para conservarla)':'(necesaria para Gmail)'}<input className={field} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Ingresá una nueva contraseña de aplicaciones"/></label>
    </div>
    <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" checked={data.enabled} onChange={e=>update('enabled',e.target.checked)}/> Activar envío desde el servidor</label>
    <div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={()=>void action('save')} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar configuración</button><button disabled={!!busy||!loaded} onClick={()=>void action('verify')} className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50"><ShieldCheck className="mr-2 inline" size={16}/> Verificar conexión</button></div>
    <div className="space-y-3 border-t pt-4"><h4 className="font-black">Prueba de envío</h4><div className="flex flex-col gap-2 sm:flex-row"><input className={field} type="email" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="destinatario@correo.com"/><button disabled={!!busy||!loaded} onClick={()=>void action('test')} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Send size={15}/> Enviar prueba</button></div></div>
    {data.hasPassword && <p role="status" className="rounded-xl bg-sky-50 p-3 text-xs text-sky-800">La clave de Gmail está guardada del lado del servidor y no se puede recuperar como texto. El campo vacío no la borra. Si Gmail rechaza el acceso, generá una contraseña de aplicaciones nueva y guardala aquí.</p>}
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {status && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16}/>{status}</p>}
    <div className="border-t pt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h4 className="font-black">Historial del servidor y comprobantes</h4><button type="button" onClick={()=>void refresh()} disabled={!!busy} className="rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50">Actualizar historial</button></div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-sky-50 p-3"><strong className="block text-base">{logs.filter(l=>l.type==='receipt').length}</strong>Comprobantes</div>
        <div className="rounded-xl bg-emerald-50 p-3"><strong className="block text-base">{logs.filter(l=>l.status==='accepted').length}</strong>Aceptados SMTP</div>
        <div className="rounded-xl bg-rose-50 p-3"><strong className="block text-base">{logs.filter(l=>l.status==='failed').length}</strong>Errores</div>
      </div>
      {logs.some(l=>l.status==='failed') && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"><strong>Atención:</strong> hay correos que no se enviaron. Revisá el detalle y la conexión SMTP. El sistema no los marca como enviados.</div>}
      {logs.length===0 ? <p className="text-sm text-slate-500">Sin envíos registrados en el servidor.</p> :
        <div className="max-h-80 space-y-2 overflow-auto">{logs.map(log=>
          <div key={log.id} className={`rounded-xl border p-3 text-xs ${log.status==='failed'?'border-rose-200 bg-rose-50/50':'border-slate-200'}`}>
            <div className="flex flex-wrap justify-between gap-2"><span><strong>{log.type==='receipt'?'Comprobante PDF':log.type==='test'?'Prueba SMTP':'Correo manual'}</strong> · {log.to}</span>
              <strong className={log.status==='accepted'?'text-emerald-700':'text-rose-700'}>{log.status==='accepted'?'Aceptado por SMTP':'Error de envío'}</strong>
            </div>
            <p className="mt-1 text-slate-500">{log.createdAt?new Date(log.createdAt).toLocaleString('es-PY'):'Fecha pendiente'} {log.documentNumber?`· Nº ${log.documentNumber}`:''}</p>
            {log.status==='failed' && <p className="mt-2 break-words text-rose-800">{log.errorMessage || log.errorCode || 'Error no especificado. Revisá los registros de Vercel.'}</p>}
          </div>)}</div>}
      <p className="text-[11px] text-slate-500">«Aceptado» significa que el servidor SMTP recibió el correo; no garantiza que esté en la bandeja de entrada del destinatario.</p>
    </div>
  </section>;
};
