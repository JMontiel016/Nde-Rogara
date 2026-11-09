/**
 * Contenido público personalizable para la muestra local de Nde Rogarã.
 * El panel administrativo es el único que presenta controles de edición.
 * En producción, esta configuración requiere un backend con permisos.
 */
export type SiteSection = 'identity' | 'navigation' | 'support';
export type SiteBlockKind = 'text' | 'link' | 'whatsapp' | 'phone' | 'email' | 'social' | 'image';
export type SiteBlock = { id: string; section: SiteSection; kind: SiteBlockKind; title: string; value: string };
export type SiteContent = { blocks: SiteBlock[] };
export const SITE_CONTENT_KEY = 'nderogara_public_site_content_v1';
export const SITE_CONTENT_EVENT = 'nderogara-site-content-updated';
export const defaultSiteBlocks: SiteBlock[] = [
  { id: 'brand-about', section: 'identity', kind: 'text', title: 'Nde Rogarã', value: 'Buscá alquileres en Paraguay y contactá directamente con quien publica, sin registrarte.' },
  { id: 'nav-search', section: 'navigation', kind: 'link', title: 'Buscar inmuebles', value: '#search' },
  { id: 'nav-plans', section: 'navigation', kind: 'link', title: 'Planes de publicación', value: '#plans' },
  { id: 'nav-policy', section: 'navigation', kind: 'link', title: 'Políticas de publicación y pagos', value: '#policy' },
  { id: 'legal-notice', section: 'support', kind: 'text', title: 'Aviso importante', value: 'La plataforma difunde avisos de terceros. No garantiza disponibilidad, alquileres ni validez legal de contratos. Verificá siempre los datos con el propietario.' },
];
export const SITE_SECTIONS: Record<SiteSection, string> = { identity: 'Información', navigation: 'Enlaces', support: 'Soporte y contacto' };
export const SITE_BLOCK_KINDS: Record<SiteBlockKind, string> = { text: 'Texto', link: 'Enlace', whatsapp: 'WhatsApp', phone: 'Teléfono', email: 'Correo', social: 'Red social', image: 'Imagen / logo' };
const isSection = (value: unknown): value is SiteSection => value === 'identity' || value === 'navigation' || value === 'support';
const isKind = (value: unknown): value is SiteBlockKind => Object.prototype.hasOwnProperty.call(SITE_BLOCK_KINDS, String(value));
export function readSiteContent(): SiteContent {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(SITE_CONTENT_KEY) || 'null');
    if (stored && typeof stored === 'object' && 'blocks' in stored && Array.isArray(stored.blocks)) {
      const blocks = stored.blocks.filter((item: unknown): item is SiteBlock => {
        if (!item || typeof item !== 'object') return false;
        const record = item as Partial<SiteBlock>;
        return typeof record.id === 'string' && typeof record.title === 'string' && typeof record.value === 'string' && isSection(record.section) && isKind(record.kind);
      }).slice(0, 80);
      return { blocks };
    }
  } catch { /* Si falla el almacenamiento, mantener el contenido predeterminado. */ }
  return { blocks: defaultSiteBlocks.map(block => ({ ...block })) };
}
export function saveSiteContent(content: SiteContent) {
  if (content.blocks.length > 80) throw new Error('Se admiten hasta 80 bloques.');
  if (content.blocks.some(block => block.title.trim().length > 120 || block.value.length > 1800)) throw new Error('Uno de los bloques supera el tamaño permitido.');
  localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(content));
  window.dispatchEvent(new Event(SITE_CONTENT_EVENT));
}
export function blockDestination(block: SiteBlock): string | null {
  const raw = block.value.trim();
  if (block.kind === 'link' && ['#home', '#search', '#plans', '#policy'].includes(raw)) return raw;
  if (block.kind === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return `mailto:${raw}`;
  if (block.kind === 'phone' && /^\+?[\d\s()-]{7,25}$/.test(raw)) return `tel:${raw.replace(/[^\d+]/g, '')}`;
  if (block.kind === 'whatsapp') {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return null;
    return `https://wa.me/${digits.startsWith('0') ? `595${digits.slice(1)}` : digits}`;
  }
  if (block.kind === 'image' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(raw) && raw.length < 350_000) return raw;
  if (block.kind === 'link' || block.kind === 'social' || block.kind === 'image') {
    try { const url = new URL(raw); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null; }
    catch { return null; }
  }
  return null;
}
