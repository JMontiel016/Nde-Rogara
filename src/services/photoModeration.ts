import { firebaseAuth } from './firebaseAuth';

/** Todas las fotos del formulario necesitan revisión antes de mostrarse públicamente. */
export type ImageDecision =
  | { approved: true; url: string; pendingManualReview: boolean }
  | { approved: false; reason: string };

const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = 8_000_000;

/**
 * Respaldo exclusivo de desarrollo: reduce una foto válida para la muestra local.
 * NO detecta contenido sexual, violencia ni material prohibido; por eso el aviso
 * permanece oculto hasta una revisión administrativa real.
 */
async function prepareLocalPendingPhoto(file: File): Promise<ImageDecision> {
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file);
    if (!bitmap.width || !bitmap.height) throw new Error('La imagen no contiene píxeles válidos.');
    const canvas = document.createElement('canvas');
    const ratio = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se pudo preparar la fotografía.');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    // Al redibujar se eliminan metadatos EXIF, incluida la geolocalización privada.
    const url = canvas.toDataURL('image/jpeg', 0.66);
    if (url.length > 620_000) {
      return { approved: false, reason: 'La fotografía ocupa demasiado espacio. Reducí la resolución para publicarla.' };
    }
    return { approved: true, url, pendingManualReview: true };
  } catch {
    return { approved: false, reason: 'No se pudo procesar la fotografía. Usá una imagen JPG, PNG o WebP válida.' };
  } finally {
    bitmap?.close();
  }
}

export async function submitPhotoForModeration(file: File): Promise<ImageDecision> {
  if (!SUPPORTED.includes(file.type)) return { approved: false, reason: 'Solo se admiten fotografías JPG, PNG o WebP.' };
  if (file.size === 0 || file.size > MAX_SOURCE_BYTES) return { approved: false, reason: 'La fotografía debe pesar menos de 8 MB.' };

  const endpoint = import.meta.env.VITE_PHOTO_MODERATION_URL?.trim();
  // Una instalación sin servidor debe seguir permitiendo preparar anuncios de
  // la muestra local; estos se mantienen ocultos y no se marcan como verificados.
  if (!endpoint && import.meta.env.DEV) return prepareLocalPendingPhoto(file);
  if (!endpoint) return { approved: false, reason: 'La revisión de imágenes no está disponible. No se agregó la fotografía.' };

  const token = await firebaseAuth.getFreshIdToken();
  if (!token) return { approved: false, reason: 'Para enviar fotografías necesitás iniciar sesión con una cuenta autorizada.' };
  const body = new FormData();
  body.append('photo', file);
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body });
    const data: { approved?: boolean; url?: string; reason?: string } = await response.json();
    if (response.ok && data.approved === true && typeof data.url === 'string' && data.url.startsWith('https://')) {
      return { approved: true, url: data.url, pendingManualReview: false };
    }
    if (response.status === 422) return { approved: false, reason: 'Foto prohibida por la política de la empresa.' };
    return { approved: false, reason: data.reason || 'No se pudo verificar la fotografía.' };
  } catch {
    return { approved: false, reason: 'El servicio de revisión de imágenes no está disponible.' };
  }
}
