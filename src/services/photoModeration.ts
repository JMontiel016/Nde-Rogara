import { uploadPropertyMedia, MAX_IMAGE_BYTES } from './propertyMedia';

/** Todas las fotos del formulario necesitan revisión antes de mostrarse públicamente. */
export type ImageDecision =
  | { approved: true; url: string; pendingManualReview: boolean }
  | { approved: false; reason: string };

const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SOURCE_BYTES = MAX_IMAGE_BYTES;

/**
 * Respaldo gratuito de demostración: reduce una foto válida para la muestra local.
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

export async function submitPhotoForModeration(file: File, onProgress?: (percent:number)=>void): Promise<ImageDecision> {
  if (!SUPPORTED.includes(file.type)) return { approved: false, reason: 'Solo se admiten fotografías JPG, PNG o WebP.' };
  if (file.size === 0 || file.size > MAX_SOURCE_BYTES) return { approved: false, reason: 'La fotografía debe pesar hasta 50 MB.' };

  // Intentar la subida en la nube y, si Storage no está habilitado,
  // permitir una fotografía reducida para mostrarla solo en este navegador.
  // Ninguna ruta implica aprobación automática de contenido visual.
  try {
    const url = await uploadPropertyMedia(file, 'image', onProgress);
    return { approved: true, url, pendingManualReview: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'No se pudo subir la fotografía.';
    if (/Firebase Storage|storage\/|bucket|almacenamiento|permission|unauthorized|quota|not found|404|402|403|CORS|fetch|network/i.test(reason)) {
      const local = await prepareLocalPendingPhoto(file);
      return local;
    }
    return { approved: false, reason };
  }
}
