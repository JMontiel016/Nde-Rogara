import { getApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { firebaseAuth } from './firebaseAuth';

export const MAX_IMAGE_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 40;

const imageTypes = new Set(['image/jpeg','image/png','image/webp']);
const videoTypes = new Set(['video/mp4','video/webm','video/quicktime']);

function storageError(error: unknown): Error {
  const e = error as { code?: string; message?: string };
  if (e?.code === 'storage/unauthorized')
    return new Error('Firebase Storage rechazó la subida. Revisá las reglas de Storage para la cuenta del propietario.');
  if (e?.code === 'storage/quota-exceeded')
    return new Error('El espacio de Firebase Storage se agotó. Revisá la cuota del proyecto.');
  if (e?.code === 'storage/retry-limit-exceeded')
    return new Error('Se agotó el tiempo de subida. Comprobá tu conexión y probá otra vez.');
  return new Error(e?.message || 'No se pudo guardar el archivo en Firebase Storage.');
}

/** Lee metadatos sin subir ni reproducir el video en la página. */
export function videoDuration(file: File): Promise<number> {
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video');
    const url=URL.createObjectURL(file);
    const clean=()=>{video.removeAttribute('src');video.load();URL.revokeObjectURL(url);};
    const timer=window.setTimeout(()=>{clean();reject(new Error('No se pudo comprobar la duración del video.'))},15000);
    video.preload='metadata';
    video.onloadedmetadata=()=>{
      window.clearTimeout(timer);
      const duration=video.duration;clean();
      if(!Number.isFinite(duration)||duration<=0)reject(new Error('La duración del video no es válida.'));
      else resolve(duration);
    };
    video.onerror=()=>{window.clearTimeout(timer);clean();reject(new Error('El video no se puede leer. Probá MP4 o WebM.'));};
    video.src=url;
  });
}

export async function uploadPropertyMedia(file:File, kind:'image'|'video', onProgress?:(percent:number)=>void):Promise<string>{
  const user=firebaseAuth.getCurrentUser();
  const token=await firebaseAuth.getFreshIdToken();
  if(!user?.uid||!token)throw new Error('Iniciá sesión con una cuenta de propietario antes de subir archivos.');
  if(kind==='image'){
    if(!imageTypes.has(file.type))throw new Error('Se admiten imágenes JPG, PNG y WebP.');
    if(!file.size||file.size>MAX_IMAGE_BYTES)throw new Error('Cada imagen puede pesar hasta 50 MB.');
  }else{
    if(!videoTypes.has(file.type))throw new Error('Se admiten videos MP4, WebM o MOV.');
    if(!file.size||file.size>MAX_VIDEO_BYTES)throw new Error('Cada video puede pesar hasta 100 MB.');
    const duration=await videoDuration(file);
    if(duration>MAX_VIDEO_SECONDS)throw new Error('El video debe durar como máximo 40 segundos.');
  }
  try{
    const storage=getStorage(getApp());
    const extension=kind==='image' ? (file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg')
      :file.type==='video/webm'?'webm':file.type==='video/quicktime'?'mov':'mp4';
    const object=ref(storage,'property-media/'+user.uid+'/'+kind+'/'+crypto.randomUUID()+'.'+extension);
    const task=uploadBytesResumable(object,file,{contentType:file.type,
      customMetadata:{ownerUid:user.uid,kind,reviewStatus:'pending'}});
    await new Promise<void>((resolve,reject)=>{
      task.on('state_changed',snapshot=>onProgress?.(Math.round(100*snapshot.bytesTransferred/snapshot.totalBytes)),
        error=>reject(storageError(error)),resolve);
    });
    return await getDownloadURL(task.snapshot.ref);
  }catch(error){throw storageError(error);}
}

/** Borra solo archivos de esta cuenta; las reglas Firebase son la autoridad definitiva. */
export async function deletePropertyMedia(url:string):Promise<void>{
  if(!url.startsWith('https://firebasestorage.googleapis.com/') && !url.startsWith('gs://'))return;
  const user=firebaseAuth.getCurrentUser();
  if(!user?.uid)throw new Error('Iniciá sesión para eliminar archivos.');
  const storage=getStorage(getApp());
  const target=ref(storage,url);
  if(!target.fullPath.startsWith('property-media/'+user.uid+'/'))
    throw new Error('No tenés permiso para eliminar este archivo.');
  try{await deleteObject(target);}
  catch(error){throw storageError(error);}
}
