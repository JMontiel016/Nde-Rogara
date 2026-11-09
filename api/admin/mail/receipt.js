/**
 * Reenvío MANUAL de comprobantes: administrador Firebase con custom claim admin.
 * El correo principal procede del comprobante y no puede cambiarse en este endpoint.
 * Se permiten hasta 3 copias opcionales (CC). Los datos no representan una factura SIFEN.
 */
import { createHash } from 'node:crypto';
import { getAdmin, defaults, transport } from '../../_mail.js';
import { allowedPlans, makePdf } from '../../_receipt.js';

const emailOK = value => typeof value === 'string' && value.length <= 180 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const bad = (res, status, error, code) => res.status(status).json({error, code:code||'MAIL_ERROR'});
const clean = (v, n) => typeof v === 'string' ? v.trim().slice(0,n) : '';

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method !== 'POST') return bad(res,405,'Método no permitido.');
  let db, ref, firebase, invoice, to, cc=[], plan, locked=false, manualId='';
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
    // Reenvíos explícitos pueden repetirse incluso tras un envío aceptado.
    // Cada intento tiene su propio registro: nunca sobreescribe uno ya aceptado.
    // Evitar doble clic, abuso y correos accidentales mediante reserva atómica.
    const nonce = clean(req.body?.requestId, 64);
    if (!/^[a-f0-9-]{36}$/i.test(nonce))
      return bad(res,400,'Confirmá el reenvío desde el panel de administración.');
    manualId = createHash('sha256').update(user.uid+':'+paymentId+':'+nonce).digest('hex');
    ref=db.collection('mail_receipt_manual_dispatch').doc(manualId);
    const today=new Date().toISOString().slice(0,10);
    const quotaRef=db.collection('mail_receipt_manual_quotas')
      .doc(createHash('sha256').update(paymentId+':'+today).digest('hex'));
    await db.runTransaction(async tx=>{
      const [entry, quota] = await Promise.all([tx.get(ref),tx.get(quotaRef)]);
      if(entry.exists)throw Object.assign(new Error('Este intento ya fue procesado. Actualizá el historial antes de volver a enviar.'),{status:409,code:'DUPLICATE_ATTEMPT'});
      const prior=quota.data()||{};
      if((prior.count||0)>=8)throw Object.assign(new Error('Se alcanzó el máximo de 8 reenvíos diarios para esta factura.'),{status:429,code:'DAILY_LIMIT'});
      if(Date.now()-(prior.lastReservedAt||0)<60000)
        throw Object.assign(new Error('Esperá un minuto antes de reenviar esta factura nuevamente.'),{status:429,code:'COOLDOWN'});
      tx.set(quotaRef,{paymentId,date:today,count:(prior.count||0)+1,lastReservedAt:Date.now()},{merge:true});
      tx.create(ref,{paymentId,documentNumber:number,to,cc:cc.map(x=>x.trim().toLowerCase()),
        status:'processing',reservedAt:Date.now(),attempts:1,
        updatedBy:user.uid,updatedAt:new Date().toISOString()});
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
      manualId,paymentId,documentNumber:number,createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    return res.status(200).json({sent:true,message:'Reenvío aceptado por SMTP.'});
  }catch(error){
    const code=String(error?.code||'SMTP_FAILURE').slice(0,70);
    const status=error?.status||503;
    const description=status===503 ? 'Falló el envío. Revisá Firebase/SMTP y el Centro de correo.' :
      error.message||'No se pudo reenviar el comprobante.';
    if(locked && ref && db){
      await ref.set({status:'failed',errorCode:code,errorMessage:description,updatedAt:new Date().toISOString()},{merge:true}).catch(()=>{});
      await db.collection('mail_delivery_logs').add({type:'receipt_manual',status:'failed',to,
        cc,manualId,paymentId:clean(invoice?.paymentId,90),documentNumber:clean(invoice?.documentNumber,40),
        errorCode:code,errorMessage:description,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
    }
    return bad(res,status,description,code);
  }
}
