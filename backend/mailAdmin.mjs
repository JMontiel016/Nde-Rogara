import { Router } from 'express';
import nodemailer from 'nodemailer';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/** Configuración privada: Firestore + AES-256-GCM, sin credenciales en el navegador. */
export function buildMailRouter(admin, authenticated, cors) {
  const router = Router();
  const db = admin.firestore();
  const configRef = db.collection('private_configuration').doc('mail');
  const logsRef = db.collection('mail_delivery_logs');
  const keyText = process.env.MAIL_ENCRYPTION_KEY || '';
  const secretKey = /^[a-f0-9]{64}$/i.test(keyText) ? Buffer.from(keyText, 'hex') : null;
  const auth = [cors, authenticated, (req,res,next) => req.user?.admin === true ? next() : res.status(403).json({error:'Solo un administrador autorizado puede gestionar el correo.'})];
  const emailOK = s => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const encrypt = value => {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm',secretKey,iv);
    const data = Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
    return [iv,cipher.getAuthTag(),data].map(x=>x.toString('base64')).join('.');
  };
  const decrypt = value => {
    const [iv,tag,data] = value.split('.').map(x=>Buffer.from(x,'base64'));
    const decipher=createDecipheriv('aes-256-gcm',secretKey,iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data),decipher.final()]).toString('utf8');
  };
  // Priorizar ajustes privados del panel; usar variables seguras del servidor solo como respaldo.
  // La contraseña de aplicaciones nunca se devuelve al navegador ni se guarda en el repositorio.
  const fallbackConfig = () => ({
    provider:'gmail',host:process.env.SMTP_HOST||'smtp.gmail.com',
    port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,
    user:process.env.SMTP_USER||'016.jmma@gmail.com',
    from:process.env.SMTP_USER||'016.jmma@gmail.com',
    senderName:'Nde Rogarã',replyTo:process.env.SMTP_USER||'016.jmma@gmail.com',
    enabled:!!process.env.SMTP_PASS,hasPassword:!!process.env.SMTP_PASS
  });
  const getConfig = async () => {
    const stored=(await configRef.get()).data()||{};
    const fallback=fallbackConfig();
    return {...fallback,...stored,
      // Sólo el secreto cifrado guardado en Firestore o el secreto privado del entorno autorizan SMTP.
      hasPassword:!!stored.passwordEncrypted||!!process.env.SMTP_PASS
    };
  };
  const publicConfig = config => ({provider:config.provider||'gmail',host:config.host||'smtp.gmail.com',port:config.port||465,secure:!!config.secure,user:config.user||'',from:config.from||'',senderName:config.senderName||'Nde Rogarã',replyTo:config.replyTo||'',enabled:!!config.enabled,hasPassword:!!config.passwordEncrypted||!!process.env.SMTP_PASS});
  const transportFor = config => {
    const password=config.passwordEncrypted&&secretKey?decrypt(config.passwordEncrypted):process.env.SMTP_PASS;
    if(!config.enabled||!config.host||!config.user||!password)throw Object.assign(new Error('Configuración SMTP incompleta o inactiva.'),{code:'SMTP_CONFIG'});
    return nodemailer.createTransport({host:config.host,port:Number(config.port),secure:!!config.secure,requireTLS:!config.secure,auth:{user:config.user,pass:password},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
  };
  const record = async (type,to,status,errorCode='') => {
    await logsRef.add({type,to,status,errorCode,createdAt:admin.firestore.FieldValue.serverTimestamp()});
  };
  router.get('/settings',...auth,async(req,res)=>{
    try {res.json(publicConfig(await getConfig()));}
    catch {res.status(503).json({error:'No se pudo consultar la configuración de correo.'});}
  });
  router.put('/settings',...auth,async(req,res)=>{
    if(!secretKey && req.body?.password)return res.status(503).json({error:'Para almacenar una nueva clave SMTP, definí MAIL_ENCRYPTION_KEY en el backend. También podés establecer SMTP_PASS como secreto del servidor.'});
    const x=req.body||{};
    const port=Number(x.port);
    if(!['gmail','outlook','custom'].includes(x.provider)||typeof x.host!=='string'||!/^[-a-z0-9.]{3,253}$/i.test(x.host)||!Number.isInteger(port)||port<1||port>65535||!emailOK(x.user)||!emailOK(x.from)|| (x.replyTo && !emailOK(x.replyTo))||typeof x.senderName!=='string'||x.senderName.length>100||typeof x.enabled!=='boolean'||typeof x.secure!=='boolean'||(x.password && (typeof x.password!=='string'||x.password.length>256)))return res.status(400).json({error:'Revisá los campos SMTP.'});
    try {
      const existing=await getConfig();
      if(!x.password && !existing.passwordEncrypted && !process.env.SMTP_PASS)return res.status(400).json({error:'Ingresá una contraseña de aplicaciones o definí SMTP_PASS en el backend.'});
      const update={provider:x.provider,host:x.host.trim(),port,secure:x.secure,user:x.user.trim(),from:x.from.trim(),senderName:x.senderName.trim()||'Nde Rogarã',replyTo:(x.replyTo||'').trim(),enabled:x.enabled,passwordEncrypted:x.password?encrypt(x.password):existing.passwordEncrypted,updatedAt:admin.firestore.FieldValue.serverTimestamp(),updatedBy:req.user.uid};
      await configRef.set(update);
      res.json(publicConfig(update));
    }catch {res.status(503).json({error:'No se pudo guardar. Verificá Firestore y la clave del servidor.'});}
  });
  router.post('/verify',...auth,async(req,res)=>{
    try {const t=transportFor(await getConfig());await t.verify();res.json({ok:true,message:'Conexión y autenticación SMTP verificadas.'});}
    catch(e){res.status(502).json({ok:false,error:'No se pudo verificar SMTP.',code:String(e.code||'SMTP_ERROR')});}
  });
  router.post('/test',...auth,async(req,res)=>{
    const to=req.body?.to;
    if(!emailOK(to))return res.status(400).json({error:'Destinatario inválido.'});
    try {
      const config=await getConfig();
      const t=transportFor(config);
      const result=await t.sendMail({from:{name:config.senderName,address:config.from},replyTo:config.replyTo||undefined,to,subject:'Nde Rogarã | Prueba de correo',text:'Esta es una prueba del servicio de notificaciones de Nde Rogarã.'});
      if(!result.accepted?.includes(to))throw Object.assign(new Error('No aceptado'),{code:'NOT_ACCEPTED'});
      await record('test',to,'accepted');
      res.json({sent:true,messageId:result.messageId});
    } catch(e){await record('test',to,'failed',String(e.code||'SMTP_ERROR')).catch(()=>{});res.status(502).json({error:'Falló el envío de prueba.',code:String(e.code||'SMTP_ERROR')});}
  });
  router.get('/logs',...auth,async(req,res)=>{
    try {const snapshot=await logsRef.orderBy('createdAt','desc').limit(50).get();res.json(snapshot.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.().toISOString()||null}))); }
    catch {res.status(503).json({error:'No se pudo consultar el historial.'});}
  });
  return {router,getConfig,transportFor,record};
}
