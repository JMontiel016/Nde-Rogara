/**
 * Envío automático del comprobante de contratación de demostración.
 * No acepta destinatarios arbitrarios: solo correo autenticado/verificado en Firebase.
 * Cada operación tiene un identificador único, límite diario y registro persistente.
 * El contenido suministrado por el navegador NO acredita cobro bancario ni emisión SIFEN.
 */
import { createHash } from 'node:crypto';
import PDFDocument from 'pdfkit';
import { getAdmin, defaults, transport } from './_mail.js';

const allowedPlans = new Map([
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

function makePdf(invoice, plan, docNumber, to) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 44, info: {
      Title: 'Comprobante de contratación Nde Rogarã',
      Author: 'Nde Rogarã', Subject: 'Documento de demostración sin validez tributaria',
    }});
    const parts = [];
    doc.on('data', chunk => parts.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(parts)));
    doc.on('error', reject);
    const c = '#15334d';
    doc.font('Helvetica-Bold').fontSize(22).fillColor(c).text('Nde Rogarã');
    doc.moveDown(0.2).font('Helvetica').fontSize(10).fillColor('#6b7280').text('Plataforma de publicación de inmuebles');
    doc.moveDown(1).rect(44, doc.y, 507, 38).fill('#fff2d5');
    doc.fillColor('#8b5510').font('Helvetica-Bold').fontSize(12)
      .text('COMPROBANTE DE DEMOSTRACIÓN - SIN VALIDEZ FISCAL', 54, doc.y + 11, { width: 486, align: 'center' });
    doc.y += 48;
    doc.fontSize(11).fillColor(c).font('Helvetica-Bold').text('Datos de la contratación');
    doc.moveDown(0.6).font('Helvetica').fillColor('#182f42').fontSize(11);
    const lines = [
      ['Nº de comprobante', docNumber],
      ['Fecha', new Date().toLocaleString('es-PY')],
      ['Plan contratado (prueba)', plan.name],
      ['Importe referencial', 'Gs. ' + money(plan.amount)],
      ['Nombre / razón social', invoice.customerName],
      ['Documento del receptor', (invoice.customerDocumentType === 'ruc' ? 'RUC' : 'CI') + ': ' + invoice.customerDocument],
      ['Correo del destinatario', to],
      ['Método de prueba', invoice.method === 'qr' ? 'Código QR' : 'Tarjeta'],
      ['Referencia', invoice.paymentId],
    ];
    for (const [label, value] of lines) {
      doc.font('Helvetica-Bold').text(label + ': ', { continued: true }).font('Helvetica').text(String(value));
      doc.moveDown(0.5);
    }
    doc.moveDown(1).font('Helvetica-Bold').fontSize(12).fillColor('#8b5510')
      .text('DOCUMENTO INFORMATIVO - SIN VALIDEZ TRIBUTARIA');
    doc.moveDown(0.5).font('Helvetica').fontSize(9).fillColor('#4b5563')
      .text('Este comprobante registra una contratación de demostración del sistema. No se procesó un cargo bancario real. No es una factura electrónica, KuDE ni acredita aprobación de la DNIT o SIFEN. No posee CDC, XML firmado ni timbrado fiscal autorizado.', { lineGap: 4 });
    doc.end();
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
    const to = user.email?.toLowerCase();
    if (!user.email_verified || !validEmail(to)) {
      return errorJson(res, 403, 'Verificá el correo de tu cuenta antes de solicitar un comprobante.');
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
      (invoice.customerEmail || '').toLowerCase() !== to) {
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
