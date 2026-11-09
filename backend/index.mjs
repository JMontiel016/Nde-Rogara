/**
 * Servicio opcional para despliegue en Cloud Run (no se activa por npm run dev).
 * Requiere Google Cloud Vision SafeSearch, Firebase Admin, Storage y credenciales.
 * Sólo se guardan fotos aprobadas. La comprobación debe repetirse sobre el servidor
 * que publique avisos: el cliente no es una fuente de confianza.
 */
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import vision from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';
import admin from 'firebase-admin';
import { randomUUID } from 'node:crypto';
import { buildMailRouter } from './mailAdmin.mjs';

admin.initializeApp();
const scanner = new vision.ImageAnnotatorClient();
const storage = new Storage();
const app = express();
const bucketName = process.env.PUBLIC_APPROVED_PHOTOS_BUCKET;
const origins = new Set((process.env.WEB_ORIGINS||'http://localhost:5173').split(',').map(x=>x.trim()));
const upload = multer({storage:multer.memoryStorage(),limits:{fileSize:8_000_000,files:1},fileFilter:(_req,file,done)=>done(null,['image/jpeg','image/png','image/webp'].includes(file.mimetype))});
const likelihood = {UNKNOWN:0,VERY_UNLIKELY:1,UNLIKELY:2,POSSIBLE:3,LIKELY:4,VERY_LIKELY:5};
const level = value => likelihood[value] ?? 0;
const cors = (req,res,next)=>{
  const origin=req.get('origin');
  if(origin && origins.has(origin)){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');res.set('Access-Control-Allow-Headers','Authorization, Content-Type');res.set('Access-Control-Allow-Methods','POST, OPTIONS');}
  if(req.method==='OPTIONS')return res.status(origins.has(origin)?204:403).end();
  if(origin&&!origins.has(origin))return res.status(403).json({approved:false,reason:'Origen no autorizado.'});
  next();
};
const authenticated=async(req,res,next)=>{
  const match=/^Bearer (.+)$/.exec(req.get('authorization')||'');
  if(!match)return res.status(401).json({approved:false,reason:'Se requiere una sesión válida.'});
  try {req.user=await admin.auth().verifyIdToken(match[1],true);return next();}
  catch{return res.status(401).json({approved:false,reason:'Sesión vencida o no autorizada.'});}
};

app.post('/api/moderation/photos',cors,authenticated,upload.single('photo'),async(req,res)=>{
  if(!bucketName)return res.status(503).json({approved:false,reason:'El almacenamiento de fotos aprobadas no está configurado.'});
  if(!req.file)return res.status(400).json({approved:false,reason:'Seleccioná un archivo JPG, PNG o WEBP válido.'});
  try{
    const metadata=await sharp(req.file.buffer,{limitInputPixels:25_000_000}).metadata();
    if(!metadata.width||!metadata.height||metadata.width<300||metadata.height<300)return res.status(422).json({approved:false,reason:'Foto prohibida por la política de la empresa.'});
    // Vision SafeSearch clasifica contenido adulto/sugestivo y violencia.
    const [result]=await scanner.annotateImage({image:{content:req.file.buffer},features:[{type:'SAFE_SEARCH_DETECTION'},{type:'LABEL_DETECTION',maxResults:30}]});
    const safe=result.safeSearchAnnotation;
    if(!safe)throw new Error('Sin veredicto del proveedor');
    const labels=(result.labelAnnotations||[]).filter(x=>(x.score||0)>=0.78).map(x=>(x.description||'').toLowerCase());
    const prohibitedLabels=/\b(?:firearm|handgun|weapon|rifle|cocaine|heroin|pornography|sex toy|slot machine|casino|syringe)\b/;
    const unsafe=level(safe.adult)>=3||level(safe.racy)>=4||level(safe.violence)>=4||labels.some(text=>prohibitedLabels.test(text));
    if(unsafe)return res.status(422).json({approved:false,reason:'Foto prohibida por la política de la empresa.'});
    // Sólo se almacena el resultado aceptado; sharp elimina metadatos EXIF.
    const clean=await sharp(req.file.buffer,{limitInputPixels:25_000_000}).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).jpeg({quality:82,mozjpeg:true}).toBuffer();
    const key=`approved/${req.user.uid}/${randomUUID()}.jpg`;
    await storage.bucket(bucketName).file(key).save(clean,{resumable:false,contentType:'image/jpeg',metadata:{cacheControl:'public,max-age=86400'}});
    // El bucket público debe contener ÚNICAMENTE imágenes aprobadas, sin documentos privados.
    const url=`https://storage.googleapis.com/${encodeURIComponent(bucketName)}/${key}`;
    return res.status(201).json({approved:true,url});
  }catch(error){console.error('Falló la verificación de fotos:',error?.message||'Error');return res.status(503).json({approved:false,reason:'No se pudo verificar la foto. Intentalo más tarde.'});}
});

// Configuración y diagnósticos: únicamente ID token Firebase con claim admin.
const mailService = buildMailRouter(admin,authenticated,cors);
app.use('/api/admin/mail', express.json({limit:'20kb'}), mailService.router);

/**
 * Envío SMTP protegido en backend: no acepta la cuenta de demo local como
 * credencial. Requiere un ID token Firebase con custom claim admin === true.
 * No registra cuerpos de mensajes ni contraseñas en logs.
 */
app.post('/api/admin/mail/send', cors, authenticated, express.json({ limit: '20kb' }), async(req,res)=>{
  if(req.user?.admin !== true) return res.status(403).json({error:'Permiso administrativo no autorizado.'});
  const { to, subject, body } = req.body || {};
  if(typeof to !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) ||
     typeof subject !== 'string' || subject.trim().length < 3 || subject.length > 180 ||
     typeof body !== 'string' || body.trim().length < 10 || body.length > 9000) {
    return res.status(400).json({error:'Revisá destinatario, asunto y contenido.'});
  }
  try {
    const config=await mailService.getConfig();
    const transport=mailService.transportFor(config);
    const result=await transport.sendMail({from:{name:config.senderName,address:config.from},replyTo:config.replyTo||undefined,to,subject:subject.trim(),text:body.trim()});
    if(!result.accepted?.length) return res.status(502).json({error:'El proveedor no aceptó el mensaje.'});
    await mailService.record('manual',to,'accepted');
    return res.json({sent:true,messageId:result.messageId});
  }catch(err){
    await mailService.record('manual',to,'failed',String(err?.code || 'SMTP_ERROR')).catch(()=>{});
    console.error('Error de SMTP al enviar mensaje administrativo:',err?.code || 'SMTP_ERROR');
    return res.status(502).json({error:'No fue posible enviar el mensaje por SMTP.'});
  }
});

app.get('/health',(_req,res)=>res.json({ok:true}));
// No se inventan facturas. Estos endpoints deben implementarse contra el emisor SIFEN y
// exigir custom claim admin. Hasta tener la integración, nunca devuelven listas ficticias.
app.get('/api/admin/invoices', async(req,res)=>res.status(503).json({error:'Falta conectar el sistema emisor y la sesión de administrador.'}));
app.get('/api/admin/invoices/:id/pdf',async(req,res)=>res.status(503).json({error:'No hay un KuDE autenticado disponible.'}));
const port=Number(process.env.PORT||8081);
app.listen(port,()=>console.log(`Servidor de moderación listo en puerto ${port}`));
