/** Datos locales de preparación de pagos, NO libros contables ni facturación fiscal. */
export type PaymentMethod = 'card' | 'qr';
export type PaymentStatus = 'draft' | 'pending' | 'paid' | 'failed';
export interface BillingProfile {
  fullName: string;
  email: string;
  phone: string;
  invoiceRequested: boolean;
  /** Tipo de documento del receptor, para comprobantes de demostración. */
  documentType?: 'ci' | 'ruc';
  taxName: string;
  ci?: string;
  ruc: string;
  rucDv?: string;
  address: string;
  /** Código postal opcional en el perfil; obligatorio solo al usar tarjeta en este checkout. */
  postalCode?: string;
  autoRenew: boolean;
}
export interface PaymentRecord {
  id: string;
  ownerId: string;
  ownerEmail: string;
  planId: string;
  planName: string;
  amount: number;
  method: PaymentMethod;
  createdAt: string;
  status: PaymentStatus;
  billing: BillingProfile;
  providerReference?: string;
  cardLast4?: string;
  // El servidor, NO este archivo, será quien genere registros pagados tras verificar webhook de la entidad.
}
export interface IssuerDraft {
  logoText: string;
  logoDataUrl?: string;
  legalName: string;
  ruc: string;
  address: string;
  phone: string;
  timbrado: string;
  establishment: string;
}
const PROFILE = (id: string) => `nderogara_billing_profile_v1_${id}`;
const PAYMENTS = 'nderogara_payment_requests_v1';
const ISSUER = 'nderogara_issuer_draft_v1';
export const BILLING_CHANGED = 'nderogara-billing-updated';
const notify = () => window.dispatchEvent(new Event(BILLING_CHANGED));
const defaultProfile: BillingProfile = { fullName: '', email: '', phone: '', invoiceRequested: true, documentType: 'ci', taxName: '', ci: '', ruc: '', rucDv: '', address: '', autoRenew: false };
export function loadBillingProfile(ownerId?: string): BillingProfile {
  if (!ownerId) return {...defaultProfile};
  try {
    const raw = JSON.parse(localStorage.getItem(PROFILE(ownerId)) || '{}') as Partial<BillingProfile>;
    const result: BillingProfile = {...defaultProfile, ...raw};
    // Migración de perfiles anteriores que almacenaban RUC y DV juntos.
    if (!raw.documentType && raw.invoiceRequested) result.documentType = 'ruc';
    if (/^\d{3,9}-\d$/.test(result.ruc) && !result.rucDv) {
      const [ruc, dv] = result.ruc.split('-');
      result.ruc = ruc;
      result.rucDv = dv;
    }
    return result;
  }
  catch { return {...defaultProfile}; }
}
export function saveBillingProfile(ownerId: string, profile: BillingProfile) {
  localStorage.setItem(PROFILE(ownerId), JSON.stringify(profile)); notify();
}
export function validateBilling(profile: BillingProfile): string | null {
  if (profile.fullName.trim().length < 4) return 'Ingresá nombre y apellido de la persona responsable del pago.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) return 'Ingresá un correo electrónico válido para recibir los comprobantes.';
  if (!/^\+?[0-9 ()-]{8,}$/.test(profile.phone.trim())) return 'Ingresá un celular válido para el contacto de contratación.';
  // Para esta etapa solo se admite identificación por CI o RUC.
  if (profile.invoiceRequested) {
    if (profile.taxName.trim().length < 3) return 'Ingresá el nombre o razón social que figurará en el comprobante.';
    if ((profile.documentType || 'ci') === 'ruc') {
      if (!/^\d{3,9}$/.test(profile.ruc.trim())) return 'Ingresá el número de RUC sin el dígito verificador.';
      if (!/^\d$/.test((profile.rucDv || '').trim())) return 'Ingresá el dígito verificador del RUC (un número).';
    } else if (!/^\d{3,10}$/.test((profile.ci || '').trim())) {
      return 'Ingresá un número de cédula de identidad válido.';
    }
    // La dirección no es obligatoria para este comprobante de muestra.
  }
  return null;
}
export function getPayments(): PaymentRecord[] {
  try { const values = JSON.parse(localStorage.getItem(PAYMENTS) || '[]'); return Array.isArray(values) ? values : []; }
  catch { return []; }
}
// Solo almacena borradores y solicitudes iniciadas. No hay transición local a 'paid'.
export function savePaymentRequest(record: PaymentRecord) {
  if (record.status !== 'draft' && record.status !== 'pending') throw new Error('El estado de cobro requiere confirmación de servidor.');
  const updated = [record, ...getPayments().filter(x => x.id !== record.id)];
  localStorage.setItem(PAYMENTS, JSON.stringify(updated)); notify();
}
export function newPaymentRequest(input: Omit<PaymentRecord, 'id' | 'createdAt' | 'status'>, status: 'draft'|'pending'): PaymentRecord {
  return { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status };
}
export const DEFAULT_ISSUER: IssuerDraft = {
  logoText: 'Nde Rogarã',
  legalName: 'Nde Rogarã · Servicios de publicación de inmuebles',
  ruc: '87654321-0', // Ficticio, exclusivamente para el modelo de demostración.
  address: 'Paraguay',
  phone: '',
  timbrado: '12345678', // Ficticio: no existe validez ante DNIT/SIFEN.
  establishment: '001-001',
};
export function readIssuerDraft(): IssuerDraft {
  try { return { ...DEFAULT_ISSUER, ...JSON.parse(localStorage.getItem(ISSUER) || '{}')}; }
  catch { return {...DEFAULT_ISSUER}; }
}
export function saveIssuerDraft(value: IssuerDraft) { localStorage.setItem(ISSUER, JSON.stringify(value)); notify(); }
export function clearBillingForOwner(id: string) { localStorage.removeItem(PROFILE(id)); localStorage.removeItem(CARD_KEY(id)); localStorage.setItem(PAYMENTS, JSON.stringify(getPayments().filter(r => r.ownerId !== id))); notify(); }
const html = (s: string|number) => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[c]!));
const money = (n: number) => new Intl.NumberFormat('es-PY').format(n);
/** Abre una vista de impresión que el usuario puede guardar como PDF. NO ES factura ni KuDE. */
export function printProforma(record: PaymentRecord): boolean {
  const issuer = readIssuerDraft();
  const newWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!newWindow) return false;
  const buyer = record.billing;
  const doc = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/><title>Proforma ${html(record.id.slice(0,8))}</title><style>
  @page{size:A4;margin:17mm}*{box-sizing:border-box}body{font:13px Arial,sans-serif;color:#17243b;margin:0}.sheet{max-width:850px;margin:auto;position:relative}.watermark{position:fixed;top:46%;left:8%;transform:rotate(-30deg);font-size:34px;color:#e5e7eb;font-weight:800;z-index:-1}.row{display:flex;justify-content:space-between;gap:20px}.head{padding-bottom:15px;border-bottom:3px solid #0e7490}.brand{font-size:27px;font-weight:900;color:#0e7490}.pill{padding:7px 10px;border:1px solid #f59e0b;background:#fffbeb;font-weight:800}.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:22px 0}.panel{border:1px solid #d8dfe8;border-radius:8px;padding:14px}small{color:#64748b}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:13px;border-bottom:1px solid #d9e2e9;text-align:left}th{background:#eff6fa}.total{text-align:right;font-size:21px;font-weight:900;margin:20px 0}.notice{padding:12px;border:1px solid #f59e0b;background:#fffbeb;margin:24px 0}.muted{color:#64748b;line-height:1.6}button{padding:11px 19px;background:#0e7490;color:white;border:0;border-radius:9px;font-weight:bold;cursor:pointer}@media print{button{display:none}}
  </style></head><body><div class="sheet"><div class="watermark">SIN VALIDEZ FISCAL</div><div class="row head"><div>${issuer.logoDataUrl?.startsWith('data:image/') ? `<img src="${html(issuer.logoDataUrl)}" alt="Logo del emisor" style="max-height:60px;max-width:160px;object-fit:contain;display:block;margin-bottom:10px">` : ''}<div class="brand">${html(issuer.logoText || 'Nde Rogarã')}</div><b>${html(issuer.legalName || 'Emisor por configurar')}</b><p>${html(issuer.address || 'Dirección pendiente')}<br>${html(issuer.phone || '')}</p></div><div style="text-align:right"><h2>PROFORMA / SOLICITUD DE PAGO</h2><span class="pill">NO ES FACTURA ELECTRÓNICA</span><p>RUC emisor: ${html(issuer.ruc || 'No configurado')}<br>Timbrado (referencia): ${html(issuer.timbrado || 'Sin cargar')}<br>Establecimiento: ${html(issuer.establishment || 'Sin cargar')}</p></div></div>
  <div class="grid"><section class="panel"><small>Datos del cliente</small><p><b>${html(buyer.invoiceRequested ? buyer.taxName : buyer.fullName)}</b><br>${html(buyer.documentType === 'ruc' ? 'RUC' : 'CI')}: ${html(buyer.documentType === 'ruc' ? [buyer.ruc,buyer.rucDv].filter(Boolean).join('-') : buyer.ci || 'No informado')}<br>${html(buyer.address)}<br>${html(buyer.email)}<br>${html(buyer.phone)}</p></section><section class="panel"><small>Información de la solicitud</small><p>Referencia: ${html(record.id.slice(0,8).toUpperCase())}<br>Fecha: ${html(new Date(record.createdAt).toLocaleString('es-PY'))}<br>Estado: ${html(record.status === 'draft' ? 'Borrador' : 'Inicio de pago pendiente de confirmar')}<br>Método: ${html(record.method === 'card' ? 'Tarjeta (pasarela)' : 'QR (pasarela)')}</p></section></div>
  <table><thead><tr><th>Descripción</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody><tr><td>Publicación ${html(record.planName)}</td><td>1</td><td>Gs. ${money(record.amount)}</td><td>Gs. ${money(record.amount)}</td></tr></tbody></table><div class="total">TOTAL: Gs. ${money(record.amount)}</div><div class="notice"><b>Documento informativo, sin valor tributario.</b><br>La factura electrónica válida será emitida por un proveedor autorizado, con timbrado, numeración, CDC, XML firmado y aprobación SIFEN cuando corresponda. No existe constancia de pago confirmado en esta proforma.</div><p class="muted">Este documento se generó para que el cliente verifique los datos antes del pago. No debe entregarse como factura ni como KuDE.</p><button onclick="window.print()">Imprimir / Guardar como PDF</button></div></body></html>`;
  newWindow.document.write(doc); newWindow.document.close(); return true;
}

/** Pago LOCAL de exhibición: no realiza cobros ni autoriza operaciones bancarias. */
export function completeDemoPayment(record:PaymentRecord):PaymentRecord {
  if (record.status!=='pending') throw new Error('El intento de pago debe estar pendiente.');
  const paid:PaymentRecord={...record,status:'paid'};
  const updated=[paid,...getPayments().filter(item=>item.id!==paid.id)];
  localStorage.setItem(PAYMENTS,JSON.stringify(updated));
  notify();
  return paid;
}
export interface DemoSavedCard { brand:string; last4:string; savedAt:string; }
const CARD_KEY=(id:string)=>`nderogara_card_reference_v1_${id}`;
export function readDemoSavedCard(ownerId?:string):DemoSavedCard|null {
  if(!ownerId)return null;
  try {const result=JSON.parse(localStorage.getItem(CARD_KEY(ownerId))||'null');return result?.last4 ? result as DemoSavedCard : null;}catch{return null;}
}
/** Guarda exclusivamente marca y últimos cuatro dígitos, nunca número completo, vencimiento ni CVV. */
export function saveDemoCardReference(ownerId:string,last4:string,brand='Visa') {
  localStorage.setItem(CARD_KEY(ownerId),JSON.stringify({brand,last4,savedAt:new Date().toISOString()} satisfies DemoSavedCard));notify();
}
/** 
 * Valida solo la apariencia de una tarjeta ficticia.
 * No verifica cuentas bancarias, no transmite PAN y no realiza cobros.
 * Acepta secuencias de prueba variadas en vez de dos números fijos.
 */
export function validateDemoCard(number:string,expiration:string,cvv:string):string|null {
  const digits=number.replace(/\D/g,'');
  const amex=/^3[47]/.test(digits);
  const mastercard=/^5[1-5]/.test(digits)||/^(222[1-9]|22[3-9]\d|2[3-6]\d{2}|27[01]\d|2720)/.test(digits);
  const visa=/^4/.test(digits);
  const expected=amex ? [15] : mastercard ? [16] : visa ? [13,16,19] : [13,14,15,16,17,18,19];
  if(!expected.includes(digits.length))return amex
    ? 'American Express utiliza 15 dígitos.'
    : mastercard ? 'Mastercard utiliza 16 dígitos.'
    : 'Ingresá un número de entre 13 y 19 dígitos, según la marca de tarjeta.';
  const match=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiration);
  if(!match)return 'Ingresá el vencimiento en formato MM/AA (mes válido).';
  const end=new Date(2000+Number(match[2]),Number(match[1]),0,23,59,59);
  if(end.getTime()<Date.now())return 'La fecha de vencimiento debe ser posterior al mes actual.';
  if(amex ? !/^\d{4}$/.test(cvv) : !/^\d{3}$/.test(cvv)) return amex
    ? 'American Express requiere 4 dígitos de seguridad.'
    : 'El código de seguridad debe tener 3 dígitos.';
  return null;
}

/**
 * Validación de formato exclusivamente en memoria, sin procesar fondos ni
 * transmitir PAN, vencimiento o CVV. No reemplaza a una pasarela tokenizada.
 */
export function validateCardFormat(number:string, expiration:string, cvv:string):string|null {
  const digits=number.replace(/\s/g,'');
  if(!/^\d{13,19}$/.test(digits))return 'Completá el número de tarjeta.';
  let sum=0, alternate=false;
  for(let i=digits.length-1;i>=0;i--){
    let digit=Number(digits[i]);
    if(alternate){digit*=2;if(digit>9)digit-=9;}
    sum+=digit;alternate=!alternate;
  }
  if(sum%10!==0)return 'Revisá el número de tarjeta ingresado.';
  const match=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiration);
  if(!match)return 'Ingresá el vencimiento en formato MM/AA.';
  const end=new Date(2000+Number(match[2]),Number(match[1]),0,23,59,59);
  if(end.getTime()<Date.now())return 'La tarjeta se encuentra vencida.';
  if(!/^\d{3,4}$/.test(cvv))return 'Ingresá el código de seguridad de la tarjeta.';
  return null;
}
:'^\\d{3}


/**
 * Validación de formato exclusivamente en memoria, sin procesar fondos ni
 * transmitir PAN, vencimiento o CVV. No reemplaza a una pasarela tokenizada.
 */
export function validateCardFormat(number:string, expiration:string, cvv:string):string|null {
  const digits=number.replace(/\s/g,'');
  if(!/^\d{13,19}$/.test(digits))return 'Completá el número de tarjeta.';
  let sum=0, alternate=false;
  for(let i=digits.length-1;i>=0;i--){
    let digit=Number(digits[i]);
    if(alternate){digit*=2;if(digit>9)digit-=9;}
    sum+=digit;alternate=!alternate;
  }
  if(sum%10!==0)return 'Revisá el número de tarjeta ingresado.';
  const match=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiration);
  if(!match)return 'Ingresá el vencimiento en formato MM/AA.';
  const end=new Date(2000+Number(match[2]),Number(match[1]),0,23,59,59);
  if(end.getTime()<Date.now())return 'La tarjeta se encuentra vencida.';
  if(!/^\d{3,4}$/.test(cvv))return 'Ingresá el código de seguridad de la tarjeta.';
  return null;
}
).test(cvv))return amex
    ? 'American Express requiere 4 dígitos de seguridad.'
    : 'El código de seguridad debe tener 3 dígitos.';
  return null;
}


/**
 * Validación de formato exclusivamente en memoria, sin procesar fondos ni
 * transmitir PAN, vencimiento o CVV. No reemplaza a una pasarela tokenizada.
 */
export function validateCardFormat(number:string, expiration:string, cvv:string):string|null {
  const digits=number.replace(/\s/g,'');
  if(!/^\d{13,19}$/.test(digits))return 'Completá el número de tarjeta.';
  let sum=0, alternate=false;
  for(let i=digits.length-1;i>=0;i--){
    let digit=Number(digits[i]);
    if(alternate){digit*=2;if(digit>9)digit-=9;}
    sum+=digit;alternate=!alternate;
  }
  if(sum%10!==0)return 'Revisá el número de tarjeta ingresado.';
  const match=/^(0[1-9]|1[0-2])\/(\d{2})$/.exec(expiration);
  if(!match)return 'Ingresá el vencimiento en formato MM/AA.';
  const end=new Date(2000+Number(match[2]),Number(match[1]),0,23,59,59);
  if(end.getTime()<Date.now())return 'La tarjeta se encuentra vencida.';
  if(!/^\d{3,4}$/.test(cvv))return 'Ingresá el código de seguridad de la tarjeta.';
  return null;
}
