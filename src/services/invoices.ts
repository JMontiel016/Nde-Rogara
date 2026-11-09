import { readIssuerDraft, type IssuerDraft, type PaymentRecord } from './billing';
import { firebaseAuth } from './firebaseAuth';

/** Comprobantes de demostración: no equivalen a facturas fiscales ni a documentos SIFEN. */
export type InvoiceStatus = 'approved' | 'rejected' | 'pending';
export interface FiscalInvoice {
  id: string;
  paymentId: string;
  ownerId: string;
  customerName: string;
  customerRuc?: string;
  customerDocumentType?: 'ci' | 'ruc';
  customerEmail: string;
  customerAddress?: string;
  customerPostalCode?: string;
  phone?: string;
  issueDate: string;
  amount: number;
  documentNumber: string;
  status: InvoiceStatus;
  planName: string;
  method: string;
  reason?: string;
}

const STORAGE = 'nderogara_local_invoices_v2';
export const INVOICES_CHANGED = 'nderogara-invoices-updated';

export function getLocalInvoices(): FiscalInvoice[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE) || '[]');
    return Array.isArray(parsed) ? parsed as FiscalInvoice[] : [];
  } catch { return []; }
}
export async function fetchFiscalInvoices(): Promise<FiscalInvoice[]> {
  const token = await firebaseAuth.getFreshIdToken();
  if (!token) return getLocalInvoices();
  const response = await fetch('/api/admin/invoices', {headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if (response.status===403) return getLocalInvoices(); // Propietario: solo sus propios registros locales.
  const data:{invoices?:FiscalInvoice[];error?:string}=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'No se pudo consultar la numeración global.');
  const local=getLocalInvoices();
  const remote=data.invoices||[];
  const known=new Set(remote.map(inv=>inv.paymentId));
  return [...remote,...local.filter(inv=>!known.has(inv.paymentId))].sort((a,b)=>b.issueDate.localeCompare(a.issueDate));
}

/** Recupera desde Firebase los comprobantes del usuario, incluso en otro teléfono. */
export async function fetchMyFiscalInvoices(ownerId:string):Promise<FiscalInvoice[]> {
  const local=getLocalInvoices().filter(inv=>inv.ownerId===ownerId);
  const token=await firebaseAuth.getFreshIdToken();
  if(!token)return local;
  const response=await fetch('/api/admin/invoices?scope=mine',{
    headers:{Authorization:'Bearer '+token},cache:'no-store'});
  const data:{invoices?:FiscalInvoice[];error?:string}=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'No se pudieron consultar tus comprobantes.');
  const remote=data.invoices||[];
  const ids=new Set(remote.map(inv=>inv.paymentId));
  // Guardar una copia silenciosa para que «Ver comprobante» encuentre también
  // los PDF de contrataciones efectuadas en otro teléfono, sin bucle de eventos.
  try {
    const known=getLocalInvoices();
    const cached=new Set(known.map(inv=>inv.paymentId));
    const fresh=remote.filter(inv=>!cached.has(inv.paymentId));
    if(fresh.length)localStorage.setItem(STORAGE,JSON.stringify([...fresh,...known]));
  }catch{/* La copia es opcional: Firestore mantiene los registros. */}
  return [...remote,...local.filter(inv=>!ids.has(inv.paymentId))]
    .sort((a,b)=>String(b.issueDate||'').localeCompare(String(a.issueDate||'')));
}

/** Almacena el comprobante asignado por Firestore. No inventa un correlativo local. */
export function saveConfirmedInvoice(invoice: FiscalInvoice): FiscalInvoice {
  if (!/^001-001-\d{7}$/.test(invoice.documentNumber) ||
    !invoice.paymentId || !invoice.id || !invoice.ownerId) {
    throw new Error('El servidor no devolvió un comprobante válido.');
  }
  const existing = getLocalInvoices();
  const updated = [invoice, ...existing.filter(row => row.paymentId !== invoice.paymentId)];
  localStorage.setItem(STORAGE, JSON.stringify(updated));
  window.dispatchEvent(new Event(INVOICES_CHANGED));
  return invoice;
}

/** Una sola constancia por operación. El número es LOCAL y NO es numeración tributaria. */
export function createDemoInvoice(payment: PaymentRecord): FiscalInvoice {
  if (payment.status !== 'paid') throw new Error('Confirmá primero la contratación de demostración.');
  const existing = getLocalInvoices().find(item => item.paymentId === payment.id);
  if (existing) return existing;

  const previous = getLocalInvoices();
  // Se conserva la serie visual 001-001 pero no se utiliza una numeración fiscal real.
  const maxUsed = previous.reduce((max, item) => {
    const match = /^001-001-(\d{7})$/.exec(item.documentNumber || '');
    return Math.max(max, match ? Number(match[1]) : 0);
  }, 0);
  const serial = Math.max(previous.length + 1, maxUsed + 1);
  const billing = payment.billing;
  const invoice: FiscalInvoice = {
    id: `invoice-${payment.id}`,
    paymentId: payment.id,
    ownerId: payment.ownerId,
    customerName: billing.invoiceRequested ? billing.taxName.trim() : billing.fullName.trim(),
    customerDocumentType: billing.documentType || (billing.invoiceRequested ? 'ruc' : 'ci'),
    customerRuc: billing.invoiceRequested ? (billing.documentType === 'ruc' ? [billing.ruc.trim(), (billing.rucDv || '').trim()].filter(Boolean).join('-') : (billing.ci || '').trim()) : 'X',
    customerEmail: billing.email.trim(),
    customerAddress: billing.address.trim() || 'No informada',
    customerPostalCode: billing.postalCode?.trim(),
    phone: billing.phone.trim(),
    issueDate: new Date().toISOString(),
    amount: payment.amount,
    documentNumber: `001-001-${String(serial).padStart(7, '0')}`,
    status: 'approved', // Significa registrada en la simulación, NO aprobación SIFEN.
    planName: payment.planName,
    method: payment.method === 'qr' ? 'Código QR' : 'Tarjeta',
  };
  localStorage.setItem(STORAGE, JSON.stringify([invoice, ...previous]));
  window.dispatchEvent(new Event(INVOICES_CHANGED));
  return invoice;
}

const escapeHtml = (value: string | number) => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!));
const gs = (value: number) => new Intl.NumberFormat('es-PY').format(value);

/** Construye el mismo documento para el propietario y para el área administrativa. */
export function buildDemoInvoiceHtml(invoice: FiscalInvoice, issuer: IssuerDraft = readIssuerDraft()): string {
  const e = escapeHtml;
  const total = Math.max(0, Math.round(invoice.amount));
  const tax10 = Math.round(total / 11);
  const taxable10 = total - tax10;
  const date = new Date(invoice.issueDate).toLocaleString('es-PY', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Asuncion' });
  const issuerName = issuer.legalName || 'Nde Rogarã · Servicios de publicación de inmuebles';
  const issuerRuc = issuer.ruc || '87654321-0';
  const issuerTimbrado = issuer.timbrado || '12345678';
  const issuerBranch = issuer.establishment || '001-001';
  const issuerAddress = issuer.address || 'Paraguay';
  // Logo almacenado por el propio administrador; no incrusta contenido remoto ni scripts.
  const logo = issuer.logoDataUrl && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(issuer.logoDataUrl)
    ? `<img src="${e(issuer.logoDataUrl)}" class="issuer-logo" alt="Marca del emisor">`
    : `<div class="brand-icon">⌂</div>`;

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comprobante ${e(invoice.documentNumber)} · Nde Rogarã</title><style>
  @page{size:A4;margin:10mm 11mm}*{box-sizing:border-box}body{margin:0;background:#e8eef4;font-family:Arial,Helvetica,sans-serif;color:#19273a;font-size:11px}.sheet{position:relative;width:min(100%,850px);margin:22px auto;padding:23px;background:#fff;border:1px solid #d5dfe9;box-shadow:0 12px 35px #172c4c20}.banner{display:flex;justify-content:center;align-items:center;min-height:34px;margin-bottom:13px;border:1.5px solid #c89d27;border-radius:6px;background:#fff8de;color:#7f5716;text-align:center;font-size:11px;font-weight:800;letter-spacing:.6px}.top{display:grid;grid-template-columns:1.5fr 1fr;gap:10px}.frame{border:1.5px solid #203b59;border-radius:8px;padding:14px}.sender{display:flex;gap:12px;align-items:center}.issuer-logo{max-width:96px;max-height:62px;object-fit:contain}.brand-icon{display:flex;width:64px;height:56px;flex-shrink:0;align-items:center;justify-content:center;background:#e8f5ff;border-radius:12px;color:#0470b9;font-size:40px;font-weight:900}.brand-name{font-size:22px;font-weight:900;color:#075c9b;letter-spacing:-.7px}.issuer-name{font-size:12px;font-weight:700;line-height:1.4}.muted{color:#586b7f}.field{line-height:1.7;margin-top:5px}.headlabel{font-size:10px;letter-spacing:.8px;color:#075c9b;font-weight:800}.fiscal{text-align:center;line-height:1.8}.fiscal .number{font-size:19px;font-weight:900;letter-spacing:.4px;margin:5px 0;color:#18314a}.fiscal .sub{font-size:9px;color:#586b7f}.data{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:9px}.data h3{font-size:10px;margin:0 0 7px;color:#075c9b;text-transform:uppercase;letter-spacing:.7px}.data .box{padding:11px 13px;border:1px solid #ccd6e2;border-radius:8px;line-height:1.9;min-height:114px}.table-wrap{border:1px solid #203b59;border-radius:7px;overflow:hidden;margin-top:11px}table{border-collapse:collapse;width:100%;font-size:10px}thead{background:#173a5c;color:#fff}th{padding:8px 5px;text-align:left;font-size:9px}td{padding:13px 5px;border-top:1px solid #d8e1ea;vertical-align:top}th:not(:last-child),td:not(:last-child){border-right:1px solid #e1e7ed}th:last-child,td:last-child{text-align:right}.totals{display:grid;grid-template-columns:1fr 290px;gap:15px;margin-top:10px}.tax-panel{border:1px solid #d0dbe6;border-radius:7px;padding:11px;line-height:1.9}.tax-panel h3{font-size:10px;margin:0 0 5px}.summary{border:1.5px solid #203b59;border-radius:7px;overflow:hidden}.summary>div{display:flex;justify-content:space-between;padding:9px 12px;border-bottom:1px solid #dce4ec}.summary>div:last-child{border:0;background:#e9f4fc;font-size:16px;font-weight:900}.fiscal-verification{display:flex;gap:15px;align-items:center;border:1.5px solid #203b59;border-radius:8px;margin-top:13px;padding:15px;min-height:100px}.fiscal-qr{display:flex;align-items:center;justify-content:center;width:94px;height:76px;flex-shrink:0;border:1px dashed #64748b;font-size:10px;font-weight:800;text-align:center;line-height:1.5}.fiscal-text{line-height:1.8;text-align:center;flex:1;font-size:10px}.notice{border:1px solid #d2dce7;border-radius:8px;padding:11px 12px;margin-top:15px;line-height:1.65;color:#43566c;font-size:9px}.notice strong{color:#7f5716}.bottom{display:flex;justify-content:space-between;margin-top:18px;font-size:9px;color:#587083}.print{display:block;margin:18px auto 0;border:0;border-radius:9px;background:#036ca9;padding:12px 24px;font-size:12px;font-weight:bold;color:white;cursor:pointer}@media print{body{background:#fff}.sheet{width:100%;margin:0;padding:0;border:0;box-shadow:none}.print{display:none}.banner{print-color-adjust:exact;-webkit-print-color-adjust:exact}thead{print-color-adjust:exact;-webkit-print-color-adjust:exact}}@media(max-width:600px){.sheet{padding:14px;margin:0}.top,.data,.totals{grid-template-columns:1fr}.summary{max-width:none}.sender{align-items:flex-start}.brand-name{font-size:19px}}
  </style></head><body><main class="sheet"><div class="banner">FACTURA ELECTRÓNICA DE MUESTRA · SIN VALIDEZ TRIBUTARIA</div><header class="top"><section class="frame sender">${logo}<div><div class="brand-name">${e(issuer.logoText || 'Nde Rogarã')}</div><div class="issuer-name">${e(issuerName)}</div><div class="field muted">${e(issuerAddress)}<br>${issuer.phone ? `Teléfono: ${e(issuer.phone)}<br>` : ''}Correo del emisor: 016.jmma@gmail.com</div></div></section><section class="frame fiscal"><div class="headlabel">FACTURA ELECTRÓNICA · MODELO FICTICIO</div><div>Timbrado ficticio: <b>${e(issuerTimbrado)}</b></div><div>RUC ficticio: ${e(issuerRuc)}<br>Inicio de vigencia: No aplica<br>Establecimiento: ${e(issuerBranch)}</div><div class="number">${e(invoice.documentNumber)}</div><div class="sub">Numeración visual ficticia, sin autorización tributaria</div></section></header>
  <div class="data"><section class="box"><h3>Datos del receptor</h3><b>Nombre / Razón social:</b> ${e(invoice.customerName)}<br><b>${e(invoice.customerDocumentType === 'ci' ? 'CI (no contribuyente)' : invoice.customerDocumentType === 'ruc' ? 'RUC (contribuyente)' : 'RUC / CI')}:</b> ${e(invoice.customerRuc || 'X')}${invoice.customerAddress && invoice.customerAddress !== 'No informada' ? `<br><b>Dirección:</b> ${e(invoice.customerAddress)}` : ''}${invoice.customerPostalCode ? `<br><b>Código postal:</b> ${e(invoice.customerPostalCode)}` : ''}<br><b>Correo:</b> ${e(invoice.customerEmail)}${invoice.phone ? `<br><b>Teléfono:</b> ${e(invoice.phone)}` : ''}</section><section class="box"><h3>Datos de la operación</h3><b>Fecha de registro:</b> ${e(date)}<br><b>Condición de venta:</b> Contado (demostración)<br><b>Método:</b> ${e(invoice.method)}<br><b>Moneda:</b> Guaraníes (PYG)<br><b>Referencia:</b> ${e(invoice.paymentId)}<br><b>Tipo de operación:</b> Prestación de servicios<br><b>Estado:</b> Registrado localmente</section></div>
  <section class="table-wrap"><table><thead><tr><th>Código</th><th>Descripción</th><th>Unidad</th><th>Cant.</th><th>P. unitario</th><th>Descuento</th><th>Exentas</th><th>IVA 5 %</th><th>IVA 10 %</th></tr></thead><tbody><tr><td>01</td><td>Suscripción al plan de publicación de inmuebles: <b>${e(invoice.planName)}</b></td><td>UNI</td><td>1</td><td>Gs. ${gs(total)}</td><td>Gs. 0</td><td>Gs. 0</td><td>Gs. 0</td><td><b>Gs. ${gs(total)}</b></td></tr></tbody></table></section>
  <div class="totals"><section class="tax-panel"><h3>LIQUIDACIÓN IVA · REFERENCIAL</h3><div>Base ilustrativa gravada 10 %: <b>Gs. ${gs(taxable10)}</b></div><div>IVA ilustrativo 10 %: <b>Gs. ${gs(tax10)}</b></div><div>IVA 5 %: <b>Gs. 0</b></div><div class="muted">Los valores tributarios no acreditan liquidación ni emisión fiscal.</div></section><section class="summary"><div><span>Subtotal</span><b>Gs. ${gs(total)}</b></div><div><span>Descuento</span><b>Gs. 0</b></div><div><span>Total en guaraníes</span><b>Gs. ${gs(total)}</b></div></section></div>
  <div class="fiscal-verification"><div class="fiscal-qr">QR FISCAL<br>NO DISPONIBLE</div><div class="fiscal-text"><strong>VERIFICACIÓN TRIBUTARIA NO DISPONIBLE</strong><br>No se generó CDC, XML firmado ni código QR SIFEN. Este comprobante no puede validarse en e-Kuatia.</div></div><div class="notice"><strong>DOCUMENTO DE MUESTRA. NO ES UNA FACTURA ELECTRÓNICA REAL NI UN KUDE.</strong> No posee CDC, XML fiscal firmado, QR de verificación tributaria ni aprobación ante SIFEN. El RUC, timbrado, establecimiento y número mostrados son ficticios. La contratación registrada corresponde a una simulación sin cargo bancario real. El envío automático de correos solo se habilitará tras configurar y autorizar el servicio de correo en el servidor.</div><div class="bottom"><span>Nde Rogarã · Plataforma de publicación de inmuebles</span><span>Identificador local: ${e(invoice.id)}</span></div><button type="button" class="print" onclick="window.print()">Imprimir / Guardar como PDF</button></main></body></html>`;
}

/** Abre la constancia imprimible; el cliente puede guardarla como PDF desde su navegador. */
export function viewFiscalInvoice(id: string): Promise<void> {
  const invoice = getLocalInvoices().find(item => item.id === id);
  if (!invoice) return Promise.reject(new Error('No se encontró el comprobante solicitado.'));
  const tab = window.open('', '_blank', 'width=980,height=1000');
  if (!tab) return Promise.reject(new Error('Permití las ventanas emergentes para abrir el comprobante.'));
  tab.document.open();
  tab.document.write(buildDemoInvoiceHtml(invoice));
  tab.document.close();
  return Promise.resolve();
}
