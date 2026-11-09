import React, { useEffect, useState } from 'react';
import { firebaseAuth } from '../../services/firebaseAuth';
import { CheckCircle2, RefreshCw, Send, ShieldCheck, Server, AlertTriangle } from 'lucide-react';

type Settings = {provider:string;host:string;port:number;secure:boolean;user:string;from:string;senderName:string;replyTo:string;enabled:boolean;hasPassword:boolean};
type Log = {id:string;to:string;type:string;status:string;errorCode?:string;createdAt?:string};
const defaults: Settings = {provider:'gmail',host:'smtp.gmail.com',port:465,secure:true,user:'',from:'',senderName:'Nde Rogarã',replyTo:'',enabled:false,hasPassword:false};
const field='mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-500';
const base=(import.meta.env.VITE_MAIL_API_URL||'/api/admin/mail/send').replace(/\/send$/,'');
async function request<T>(path:string,method='GET',body?:unknown):Promise<T> {
  const token=await firebaseAuth.getFreshIdToken();
  if(!token)throw new Error('Se requiere iniciar sesión en Firebase con una cuenta administradora autorizada.');
  const response=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error([data.error||'Error del servidor',data.code].filter(Boolean).join(' · '));
  return data as T;
}
export const AdminSmtpSettings:React.FC=()=>{
  const [data,setData]=useState<Settings>(defaults);
  const [password,setPassword]=useState('');
  const [recipient,setRecipient]=useState('');
  const [logs,setLogs]=useState<Log[]>([]);
  const [busy,setBusy]=useState('');
  const [status,setStatus]=useState('');
  const [error,setError]=useState('');
  const [loaded,setLoaded]=useState(false);
  const refresh=async()=>{
    setBusy('refresh');setError('');
    try {const [settings,history]=await Promise.all([request<Settings>('/settings'),request<Log[]>('/logs')]);setData(settings);setLogs(history);setLoaded(true);}
    catch(e){setError(e instanceof Error?e.message:'No se pudo cargar la configuración.');}
    finally{setBusy('');}
  };
  useEffect(()=>{void refresh();},[]);
  const action=async(type:'save'|'verify'|'test')=>{
    setBusy(type);setError('');setStatus('');
    try{
      if(type==='save'){
        const result=await request<Settings>('/settings','PUT',{...data,password:password||undefined});
        setData(result);setPassword('');setStatus('Configuración guardada en el servidor.');
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
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 text-lg font-black"><Server size={19}/> Configuración SMTP</h3><p className="mt-1 text-xs text-slate-500">Solo administradores autorizados en Firebase. La contraseña se almacena cifrada en el servidor.</p></div><button type="button" onClick={()=>void refresh()} disabled={!!busy} className="flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold"><RefreshCw size={14}/> Actualizar</button></div>
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
      <label className="text-xs font-bold md:col-span-2">Contraseña de aplicaciones {data.hasPassword?'(configurada; dejar vacío para conservar)':''}<input className={field} type="password" autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Ingresá una nueva contraseña de aplicaciones"/></label>
    </div>
    <label className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 text-sm font-bold"><input type="checkbox" checked={data.enabled} onChange={e=>update('enabled',e.target.checked)}/> Activar envío desde el servidor</label>
    <div className="flex flex-wrap gap-2"><button disabled={!!busy} onClick={()=>void action('save')} className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Guardar configuración</button><button disabled={!!busy||!loaded} onClick={()=>void action('verify')} className="rounded-xl border px-4 py-2.5 text-sm font-bold disabled:opacity-50"><ShieldCheck className="mr-2 inline" size={16}/> Verificar conexión</button></div>
    <div className="space-y-3 border-t pt-4"><h4 className="font-black">Prueba de envío</h4><div className="flex flex-col gap-2 sm:flex-row"><input className={field} type="email" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="destinatario@correo.com"/><button disabled={!!busy||!loaded} onClick={()=>void action('test')} className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Send size={15}/> Enviar prueba</button></div></div>
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {status && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16}/>{status}</p>}
    <div className="border-t pt-4"><h4 className="mb-3 font-black">Historial del servidor</h4>{logs.length===0?<p className="text-sm text-slate-500">Sin envíos registrados.</p>:<div className="max-h-64 space-y-2 overflow-auto">{logs.map(log=><div key={log.id} className="flex flex-wrap justify-between gap-2 rounded-xl border p-3 text-xs"><span><strong>{log.type==='test'?'Prueba':'Correo'}</strong> · {log.to}<br/>{log.createdAt?new Date(log.createdAt).toLocaleString('es-PY'):'Fecha pendiente'}</span><span className={log.status==='accepted'?'text-emerald-700':'text-rose-700'}>{log.status==='accepted'?'Aceptado por SMTP':'Error'} {log.errorCode||''}</span></div>)}</div>}</div>
  </section>;
};
