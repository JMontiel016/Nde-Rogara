import { firebaseAuth } from './firebaseAuth';
import type { FiscalInvoice } from './invoices';

export interface ReceiptDeliveryResult { sent: boolean; alreadySent?: boolean; message?: string; }
export async function sendReceiptEmail(invoice: FiscalInvoice, planId: string, method: 'card' | 'qr'): Promise<ReceiptDeliveryResult> {
  const token = await firebaseAuth.getFreshIdToken();
  if (!token) throw new Error('Para recibir el comprobante por correo, iniciá sesión con una cuenta de Firebase.');
  let response: Response;
  try {
    response = await fetch('/api/mail/receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ invoice, planId, method }),
    });
  } catch {
    throw new Error('No se pudo conectar al servidor de correo. Revisá la conexión e intentá nuevamente.');
  }
  const data: { sent?: boolean; alreadySent?: boolean; message?: string; error?: string; code?: string } = await response.json().catch(() => ({}));
  if (!response.ok || !data.sent) throw new Error(data.error || `No se pudo enviar el comprobante (HTTP ${response.status}).`);
  return { sent: true, alreadySent: data.alreadySent, message: data.message };
}
