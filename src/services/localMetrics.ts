// Datos demostrativos por navegador, no métricas reales de visitas a un sitio publicado.
export interface LocalMetrics { views: number; whatsapp: number; calls: number; }
const key = (propertyId: string) => `nderogara_local_metrics_${propertyId}`;
export function getLocalMetrics(id: string): LocalMetrics {
  try { const saved = JSON.parse(localStorage.getItem(key(id)) || 'null'); return { views: saved?.views || 0, whatsapp: saved?.whatsapp || 0, calls: saved?.calls || 0 }; }
  catch { return { views: 0, whatsapp: 0, calls: 0 }; }
}
export function trackPropertyView(id: string): void {
  const sessionKey = `nderogara_viewed_${id}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, 'yes');
  const data = getLocalMetrics(id); data.views++;
  localStorage.setItem(key(id), JSON.stringify(data));
}
export function trackContactClick(id: string, method: 'whatsapp' | 'calls'): void {
  const data = getLocalMetrics(id); data[method]++;
  localStorage.setItem(key(id), JSON.stringify(data));
}
