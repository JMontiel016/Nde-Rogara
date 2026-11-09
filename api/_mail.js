// Solo para funciones de servidor de Vercel. Nunca importar desde src/.
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const emailOK = value => typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const json = (res, code, data) => res.status(code).json(data);
const collection = 'private_configuration';
let ready = false;

function getAdmin() {
  if (ready && admin.apps.length) return admin;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ? Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,'base64').toString('utf8') : '');
  if (!raw) throw Object.assign(new Error('Configurá FIREBASE_SERVICE_ACCOUNT_BASE64 en Vercel con una clave privada nueva.'), { status:503 });
  let parsed;
  try { parsed = JSON.parse(raw); } catch { throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido.'),{status:503}); }
  if (parsed.project_id !== 'nde-rogara' || !parsed.private_key || !parsed.client_email) {
    throw Object.assign(new Error('La cuenta de servicio de Firebase no es válida para nde-rogara.'),{status:503});
  }
  if (!admin.apps.length) admin.initializeApp({ credential:admin.credential.cert(parsed),projectId:'nde-rogara' });
  ready = true;
  return admin;
}
const secretKey = () => /^[0-9a-f]{64}$/i.test(process.env.MAIL_ENCRYPTION_KEY||'')
  ? Buffer.from(process.env.MAIL_ENCRYPTION_KEY,'hex') : null;
function encrypt(value) {
  const key=secretKey();
  if(!key) throw Object.assign(new Error('Configurá MAIL_ENCRYPTION_KEY en Vercel para guardar una contraseña SMTP.'),{status:503});
  const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv);
  const cipherText=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return [iv,cipher.getAuthTag(),cipherText].map(x=>x.toString('base64')).join('.');
}
function decrypt(value) {
  const key=secretKey();
  if(!key) throw Object.assign(new Error('MAIL_ENCRYPTION_KEY no está configurada.'),{status:503});
  const [iv,tag,cipherText]=value.split('.').map(x=>Buffer.from(x,'base64'));
  const decipher=createDecipheriv('aes-256-gcm',key,iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cipherText),decipher.final()]).toString('utf8');
}
function defaults() {
  const user=process.env.SMTP_USER||'016.jmma@gmail.com';
  return {provider:'gmail',host:process.env.SMTP_HOST||'smtp.gmail.com',
    port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,
    user,from:user,senderName:'Nde Rogarã',replyTo:user,enabled:!!process.env.SMTP_PASS};
}
function publicConfig(config) {
  const {passwordEncrypted, ...rest}=config;
  return {...rest,hasPassword:!!passwordEncrypted||!!process.env.SMTP_PASS};
}
function transport(config) {
  const password=config.passwordEncrypted ? decrypt(config.passwordEncrypted) : process.env.SMTP_PASS;
  if(!config.enabled||!password||!config.host||!config.user) {
    throw Object.assign(new Error('Configuración incompleta. Guardá la contraseña de aplicaciones o definí SMTP_PASS en Vercel.'),{status:503});
  }
  return nodemailer.createTransport({host:config.host,port:Number(config.port),secure:!!config.secure,
    requireTLS:!config.secure,auth:{user:config.user,pass:password},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000});
}
function validate(input) {
  const port=Number(input?.port);
  if(!['gmail','outlook','custom'].includes(input?.provider) ||
    typeof input.host!=='string'||!/^[-a-z0-9.]{3,253}$/i.test(input.host)||
    !Number.isInteger(port)||port<1||port>65535||
    typeof input.secure!=='boolean'||typeof input.enabled!=='boolean'||
    !emailOK(input.user)||!emailOK(input.from)||
    (input.replyTo && !emailOK(input.replyTo))||
    typeof input.senderName!=='string'||input.senderName.length>100||
    (input.password && (typeof input.password!=='string'||input.password.length>256))) {
      throw Object.assign(new Error('Revisá los campos SMTP.'),{status:400});
    }
}
async function log(db,type,to,status,code='') {
  await db.collection('mail_delivery_logs').add({type,to,status,errorCode:code,
    createdAt:admin.firestore.FieldValue.serverTimestamp()});
}

export async function handleMail(req,res,route) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  const methods={settings:['GET','PUT'],logs:['GET'],verify:['POST'],test:['POST'],send:['POST']};
  if(!methods[route]?.includes(req.method)) return json(res,405,{error:'Método no permitido.'});
  try {
    const firebase=getAdmin();
    const header=req.headers.authorization||'';
    if(!header.startsWith('Bearer ')) return json(res,401,{error:'Se requiere iniciar sesión.'});
    let user;
    try {user=await firebase.auth().verifyIdToken(header.slice(7),true);}
    catch {return json(res,401,{error:'Sesión de Firebase no válida.'});}
    if(user.admin!==true) return json(res,403,{error:'Solo los administradores autorizados pueden utilizar el correo.'});
    const db=firebase.firestore();
    const ref=db.collection(collection).doc('mail');
    if(route==='logs') {
      const result=await db.collection('mail_delivery_logs').orderBy('createdAt','desc').limit(50).get();
      return json(res,200,result.docs.map(d=>({id:d.id,...d.data(),createdAt:d.data().createdAt?.toDate?.().toISOString()||null})));
    }
    const saved=(await ref.get()).data()||{};
    const config={...defaults(),...saved};
    if(route==='settings'&&req.method==='GET')return json(res,200,publicConfig(config));
    if(route==='settings') {
      const x=req.body||{};
      validate(x);
      if(!x.password&&!config.passwordEncrypted&&!process.env.SMTP_PASS)
        return json(res,400,{error:'Ingresá una contraseña de aplicaciones nueva.'});
      const updated={provider:x.provider,host:x.host.trim(),port:Number(x.port),secure:x.secure,
        user:x.user.trim(),from:x.from.trim(),senderName:x.senderName.trim()||'Nde Rogarã',
        replyTo:(x.replyTo||'').trim(),enabled:x.enabled,
        passwordEncrypted:x.password?encrypt(x.password):config.passwordEncrypted||null,
        updatedBy:user.uid,updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
      await ref.set(updated);
      return json(res,200,publicConfig(updated));
    }
    const mailer=transport(config);
    if(route==='verify') {
      await mailer.verify();
      return json(res,200,{ok:true,message:'Conexión SMTP verificada correctamente.'});
    }
    if(route==='test') {
      const to=req.body?.to;
      if(!emailOK(to))return json(res,400,{error:'Destinatario inválido.'});
      try {
        const result=await mailer.sendMail({from:{name:config.senderName,address:config.from},to,
          replyTo:config.replyTo||undefined,subject:'Nde Rogarã | Prueba de correo',
          text:'Esta es una prueba del servicio de correo de Nde Rogarã.'});
        if(!result.accepted?.some(a=>a.toLowerCase()===to.toLowerCase())) throw Object.assign(new Error('No aceptado'),{code:'NOT_ACCEPTED'});
        await log(db,'test',to,'accepted');
        return json(res,200,{sent:true,messageId:result.messageId});
      } catch(err) {
        await log(db,'test',to,'failed',String(err.code||'SMTP_ERROR')).catch(()=>{});
        throw err;
      }
    }
    const {to,subject,body}=req.body||{};
    if(!emailOK(to)||typeof subject!=='string'||subject.trim().length<3||subject.length>180||
      typeof body!=='string'||body.trim().length<10||body.length>9000)
      return json(res,400,{error:'Revisá destinatario, asunto y contenido.'});
    try {
      const result=await mailer.sendMail({from:{name:config.senderName,address:config.from},to,
        replyTo:config.replyTo||undefined,subject:subject.trim(),text:body.trim()});
      if(!result.accepted?.some(a=>a.toLowerCase()===to.toLowerCase())) throw Object.assign(new Error('No aceptado'),{code:'NOT_ACCEPTED'});
      await log(db,'manual',to,'accepted');
      return json(res,200,{sent:true,messageId:result.messageId});
    } catch(err) {
      await log(db,'manual',to,'failed',String(err.code||'SMTP_ERROR')).catch(()=>{});
      throw err;
    }
  } catch (err) {
    // No registrar contraseñas, tokens, contenidos de mensajes ni clave Firebase.
    const status=err.status||((err.code||'').startsWith('EAUTH')?502:503);
    return json(res,status,{error: status===503 && !err.status
      ? 'No se pudo consultar Firebase/Firestore o conectar el servidor de correo.'
      : err.message||'No se pudo procesar el envío.',code:err.code||'SERVER_CONFIGURATION'});
  }
}
