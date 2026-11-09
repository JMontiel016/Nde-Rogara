/** Resuelve enlaces externos sin permitir protocolos peligrosos ni dominios simulados. */
export function socialProfileUrl(raw: string | undefined, platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'website') {
  const value = raw?.trim();
  if (!value) return '';
  if (platform === 'website') {
    try {
      const candidate = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      return candidate.protocol === 'https:' || candidate.protocol === 'http:' ? candidate.href : '';
    } catch { return ''; }
  }
  const host = { instagram: 'www.instagram.com', facebook: 'www.facebook.com', tiktok: 'www.tiktok.com', youtube: 'www.youtube.com' }[platform];
  const clean = value.replace(/^@/, '');
  if (/^[A-Za-z0-9._-]+$/.test(clean)) return `https://${host}/${platform === 'tiktok' || platform === 'youtube' ? '@' : ''}${clean}`;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    const allowed = platform === 'youtube' ? ['youtube.com', 'www.youtube.com', 'youtu.be'] : [host, host.replace(/^www\./, '')];
    return url.protocol === 'https:' && allowed.includes(url.hostname.toLowerCase()) ? url.href : '';
  } catch { return ''; }
}
export function propertyShareUrl(id: string) { return `${location.origin}${location.pathname}?inmueble=${encodeURIComponent(id)}`; }
export function socialShareLinks(property: { id: string; title: string; city: string }) {
  const url = propertyShareUrl(property.id);
  const message = `Mirá este inmueble en Nde Rogarã: ${property.title}, ${property.city}. ${url}`;
  return { url, whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`, facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, instagram: 'https://www.instagram.com/' };
}
