/**
 * Buzón de salida administrativo. Los borradores son locales.
 * Un mensaje solamente cambia a "enviado" después de recibir confirmación SMTP del servidor.
 */
import { firebaseAuth } from './firebaseAuth';
import type { PaymentRecord } from './billing';
import type { FiscalInvoice } from './invoices';

export type MailKind = 'plan' | 'moderation' | 'general';
export interface MailItem {
  id: string;
  reference: string;
  kind: MailKind;
  to: string;
  subject: string;
  body: string;
  createdAt: string;
  status: 'prepared' | 'sent';
  sentAt?: string;
}
export interface MailPreferences { senderName: string; replyTo: string; }
const KEY = 'nderogara_admin_mail_queue_v1';
const PREFS = 'nderogara_admin_mail_preferences_v1';
export const MAIL_CHANGED = 'nderogara-mail-updated';
const notify = () => window.dispatchEvent(new Event(MAIL_CHANGED));
const validEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export function getMailItems(): MailItem[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value as MailItem[] : []; }
  catch { return []; }
}
export function getMailPreferences(): MailPreferences {
  try { return { senderName: 'Nde Rogarã', replyTo: '', ...JSON.parse(localStorage.getItem(PREFS) || '{}') }; }
  catch { return { senderName: 'Nde Rogarã', replyTo: '' }; }
}
export function saveMailPreferences(value: MailPreferences): void {
  if (value.replyTo.trim() && !validEmail(value.replyTo)) throw new Error('El correo de respuesta no es válido.');
  localStorage.setItem(PREFS, JSON.stringify({ senderName: value.senderName.trim(), replyTo: value.replyTo.trim() }));
  notify();
}
export function addMailItem(input: Pick<MailItem, 'reference' | 'kind' | 'to' | 'subject' | 'body'>): MailItem {
  if (!validEmail(input.to)) throw new Error('Ingresá un correo electrónico válido.');
  if (!input.subject.trim() || !input.body.trim()) throw new Error('El asunto y el mensaje son obligatorios.');
  const previous = getMailItems().find(row => row.reference === input.reference && row.kind === input.kind);
  if (previous) return previous;
  const item: MailItem = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'prepared' };
  try { localStorage.setItem(KEY, JSON.stringify([item, ...getMailItems()].slice(0, 300))); notify(); }
  catch { console.warn('No se pudo guardar el aviso de correo localmente.'); }
  return item;
}
/** Se prepara al completar un pago de la muestra; NO implica que ya se haya enviado un correo. */
export function preparePlanMail(payment: PaymentRecord, invoice?: FiscalInvoice): MailItem | null {
  if (payment.status !== 'paid' || !validEmail(payment.billing.email)) return null;
  return addMailItem({
    reference: `payment:${payment.id}`, kind: 'plan', to: payment.billing.email,
    subject: `Nde Rogarã | Confirmación de contratación: ${payment.planName}`,
    body: `Hola, ${payment.billing.fullName}:\n\nRegistramos la contratación de tu plan ${payment.planName}.\nImporte: Gs. ${new Intl.NumberFormat('es-PY').format(payment.amount)}.\nReferencia: ${payment.id}.\nComprobante de muestra: ${invoice?.documentNumber || 'Pendiente de generar'}.\n\nPodés consultar e imprimir el comprobante en Nde Rogarã. No se adjunta automáticamente un PDF desde el navegador.\n\nEl pago se confirmó en la modalidad de exhibición del sistema y no representa un cobro bancario real.\n\nEquipo Nde Rogarã`,
  });
}
export function prepareModerationMail(to: string, propertyId: string, title: string, reason: string): MailItem | null {
  if (!validEmail(to)) return null;
  return addMailItem({
    reference: `moderation:${propertyId}:${reason}`, kind: 'moderation', to,
    subject: `Nde Rogarã | Aviso sobre tu publicación: ${title}`,
    body: `Tu publicación «${title}» requiere atención administrativa.\n\nMotivo: ${reason}.\n\nPodés comunicarte con nuestro equipo para solicitar una revisión.\n\nNde Rogarã`,
  });
}
export function mailtoFor(item: MailItem): string {
  return `mailto:${encodeURIComponent(item.to)}?subject=${encodeURIComponent(item.subject)}&body=${encodeURIComponent(item.body)}`;
}
/** Envío opcional real: ID token Firebase + custom claim admin en el servidor. */
export async function sendMailFromServer(item: MailItem): Promise<void> {
  if (!firebaseAuth.isConfigured()) throw new Error('Para enviar directamente necesitás Firebase y el servicio SMTP configurado.');
  const token = await firebaseAuth.getFreshIdToken();
  if (!token) throw new Error('Ingresá con una cuenta administrativa autorizada en Firebase.');
  const endpoint = import.meta.env.VITE_MAIL_API_URL || '/api/admin/mail/send';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: item.to, subject: item.subject, body: item.body }),
  });
  if (!response.ok) throw new Error(response.status === 403 ? 'La cuenta no tiene permisos de correo en el servidor.' : 'No fue posible enviar. Comprobá SMTP y el servidor.');
  const result: { sent?: boolean } = await response.json();
  if (!result.sent) throw new Error('El servidor no confirmó el envío.');
  const updated = getMailItems().map(x => x.id === item.id ? { ...x, status: 'sent' as const, sentAt: new Date().toISOString() } : x);
  localStorage.setItem(KEY, JSON.stringify(updated)); notify();
}
