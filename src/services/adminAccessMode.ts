/** Control UNIFICADO del administrador de pruebas. Nunca concede roles en Firebase. */
export const LOCAL_DEV_ADMIN_EMAIL = 'admin@admin.com.py';
export const LOCAL_DEV_OWNER_EMAIL = '016.jmma@gmail.com';

export function canUseLocalDevAdmin(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(host);
}

/** Mensaje legible cuando se abre el proyecto con una URL o compilación incorrecta. */
export function localAdminEnvironmentHint(): string {
  if (!import.meta.env.DEV) {
    return 'El administrador de prueba no funciona en una compilación de producción o con npm run preview. Abrí el proyecto actualizado y ejecutá npm run dev.';
  }
  return 'El administrador de prueba solo funciona desde http://localhost:5173 o http://127.0.0.1:5173 (usá el puerto que muestre Vite), no desde otra IP o dominio.';
}
