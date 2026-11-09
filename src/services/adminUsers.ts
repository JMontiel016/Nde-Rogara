import type { UserProfile } from '../types';

export interface AdminUserEvent {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  action: 'suspended' | 'reactivated' | 'deleted';
  reason: string;
  removedProperties: number;
  actor: string;
  createdAt: string;
}
const KEY = 'nderogara_admin_user_events_v1';
export const ADMIN_USERS_CHANGED = 'nderogara-admin-users-changed';
export function adminUserEvents(): AdminUserEvent[] {
  try { const value: unknown = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value as AdminUserEvent[] : []; }
  catch { return []; }
}
export function recordAdminUserAction(user: UserProfile, action: AdminUserEvent['action'], reason: string, actor: string, removedProperties: number): void {
  const event: AdminUserEvent = {
    id: crypto.randomUUID(), userId: user.id, name: user.name, email: user.email, phone: user.phone || '',
    action, reason, removedProperties, actor, createdAt: new Date().toISOString()
  };
  localStorage.setItem(KEY, JSON.stringify([event, ...adminUserEvents()].slice(0, 1000)));
  window.dispatchEvent(new Event(ADMIN_USERS_CHANGED));
}

/** Texto para revisión y envío manual: no equivale a una notificación entregada. */
export function userActionNotice(event: AdminUserEvent): string {
  const status = event.action === 'deleted' ? 'eliminada' : event.action === 'suspended' ? 'suspendida' : 'reactivada';
  return `Nde Rogarã - Notificación sobre tu cuenta\n\nTu cuenta registrada con ${event.email} fue ${status}.\nMotivo: ${event.reason}\n\nSi creés que hubo un error, comunicate con la administración para solicitar revisión. El tratamiento de eventuales reembolsos se realiza conforme a la política aceptada y las normas aplicables.\n\nEquipo Nde Rogarã`;
}
