/** Preferencia visual local, independiente del inicio/cierre de sesión. */
export const THEME_KEY = 'nderogara_theme';
export type ThemeChoice = 'light' | 'dark';

export function readTheme(): ThemeChoice {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
  catch { return 'light'; }
}
export function applyTheme(next: ThemeChoice): void {
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); }
  catch { /* almacenamiento deshabilitado: aplicar solo en esta sesión */ }
  window.dispatchEvent(new CustomEvent('nderogara-theme-changed', { detail: next }));
}
