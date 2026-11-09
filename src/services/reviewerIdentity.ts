/**
 * Identificación del visitante para la demostración local.
 * Identifica este navegador, no a una persona: puede borrarse junto con los datos locales.
 * Los usuarios registrados utilizan el ID de su cuenta; los demás mantienen anonimato público.
 */
const VISITOR_ID_KEY = 'nderogara_visitor_id_v1';

export function getVisitorId(): string {
  try {
    const stored = localStorage.getItem(VISITOR_ID_KEY);
    if (stored && /^visitor-[0-9a-f-]{36}$/.test(stored)) return stored;
    const id = `visitor-${crypto.randomUUID()}`;
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    // En modo privado/bloqueo de almacenamiento se mantiene una identidad efímera.
    return ephemeralId;
  }
}
const ephemeralId = `visitor-${crypto.randomUUID()}`;
