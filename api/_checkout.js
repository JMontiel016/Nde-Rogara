/**
 * Checkout de demostración multi-dispositivo.
 * Firebase/Firestore es la autoridad para estado, secuencia global y envío SMTP.
 * La pulsación "Pagar" NO constituye una transacción bancaria.
 */
import { createHash, randomBytes } from 'node:crypto';
import { getAdmin, defaults, transport } from './_mail.js';
import { allowedPlans, makePdf } from './_receipt.js';

const hash = s => createHash('sha256').update(s).digest('hex');
const clean = (x,n=120) => typeof x==='string' ? x.trim().slice(0,n) : '';
const emailOK = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length<=180;
const err = (status,message) => Object.assign(new Error(message),{status});
const reply = (res,status,obj) => res.status(status).json(obj);
const number = n => '001-001-'+String(n).padStart(7,'0');
const getRef = (db,token) => db.collection('demo_checkout_sessions').doc(hash(token));
const basic = doc => ({
  state:doc.state,planName:doc.planName,amount:doc.amount,
  expiresAt:doc.expiresAt,reference:doc.reference
});
async function authenticated(firebase,req) {
  const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
  if(!token) throw err(401,'Iniciá sesión para gestionar tu contratación.');
  let user;
  try{user=await firebase.auth().verifyIdToken(token,true);}
  catch{throw err(401,'Tu sesión ha caducado. Volvé a iniciar sesión.');}
  if(!user.email_verified || !emailOK(user.email||''))throw err(403,'Verificá tu correo en Firebase para continuar.');
  return user;
}
function checkBuyer(raw) {
  const b=raw||{};
  const name=clean(b.fullName,100),taxName=clean(b.taxName,100),email=clean(b.email,180).toLowerCase();
  const docType=b.documentType==='ruc'?'ruc':'ci',ci=clean(b.ci,10),ruc=clean(b.ruc,10),dv=clean(b.rucDv,1);
  const customerRuc=docType==='ruc'?ruc+'-'+dv:ci;
  if(name.length<4||taxName.length<3||!emailOK(email)||!/^\+?[0-9 ()-]{8,}$/.test(clean(b.phone,32)))
    throw err(400,'Completá nombre, correo, celular y datos del comprobante.');
  if(docType==='ruc' ? (!/^\d{3,9}$/.test(ruc)||!/^\d$/.test(dv)) : !/^\d{3,10}$/.test(ci))
    throw err(400,'Revisá el número de CI o RUC y su dígito verificador.');
  return {customerName:taxName,customerEmail:email,customerRuc,customerDocumentType:docType,
    customerAddress:clean(b.address,180),customerPostalCode:clean(b.postalCode,10),phone:clean(b.phone,32),
    autoRenew:b.autoRenew===true};
}
function publicInvoice(d) {
  return { id:'invoice-'+d.paymentId,paymentId:d.paymentId,ownerId:d.ownerId,
    customerName:d.buyer.customerName,customerEmail:d.buyer.customerEmail,
    customerRuc:d.buyer.customerRuc,customerDocumentType:d.buyer.customerDocumentType,
    customerAddress:d.buyer.customerAddress,customerPostalCode:d.buyer.customerPostalCode,
    phone:d.buyer.phone,issueDate:d.confirmedAt,amount:d.amount,documentNumber:d.documentNumber,
    status:'approved',planName:d.planName,method:d.method==='qr'?'Código QR':'Tarjeta' };
}
function safeError(errObj) {
  if(errObj?.code==='EAUTH')return 'Gmail rechazó el acceso SMTP. Actualizá la contraseña de aplicaciones en Vercel.';
  if(errObj?.message?.includes('FIREBASE_SERVICE_ACCOUNT'))return 'Falta configurar la clave de Firebase del servidor.';
  return 'No se pudo enviar el PDF: revisá la configuración SMTP y los registros del panel.';
}
async function deliver(db,firebase,session) {
  const dispatch=db.collection('mail_receipt_dispatch').doc(hash(session.ownerId+':'+session.paymentId));
  let shouldSend=false;
  await db.runTransaction(async tx=>{
    const snap=await tx.get(dispatch),d=snap.data()||{};
    if(d.status==='accepted')return;
    if(d.status==='processing'&&Date.now()-(d.reservedAt||0)<120000)return;
    if((d.attempts||0)>=3)return;
    tx.set(dispatch,{uid:session.ownerId,to:session.buyer.customerEmail,paymentId:session.paymentId,
      planId:session.planId,documentNumber:session.documentNumber,status:'processing',
      attempts:(d.attempts||0)+1,reservedAt:Date.now(),updatedAt:new Date().toISOString()},{merge:true});
    shouldSend=true;
  });
  if(!shouldSend)return;
  const to=session.buyer.customerEmail,plan=allowedPlans.get(session.planId);
  try {
    const saved=(await db.collection('private_configuration').doc('mail').get()).data()||{};
    const config={...defaults(),...saved};
    if(process.env.SMTP_PASS&&!config.passwordEncrypted)config.enabled=true;
    const attachment=await makePdf({
      paymentId:session.paymentId,issueDate:session.confirmedAt,
      customerName:session.buyer.customerName,customerDocument:session.buyer.customerRuc,
      customerDocumentType:session.buyer.customerDocumentType,method:session.method
    },plan,session.documentNumber,to);
    const result=await transport(config).sendMail({
      from:{name:config.senderName||'Nde Rogarã',address:config.from||config.user},
      to,replyTo:config.replyTo||undefined,
      subject:'Nde Rogarã | Comprobante '+session.documentNumber,
      text:'Hola, '+session.buyer.customerName+':\n\nAdjuntamos el comprobante '+session.documentNumber+
      ' de tu plan '+session.planName+'.\n\nEsta contratación es de demostración, sin cargo bancario ni validez tributaria.\n\nNde Rogarã',
      attachments:[{filename:'Comprobante-Nde-Rogara-'+session.documentNumber+'.pdf',
        content:attachment,contentType:'application/pdf'}],
    });
    if(!result.accepted?.some(x=>x.toLowerCase()===to))throw Object.assign(new Error('SMTP no aceptó el destinatario'),{code:'NOT_ACCEPTED'});
    await dispatch.set({status:'accepted',messageId:result.messageId||null,updatedAt:new Date().toISOString()},{merge:true});
    await db.collection('mail_delivery_logs').add({type:'receipt',status:'accepted',to,
      paymentId:session.paymentId,documentNumber:session.documentNumber,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()});
  }catch(e) {
    const explanation=safeError(e),code=String(e.code||'SMTP_ERROR').slice(0,60);
    await dispatch.set({status:'failed',errorMessage:explanation,errorCode:code,updatedAt:new Date().toISOString()},{merge:true});
    await db.collection('mail_delivery_logs').add({type:'receipt',status:'failed',to,
      paymentId:session.paymentId,documentNumber:session.documentNumber,
      errorMessage:explanation,errorCode:code,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()}).catch(()=>{});
  }
}
async function mailStatus(db,session) {
  const d=(await db.collection('mail_receipt_dispatch').doc(hash(session.ownerId+':'+session.paymentId)).get()).data();
  return {state:d?.status||'pending',error:d?.errorMessage||undefined};
}
async function finalize(db,firebase,ref,token) {
  let confirmed;
  await db.runTransaction(async tx=>{
    const snap=await tx.get(ref);
    if(!snap.exists)throw err(404,'Este enlace QR no existe.');
    const record=snap.data();
    if(record.state==='confirmed'){confirmed=record;return;}
    if(record.state!=='pending'||record.expiresAt<Date.now())throw err(410,'Este QR venció. Generá otro.');
    const counter=db.collection('demo_invoice_counters').doc('001-001');
    const seq=await tx.get(counter);
    // Primer número central: no reutilizar los dos números emitidos en la antigua muestra local.
    const next=Math.max(2,Number(seq.data()?.last||0))+1;
    if(next>9999999)throw err(503,'Se agotó la serie de comprobantes de demostración.');
    const now=new Date().toISOString();
    const completed={...record,state:'confirmed',confirmedAt:now,documentNumber:number(next)};
    tx.set(counter,{last:next,updatedAt:now});
    tx.update(ref,{state:'confirmed',confirmedAt:now,documentNumber:completed.documentNumber});
    tx.create(db.collection('demo_invoices').doc(record.paymentId),{
      ...publicInvoice(completed),ownerUid:record.ownerId,createdAt:now
    });
    confirmed=completed;
  });
  // Si el email falla, la contratación y su correlativo permanecen confirmados.
  await deliver(db,firebase,confirmed);
  return confirmed;
}
/** Crear sesión a nombre del propietario y guardarla para todos los dispositivos. */
export async function createQrCheckout(req,res) {
  try {
    const firebase=getAdmin(),user=await authenticated(firebase,req),body=req.body||{};
    const plan=allowedPlans.get(body.planId);
    if(!plan)throw err(400,'Plan desconocido.');
    const buyer=checkBuyer(body.billing);
    const token=randomBytes(24).toString('hex'),paymentId=randomBytes(16).toString('hex');
    const date=Date.now(),record={ownerId:user.uid,planId:body.planId,planName:plan.name,
      amount:plan.amount,paymentId,buyer,method:'qr',state:'pending',reference:paymentId.slice(0,10).toUpperCase(),
      createdAt:date,expiresAt:date+15*60*1000};
    await getRef(firebase.firestore(),token).create(record);
    return reply(res,201,{token,reference:record.reference,expiresAt:record.expiresAt});
  }catch(e){return reply(res,e.status||503,{error:e.status?e.message:'No se pudo generar el QR. Revisá Firebase en Vercel.'});}
}
/** Vista pública para escaneo y vista privada autenticada para titular del pago. */
export async function statusQrCheckout(req,res,token) {
  try {
    if(!/^[a-f0-9]{48}$/.test(token))throw err(404,'Enlace desconocido.');
    const firebase=getAdmin(),db=firebase.firestore();
    const record=(await getRef(db,token).get()).data();
    if(!record)throw err(404,'Enlace desconocido.');
    if(record.state==='pending'&&record.expiresAt<Date.now())throw err(410,'El código venció.');
    const basicData=basic(record);
    const auth=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
    if(auth) {
      let user;try{user=await firebase.auth().verifyIdToken(auth,true)}catch{throw err(401,'Sesión inválida.');}
      if(user.uid!==record.ownerId)throw err(403,'Este QR pertenece a otra cuenta.');
      return reply(res,200,{...basicData,invoice:record.state==='confirmed'?publicInvoice(record):undefined,
        mail:record.state==='confirmed'?await mailStatus(db,record):undefined});
    }
    return reply(res,200,basicData);
  }catch(e){return reply(res,e.status||503,{error:e.status?e.message:'No se pudo verificar el QR.'});}
}
export async function confirmQrCheckout(req,res,token) {
  try {
    if(!/^[a-f0-9]{48}$/.test(token))throw err(404,'Enlace desconocido.');
    const firebase=getAdmin(),db=firebase.firestore();
    const ref=getRef(db,token),existing=(await ref.get()).data();
    if(!existing)throw err(404,'Enlace desconocido.');
    // Un token confirma sólo su contratación. Es una prueba, nunca un cargo bancario.
    if(existing.state==='confirmed')return reply(res,200,{state:'confirmed',reference:existing.reference});
    await finalize(db,firebase,ref,token);
    return reply(res,200,{state:'confirmed',reference:existing.reference});
  }catch(e){return reply(res,e.status||503,{error:e.status?e.message:'No se pudo confirmar el QR.'});}
}
export async function cardCheckout(req,res) {
  try {
    const firebase=getAdmin(),user=await authenticated(firebase,req),body=req.body||{};
    const plan=allowedPlans.get(body.planId);
    if(!plan)throw err(400,'Plan desconocido.');
    const buyer=checkBuyer(body.billing);
    const requestId=clean(body.requestId,70);
    if(!/^[a-f0-9-]{32,70}$/i.test(requestId))throw err(400,'Referencia de solicitud inválida.');
    const db=firebase.firestore(),ref=db.collection('demo_checkout_card').doc(hash(user.uid+':'+requestId));
    let existing=await ref.get();
    if(!existing.exists){
      try{await ref.create({ownerId:user.uid,planId:body.planId,planName:plan.name,
        amount:plan.amount,paymentId:requestId,buyer,method:'card',state:'pending',reference:requestId.slice(0,10),
        createdAt:Date.now(),expiresAt:Date.now()+15*60*1000});}catch(e){if(e.code!==6&&e.code!== 'already-exists')throw e;}
    }
    const result=await finalize(db,firebase,ref,requestId);
    return reply(res,200,{invoice:publicInvoice(result),mail:await mailStatus(db,result)});
  }catch(e){return reply(res,e.status||503,{error:e.status?e.message:'No se pudo registrar la contratación. Revisá Firebase/Firestore.'});}
}
