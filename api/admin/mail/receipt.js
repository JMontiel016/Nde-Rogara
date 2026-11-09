/**
 * Reenvío EXCEPCIONAL de comprobantes: administrador Firebase con custom claim admin.
 * El correo principal procede del comprobante y no puede cambiarse en este endpoint.
 * Se permiten hasta 3 copias opcionales (CC). Los datos no representan una factura SIFEN.
 */
import { createHash } from 'node:crypto';
import { getAdmin, defaults, transport } from '../_mail.js';
import { allowedPlans, makePdf } from '../_receipt.js';

const emailOK = value => typeof value === 'string' && value.length <= 180 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const bad = (res, status, error, code) => res.status(status).json({error, code:code||'MAIL_ERROR'});
const clean = (v, n) => typeof v === 'string' ? v.trim().slice(0,n) : '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return bad(res,405,'Método no permitido.');
  let db, ref, firebase, invoice, to, cc=[], plan, locked=false;
  try {
    firebase=getAdmin();
    const token = (req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
    if(!token) return bad(res,401,'Iniciá sesión como administrador.');
    let user;
    try { user=await firebase.auth().verifyIdToken(token,true); }
    catch { return bad(res,401,'La sesión de Firebase expiró.'); }
    if(user.admin !== true) return bad(res,403,'No tenés permisos para reenviar comprobantes.');

    invoice=req.body?.invoice||{};
    plan=allowedPlans.get(req.body?.planId);
    to=clean(invoice.customerEmail,180).toLowerCase();
    cc=Array.isArray(req.body?.cc) ? req.body.cc : [];
    if(!plan || !emailOK(to) || cc.length>3 ||
       cc.some(x=>!emailOK(x)||x.toLowerCase()===to) ||
       new Set(cc.map(x=>x.toLowerCase())).size !== cc.length)
      return bad(res,400,'Revisá el destinatario y las direcciones en copia (máximo 3).');
    const paymentId=clean(invoice.paymentId,90);
    const number=clean(invoice.documentNumber,40);
    const name=clean(invoice.customerName,100);
    const doc=clean(invoice.customerRuc,22);
    const docType=invoice.customerDocumentType==='ruc'?'ruc':'ci';
    const method=req.body.method;
    if(!/^[\w-]{8,90}$/.test(paymentId) || !/^[\w-]{3,40}$/.test(number) ||
       name.length<3 || !/^\d{3,10}(-\d)?$/.test(doc) ||
       !['card','qr'].includes(method) ||
       invoice.planName!==plan.name || Number(invoice.amount)!==plan.amount)
      return bad(res,400,'Los datos del comprobante o importe no son válidos.');

    db=firebase.firestore();
    // Consulta del envío automático. No se reenvía un PDF que ya fue aceptado.
    const automatic=await db.collection('mail_receipt_dispatch').where('paymentId','==',paymentId).limit(10).get();
    if(automatic.docs.some(doc=>doc.data().status==='accepted'))
      return bad(res,409,'Este comprobante ya fue aceptado por SMTP. No se enviará duplicado.','ALREADY_ACCEPTED');
    const id=createHash('sha256').update('manual:'+paymentId).digest('hex');
    ref=db.collection('mail_receipt_manual_dispatch').doc(id);
    await db.runTransaction(async tx=>{
      const entry=await tx.get(ref);const existing=entry.data()||{};
      if(existing.status==='accepted') throw Object.assign(new Error('Este comprobante ya fue reenviado manualmente.'),{status:409,code:'ALREADY_ACCEPTED'});
      if(existing.status==='processing' && Date.now()-(existing.reservedAt||0)<120000)
        throw Object.assign(new Error('El reenvío está en proceso.'),{status:409,code:'IN_PROGRESS'});
      if((existing.attempts||0)>=3)
        throw Object.assign(new Error('Se alcanzó el límite de 3 intentos manuales.'),{status:429,code:'ATTEMPTS_LIMIT'});
      tx.set(ref,{paymentId,documentNumber:number,to,cc:cc.map(x=>x.trim().toLowerCase()),
        status:'processing',reservedAt:Date.now(),attempts:(existing.attempts||0)+1,
        updatedBy:user.uid,updatedAt:new Date().toISOString()},{merge:true});
    });
    locked=true;
    const saved=(await db.collection('private_configuration').doc('mail').get()).data()||{};
    const config={...defaults(),...saved};
    if(process.env.SMTP_PASS && !config.passwordEncrypted) config.enabled=true;
    const pdf=await makePdf({paymentId,customerName:name,customerDocument:doc,
      customerDocumentType:docType,method},plan,number,to);
    const message=await transport(config).sendMail({
      from:{name:config.senderName||'Nde Rogarã',address:config.from||config.user},
      to,cc:cc.map(x=>x.trim().toLowerCase()),
      replyTo:config.replyTo||undefined,
      subject:'Nde Rogarã | Comprobante de contratación '+number,
      text:`Hola, ${name}:\n\nAdjuntamos el comprobante de la contratación de ${plan.name}.\n\nEste documento es de demostración, sin cobro bancario ni validez tributaria.\n\nNde Rogarã`,
      attachments:[{filename:'Comprobante-Nde-Rogara-'+number.replace(/[^\w-]/g,'')+'.pdf',content:pdf,contentType:'application/pdf'}],
    });
    if(!message.accepted?.some(x=>x.toLowerCase()===to))
      throw Object.assign(new Error('El servidor SMTP no aceptó el destinatario.'),{code:'SMTP_NOT_ACCEPTED'});
    await ref.set({status:'accepted',messageId:message.messageId||null,updatedAt:new Date().toISOString()},{merge:true});
    await db.collection('mail_delivery_logs').add({type:'receipt_manual',status:'accepted',to,cc,
      paymentId,documentNumber:number,createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    return res.status(200).json({sent:true,message:'Reenvío aceptado por SMTP.'});
  }catch(error){
    const code=String(error?.code||'SMTP_FAILURE').slice(0,70);
    const status=error?.status||503;
    const description=status===503 ? 'Falló el envío. Revisá Firebase/SMTP y el Centro de correo.' :
      error.message||'No se pudo reenviar el comprobante.';
    if(locked && ref && db){
      await ref.set({status:'failed',errorCode:code,errorMessage:description,updatedAt:new Date().toISOString()},{merge:true}).catch(()=>{});
      await db.collection('mail_delivery_logs').add({type:'receipt_manual',status:'failed',to,
        cc,paymentId:clean(invoice?.paymentId,90),documentNumber:clean(invoice?.documentNumber,40),
        errorCode:code,errorMessage:description,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    }
    return bad(res,status,description,code);
  }
}
