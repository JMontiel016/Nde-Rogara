import { firebaseAuth } from './firebaseAuth';
import type { FiscalInvoice } from './invoices';
import { PUBLICATION_PLANS } from '../data/publicationPlans';

export interface ReceiptMailLog {
  id: string;
  paymentId?: string;
  documentNumber?: string;
  to?: string;
  cc?: string[];
  type: string;
  status: 'accepted' | 'failed';
  errorCode?: string;
  errorMessage?: string;
  createdAt?: string | null;
}
async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await firebaseAuth.getFreshIdToken();
  if (!token) throw new Error('Iniciá sesión con la cuenta administradora de Firebase.');
  let response: Response;
  try {
    response = await fetch(path, {
      ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
      cache: 'no-store',
    });
  } catch { throw new Error('No se pudo conectar con el servidor de correo.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Error HTTP ${response.status} al consultar SMTP.`);
  return data as T;
}
/** Lee registros globales del servidor (no los borradores locales del navegador). */
export async function getReceiptMailLogs(): Promise<ReceiptMailLog[]> {
  const logs = await adminRequest<ReceiptMailLog[]>('/api/admin/mail/logs');
  return Array.isArray(logs) ? logs.filter(x => x.type === 'receipt' || x.type === 'receipt_manual') : [];
}
/** Reenvío manual reservado para administradores y comprobantes locales. */
export async function resendReceiptFromAdmin(invoice: FiscalInvoice, cc: string[]): Promise<void> {
  const planId = PUBLICATION_PLANS.find(p => p.name === invoice.planName)?.id;
  if (!planId) throw new Error('No se pudo identificar el plan de esta contratación.');
  const method = invoice.method === 'Código QR' ? 'qr' : 'card';
  const normalized = cc.map(x => x.trim().toLowerCase()).filter(Boolean);
  if (normalized.length > 3 || normalized.some(x => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x)))
    throw new Error('Ingresá hasta tres correos válidos, separados por coma.');
  await adminRequest<{sent:boolean}>('/api/admin/mail/receipt', {
    method: 'POST', body: JSON.stringify({ invoice, planId, method, cc: normalized }),
  });
}
