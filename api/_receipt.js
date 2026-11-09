/**
 * Envío automático del comprobante de contratación de demostración.
 * Solo permite enviar comprobantes fijos desde una sesión verificada en Firebase;
 * envío limitado por cuenta y operación para evitar uso como correo masivo.
 * Cada operación tiene un identificador único, límite diario y registro persistente.
 * El contenido suministrado por el navegador NO acredita cobro bancario ni emisión SIFEN.
 */
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { getAdmin, defaults, transport } from './_mail.js';

export const allowedPlans = new Map([
  ['basic', { name: 'Básico mensual', amount: 50000 }],
  ['quarterly', { name: 'Trimestral', amount: 135000 }],
  ['premium', { name: 'Premium anual', amount: 450000 }],
  ['professional', { name: 'Profesional anual', amount: 900000 }],
]);
const validEmail = s => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const safe = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
const money = n => new Intl.NumberFormat('es-PY').format(n);
const errorJson = (res, code, error, detail) => res.status(code).json({ error, ...(detail ? { code: detail } : {}) });
const time = () => new Date().toISOString();

/** Diseño A4 inspirado en el ejemplo proporcionado, SIN utilizar datos/CDC/QR fiscales reales. */
export function makePdf(invoice, plan, docNumber, to) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({
      size:'A4', margin:30,
      info:{Title:'Comprobante de muestra Nde Rogarã '+docNumber,
        Subject:'Factura electrónica simulada. Sin validez tributaria',Author:'Nde Rogarã'}
    });
    const chunks=[];
    pdf.on('data',c=>chunks.push(c));pdf.on('end',()=>resolve(Buffer.concat(chunks)));
    pdf.on('error',reject);
    const width=pdf.page.width, margin=29, right=width-margin, area=right-margin;
    const ink='#111827', gray='#4b5563', soft='#e5e7eb';
    const fmt = n => new Intl.NumberFormat('es-PY').format(n);
    const label=(s,x,y,w,opts={})=>pdf.fillColor(ink).font(opts.bold?'Helvetica-Bold':'Helvetica')
      .fontSize(opts.size||9).text(String(s??''),x,y,{width:w,ellipsis:true,...opts});
    const box=(x,y,w,h)=>pdf.lineWidth(0.9).strokeColor(ink).roundedRect(x,y,w,h,6).stroke();
    const row=(k,v,x,y,w,offset=94)=>{label(k,x,y,offset,{bold:true,size:8.7});label(v,x+offset,y,w-offset,{size:8.7});};
    const title='FACTURA ELECTRÓNICA · MODELO DE DEMOSTRACIÓN';
    // Aviso permanente: no debe confundirse con un KuDE autorizado.
    pdf.save().fillColor('#ffefc6').rect(margin,25,area,28).fill().restore();
    label('DOCUMENTO FICTICIO · SIN VALIDEZ TRIBUTARIA · NO APROBADO POR SIFEN',margin+8,33,area-16,
      {bold:true,size:9.5,align:'center'});
    const y1=61,leftW=area*0.69,gap=6,rightX=margin+leftW+gap,rightW=area-leftW-gap;
    box(margin,y1,leftW,133);box(rightX,y1,rightW,133);
    pdf.save().fillColor('#0b5b91').roundedRect(margin+10,y1+12,78,64,6).fill().restore();
    label('NDE',margin+17,y1+21,64,{bold:true,size:20,align:'center',color:'#fff'});
    pdf.fillColor('white').font('Helvetica-Bold').fontSize(20).text('ROGARÃ',margin+12,y1+45,{width:73,align:'center'});
    label('NDE ROGARÃ',margin+97,y1+17,leftW-110,{bold:true,size:16});
    label('Servicios de publicación de inmuebles',margin+97,y1+40,leftW-110,{size:9});
    label('Paraguay · Plataforma inmobiliaria',margin+97,y1+59,leftW-110,{size:9});
    label('Correo: 016.jmma@gmail.com',margin+97,y1+79,leftW-110,{size:8});
    label('Emisor de muestra: datos fiscales ficticios',margin+10,y1+111,leftW-20,{size:8});
    label('Timbrado ficticio: 12345678',rightX+8,y1+12,rightW-16,{bold:true,size:8.5});
    label('RUC ficticio: 87654321-0',rightX+8,y1+31,rightW-16,{bold:true,size:8.5});
    label('Inicio de vigencia: NO APLICA',rightX+8,y1+50,rightW-16,{size:8});
    label(title,rightX+8,y1+70,rightW-16,{bold:true,size:9});
    label(docNumber,rightX+6,y1+99,rightW-12,{bold:true,size:15,align:'center'});
    const y2=202;box(margin,y2,area,145);
    const timeValue=invoice.issueDate ? new Date(invoice.issueDate) : new Date();
    const when=Number.isNaN(timeValue.getTime())?new Date():timeValue;
    const date=when.toLocaleString('es-PY',{timeZone:'America/Asuncion',dateStyle:'short',timeStyle:'medium'});
    const leftX=margin+10,left2=margin+area*0.54,right2=right-left2-12;
    row('Fecha emisión:',date,leftX,y2+11,area*.53,96);
    row('Nombre:',invoice.customerName,leftX,y2+33,area*.53,65);
    row(invoice.customerDocumentType==='ruc'?'RUC:':'C.I.:',invoice.customerDocument,leftX,y2+54,area*.53,65);
    row('Correo:',to,leftX,y2+77,area*.53,65);
    row('Referencia:',invoice.paymentId,leftX,y2+100,area*.53,65);
    row('Condición:', 'Contado (muestra)',left2,y2+11,right2,70);
    row('Forma pago:',invoice.method==='qr'?'QR de prueba':'Tarjeta de prueba',left2,y2+33,right2,70);
    row('Moneda:', 'Guaraníes (PYG)',left2,y2+54,right2,70);
    row('Operación:', 'Prestación de servicios',left2,y2+77,right2,70);
    row('Documento:', 'No asociado',left2,y2+100,right2,70);
    // Cuadro de detalle con columnas del KuDE de referencia.
    const y3=355,hHead=31,hItem=62;
    box(margin,y3,area,hHead+hItem);
    const cols=[40,183,35,34,50,48,43,44,area-477];
    const headers=['Cód.','Descripción','Und.','Cant.','P. Unit.','Dto.','Exentas','5%','10%'];
    let x=margin;
    cols.forEach((w,i)=>{if(i>0)pdf.moveTo(x,y3).lineTo(x,y3+hHead+hItem).strokeColor(ink).lineWidth(.65).stroke();
      label(headers[i],x+3,y3+10,w-6,{size:7.2,bold:true,align:i>1?'center':'left'});x+=w;});
    pdf.moveTo(margin,y3+hHead).lineTo(right,y3+hHead).stroke();
    x=margin;const rowValues=['01','Suscripción a plan de publicación de inmuebles\n'+plan.name,
      'UNI','1',fmt(plan.amount),'0','0','0',fmt(plan.amount)];
    cols.forEach((w,i)=>{label(rowValues[i],x+3,y3+hHead+12,w-6,
      {size:i===1?7.8:7.3,align:i>1?'right':'left'});x+=w;});
    const y4=456;
    box(margin,y4,area,102);
    pdf.moveTo(margin,y4+32).lineTo(right,y4+32).stroke();
    pdf.moveTo(margin,y4+65).lineTo(right,y4+65).stroke();
    label('SUBTOTAL:',margin+10,y4+10,120,{bold:true,size:10});
    label(fmt(plan.amount),right-110,y4+10,100,{bold:true,size:10,align:'right'});
    label('TOTAL DE LA OPERACIÓN:',margin+10,y4+43,205,{bold:true,size:10});
    label('Gs. '+fmt(plan.amount),right-145,y4+43,135,{bold:true,size:11,align:'right'});
    label('TOTAL EN GUARANÍES:',margin+10,y4+77,146,{bold:true,size:9});
    label('Gs. '+fmt(plan.amount),right-145,y4+77,135,{bold:true,size:10,align:'right'});
    const iva=Math.round(plan.amount/11),base=plan.amount-iva;
    box(margin,568,area,52);
    label('LIQUIDACIÓN REFERENCIAL DE IVA (10%)',margin+10,580,245,{bold:true,size:9});
    label('Base: '+fmt(base)+' Gs.    IVA 5%: 0    IVA 10%: '+fmt(iva)+' Gs.',margin+10,600,area-20,{size:8.5});
    box(margin,629,area,166);
    label('VERIFICACIÓN FISCAL NO DISPONIBLE',margin+15,645,area-30,{bold:true,size:12,align:'center'});
    label('No se genera CDC, QR tributario ni enlace de verificación.',margin+15,667,area-30,{size:9,align:'center'});
    label('ESTE DOCUMENTO ES UN EJEMPLO VISUAL, NO LA REPRESENTACIÓN GRÁFICA DE UN XML FISCAL.',margin+18,704,area-36,
      {bold:true,size:8,align:'center'});
    label('No existe timbrado fiscal autorizado para esta operación, ni aprobación de la DNIT/SIFEN.',
      margin+25,728,area-50,{size:8.5,align:'center'});
    label('La contratación y el pago son de prueba; no representan un cobro bancario real.',
      margin+25,749,area-50,{size:8.5,align:'center'});
    label('Nde Rogarã · Constancia para demostración',margin+20,778,area-40,{size:7.5,align:'center'});
    pdf.end();
  });
}

export default async function receiptHandler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return errorJson(res, 405, 'Método no permitido.');
  let db;
  let recordRef;
  try {
    const firebase = getAdmin();
    const token = (req.headers.authorization || '').match(/^Bearer (.+)$/)?.[1];
    if (!token) return errorJson(res, 401, 'Iniciá sesión para recibir el comprobante.');
    let user;
    try { user = await firebase.auth().verifyIdToken(token, true); }
    catch { return errorJson(res, 401, 'Tu sesión caducó. Volvé a iniciar sesión.'); }
    if (!user.email_verified || !validEmail(user.email)) {
      return errorJson(res, 403, 'Verificá el correo de tu cuenta antes de solicitar un comprobante.');
    }
    const to = typeof req.body?.invoice?.customerEmail === 'string'
      ? req.body.invoice.customerEmail.trim().toLowerCase() : '';
    if (!validEmail(to) || to.length > 180) {
      return errorJson(res, 400, 'Ingresá un correo de facturación válido.');
    }
    const data = req.body || {};
    const invoice = data.invoice || {};
    const plan = allowedPlans.get(data.planId);
    const id = safe(invoice.paymentId, 90);
    const name = safe(invoice.customerName, 100);
    const number = safe(invoice.documentNumber, 40);
    const customerDocument = safe(invoice.customerRuc, 22);
    const documentType = invoice.customerDocumentType === 'ruc' ? 'ruc' : 'ci';
    if (!plan || !/^[\w-]{8,90}$/.test(id) || !/^[\w-]{3,40}$/.test(number) ||
      name.length < 3 || !/^\d{3,10}(-\d)?$/.test(customerDocument) ||
      !['qr','card'].includes(data.method) ||
      (invoice.customerEmail || '').trim().toLowerCase() !== to) {
      return errorJson(res, 400, 'Revisá los datos del comprobante y el correo autenticado.');
    }
    if (invoice.planName !== plan.name || Number(invoice.amount) !== plan.amount) {
      return errorJson(res, 400, 'El plan o el importe del comprobante no coincide.');
    }
    db = firebase.firestore();
    const key = createHash('sha256').update(user.uid + ':' + id).digest('hex');
    recordRef = db.collection('mail_receipt_dispatch').doc(key);
    const dateKey = new Date().toISOString().slice(0, 10);
    const quotaRef = db.collection('mail_receipt_quotas').doc(createHash('sha256').update(user.uid + ':' + dateKey).digest('hex'));
    let alreadySent = false;
    await db.runTransaction(async transaction => {
      const [record, quota] = await Promise.all([transaction.get(recordRef), transaction.get(quotaRef)]);
      const existing = record.data();
      if (existing?.status === 'accepted') { alreadySent = true; return; }
      if (existing?.status === 'processing' && Date.now() - (existing.reservedAt || 0) < 120000) {
        throw Object.assign(new Error('El correo se está procesando. Comprobá el estado en unos instantes.'), { status: 409 });
      }
      if ((existing?.attempts || 0) >= 3) throw Object.assign(new Error('Se alcanzó el límite de reintentos de esta operación.'), { status: 429 });
      const count = quota.data()?.count || 0;
      if (count >= 5) throw Object.assign(new Error('Se alcanzó el límite diario de correos para esta cuenta.'), { status: 429 });
      transaction.set(quotaRef, { uid: user.uid, dateKey, count: count + 1 }, { merge: true });
      transaction.set(recordRef, {
        uid: user.uid, to, paymentId: id, planId: data.planId, documentNumber: number,
        status: 'processing', attempts: (existing?.attempts || 0) + 1,
        reservedAt: Date.now(), updatedAt: time(),
      }, { merge: true });
    });
    if (alreadySent) return res.status(200).json({ sent: true, alreadySent: true, message: 'El correo ya había sido aceptado por SMTP.' });
    const configRef = db.collection('private_configuration').doc('mail');
    const saved = (await configRef.get()).data() || {};
    const config = { ...defaults(), ...saved };
    // El secreto SMTP puede estar en Production aunque el administrador no haya guardado el formulario todavía.
    if (process.env.SMTP_PASS && !config.passwordEncrypted) config.enabled = true;
    const pdf = await makePdf({ ...invoice, paymentId: id, customerName: name, customerDocument, customerDocumentType: documentType, method: data.method }, plan, number, to);
    const subject = 'Nde Rogarã | Comprobante de contratación ' + number;
    const textBody = 'Hola, ' + name + ':\n\nAdjuntamos tu comprobante de contratación de ' + plan.name +
      ', por Gs. ' + money(plan.amount) + '.\n\nEste documento corresponde a una operación de demostración, sin cobro bancario y sin validez tributaria.\n\nNde Rogarã';
    const result = await transport(config).sendMail({
      from: { name: config.senderName || 'Nde Rogarã', address: config.from || config.user },
      replyTo: config.replyTo || undefined,
      to, subject, text: textBody,
      attachments: [{ filename: 'Comprobante-Nde-Rogara-' + number.replace(/[^\w-]/g, '') + '.pdf',
        content: pdf, contentType: 'application/pdf' }],
    });
    if (!result.accepted?.some(a => a.toLowerCase() === to)) {
      throw Object.assign(new Error('Gmail no aceptó el destinatario.'), { code: 'NOT_ACCEPTED' });
    }
    await recordRef.set({ status: 'accepted', messageId: result.messageId || null, updatedAt: time() }, { merge: true });
    await db.collection('mail_delivery_logs').add({
      type: 'receipt', to, status: 'accepted', paymentId: id, documentNumber: number,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    }).catch(() => {});
    return res.status(200).json({ sent: true, message: 'Comprobante aceptado por el servidor SMTP.' });
  } catch (err) {
    const code = String(err?.code || 'SERVER_ERROR').slice(0, 50);
    const message = err?.status ? err.message : err?.code === 'EAUTH'
      ? 'Gmail rechazó las credenciales SMTP. Renoválas en Vercel.'
      : (err?.message?.includes('FIREBASE_SERVICE_ACCOUNT') ? err.message :
        'No se pudo enviar el comprobante. Revisá Firebase, Gmail y la configuración del servidor.');
    if (recordRef && db && !err?.status) {
      await recordRef.set({ status: 'failed', errorCode: code, errorMessage: message, updatedAt: time() }, { merge: true }).catch(() => {});
      await db.collection('mail_delivery_logs').add({
        type: 'receipt', status: 'failed', to: recordRef ? req.body?.invoice?.customerEmail || '' : '',
        errorCode: code, errorMessage: message,
        paymentId: safe(req.body?.invoice?.paymentId, 90),
        createdAt: getAdmin().firestore.FieldValue.serverTimestamp(),
      }).catch(() => {});
    }
    return errorJson(res, err.status || 503, message, code);
  }
}
