import type { Property } from '../types';
import { prepareModerationMail } from './mailQueue';

export interface ModerationEvent {
  id: string;
  propertyId: string;
  propertyTitle: string;
  ownerId?: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  action: 'flagged' | 'approved' | 'removed';
  reason: string;
  createdAt: string;
  actor: string;
}
const KEY = 'nderogara_moderation_events_v1';
export const MODERATION_CHANGED = 'nderogara-moderation-changed';
export function moderationEvents(): ModerationEvent[] {
  try { const found: unknown = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(found) ? found as ModerationEvent[] : []; }
  catch { return []; }
}
export function recordModeration(property: Property, action: ModerationEvent['action'], reason: string, actor: string) {
  const row: ModerationEvent = {
    id: crypto.randomUUID(), propertyId: property.id, propertyTitle: property.title,
    ownerId: property.ownerId, ownerName: property.ownerName, ownerEmail: property.ownerEmail,
    ownerPhone: property.ownerPhone, action, reason, actor, createdAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(KEY, JSON.stringify([row, ...moderationEvents()].slice(0, 1000)));
  } catch {
    // Si el navegador agotó su espacio, un registro secundario no debe
    // cerrar el formulario. La revisión sigue pendiente en el anuncio.
    console.warn('No se pudo almacenar el historial local de moderación.');
  }
  // Una retirada prepara un aviso para el Centro de correo; NO lo envía por sí sola.
  if (action === 'removed') prepareModerationMail(row.ownerEmail, row.propertyId, row.propertyTitle, reason);
  window.dispatchEvent(new Event(MODERATION_CHANGED));
  return row;
}
// Detección orientativa: es un aviso para que el administrador revise, no una sanción automática.
const PROHIBITED = [
  /\b(?:casino|apuestas?|tragamonedas|pornograf[ií]a|servicios? sexuales|armas? de fuego|municiones|drogas?|criptomonedas?|prestamos? inmediatos)\b/i,
  /\b(?:vapes?|cigarrillos?|venta de alcohol|piramidal|multinivel)\b/i,
];
const OFF_TOPIC = /\b(?:vendo|venta de|compro|ofrezco)\s+(?:celulares?|motos?|veh[ií]culos?|autos?|electrodom[eé]sticos?|cursos?|seguros?|criptomonedas?)\b/i;
export function evaluateListing(property: Property): string | null {
  const content = [property.title, property.description].join(' ').normalize('NFKC');
  if (PROHIBITED.some(regex => regex.test(content))) return 'Contenido prohibido o ajeno a los anuncios inmobiliarios';
  if (/\b(?:puta|puto|mierda|pelotudo|pelotuda|boludo|boluda|idiota|imb[eé]cil|est[uú]pido|pendejo|hijo de puta|amenaza|te voy a matar)\b/i.test(content)) return 'Insultos o amenazas en el texto del anuncio';
  if (OFF_TOPIC.test(content)) return 'Publicidad de productos o servicios ajenos al alquiler inmobiliario';
  if (/\b(?:casino|apuestas|promoci[oó]n pagada|publicidad no solicitada|gana dinero f[aá]cil)\b/i.test(content)) return 'Publicidad o contenido comercial no permitido';
  if (/https?:\/\//i.test(content) && /(?:wa\.me|bit\.ly|t\.me)/i.test(content)) return 'Enlaces promocionales externos: verificar la finalidad del aviso';
  return null;
}
export function emailNotificationLink(ownerEmail: string, title: string, text: string) {
  return `mailto:${encodeURIComponent(ownerEmail)}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(text)}`;
}
export function whatsAppNotificationLink(ownerPhone: string, text: string) {
  const digits = ownerPhone.replace(/\D/g, '');
  const intl = digits.startsWith('0') ? `595${digits.slice(1)}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}
export function moderationNotice(propertyTitle: string, reason: string): string {
  return `Nde Rogarã - Notificación de moderación\n\nTu anuncio «${propertyTitle}» fue retirado por incumplir las políticas de publicación.\nMotivo: ${reason}\n\nUn retiro por infracción no implica devolución automática del importe del plan. Todo pedido de reembolso se evaluará conforme a la legislación paraguaya aplicable y las condiciones aceptadas. Si considerás que hubo un error, podés solicitar una revisión a la administración.\n\nEquipo Nde Rogarã`;
}
