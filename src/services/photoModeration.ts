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
/** Decodificación compatible con navegadores que no soportan createImageBitmap. */
async function loadPhoto(file: File): Promise<{ image: CanvasImageSource; width:number; height:number; release:()=>void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {image:bitmap,width:bitmap.width,height:bitmap.height,release:()=>bitmap.close()};
    } catch { /* Usar el decodificador de imágenes del navegador. */ }
  }
  const url=URL.createObjectURL(file);
  try {
    const image=new Image();
    image.decoding='async';
    image.src=url;
    await new Promise<void>((resolve,reject)=>{
      image.onload=()=>resolve();
      image.onerror=()=>reject(new Error('El archivo no contiene una imagen compatible con el navegador.'));
    });
    return {image,width:image.naturalWidth,height:image.naturalHeight,release:()=>URL.revokeObjectURL(url)};
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}
async function prepareLocalPendingPhoto(file: File): Promise<ImageDecision> {
  let opened: Awaited<ReturnType<typeof loadPhoto>> | undefined;
  try {
    opened = await loadPhoto(file);
    if (!opened.width || !opened.height) throw new Error('La fotografía no contiene píxeles válidos.');
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if (!ctx) throw new Error('Tu navegador no permite procesar esta imagen.');
    const maxSize=190_000;
    let side=1050,quality=0.67,url='';
    for (let pass=0;pass<7;pass++) {
      const ratio=Math.min(1,side/Math.max(opened.width,opened.height));
      canvas.width=Math.max(1,Math.round(opened.width*ratio));
      canvas.height=Math.max(1,Math.round(opened.height*ratio));
      ctx.drawImage(opened.image,0,0,canvas.width,canvas.height);
      // La versión de muestra no conserva EXIF ni datos privados de ubicación.
      url=canvas.toDataURL('image/jpeg',quality);
      if(url.length<=maxSize)break;
      side=Math.round(side*0.8);
      quality=Math.max(0.35,quality-0.07);
    }
    if(url.length>maxSize)throw new Error('La imagen es demasiado compleja para guardarla en el navegador.');
    return {approved:true,url,pendingManualReview:true};
  } catch(error) {
    return {approved:false,reason:error instanceof Error ? error.message : 'No se pudo procesar la fotografía.'};
  } finally {
    opened?.release();
  }
}

export async function submitPhotoForModeration(file: File, onProgress?: (percent:number)=>void): Promise<ImageDecision> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!SUPPORTED.includes(file.type) && !['jpg','jpeg','png','webp'].includes(extension || ''))
    return { approved: false, reason: 'Formato no compatible. Elegí una fotografía JPG, PNG o WebP.' };
  if (file.size === 0 || file.size > MAX_SOURCE_BYTES) return { approved: false, reason: 'La fotografía debe pesar hasta 50 MB.' };

  // En modo gratuito/local la foto se guarda en el navegador inmediatamente.
  // Para activar Storage remoto es necesario VITE_MEDIA_STORAGE_MODE=firebase.
  if (import.meta.env.VITE_MEDIA_STORAGE_MODE !== 'firebase') return prepareLocalPendingPhoto(file);

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
