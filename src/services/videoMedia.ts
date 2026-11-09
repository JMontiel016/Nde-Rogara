/** Clips locales guardados en IndexedDB para la demostración. No se suben a un servidor. */
const DB='nderogara-video-demo-v1';
const STORE='videos';
const PREFIX='ndvideo:';
export const MAX_DEMO_VIDEO_BYTES=50*1024*1024;
const openDB=()=>new Promise<IDBDatabase>((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||new Error('No se pudo acceder al almacenamiento de videos.'));
});
export async function storeLocalVideo(file:File):Promise<string>{
  if(!['video/mp4','video/webm'].includes(file.type))throw new Error('Subí un video MP4 o WebM.');
  if(!file.size||file.size>MAX_DEMO_VIDEO_BYTES)throw new Error('Cada video puede ocupar como máximo 50 MB.');
  const db=await openDB();const id=crypto.randomUUID();
  try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(file,id);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error||new Error('No se pudo guardar el video local.'));
  });}finally{db.close();}
  return PREFIX+id;
}
export function isStoredLocalVideo(value:string){return value.startsWith(PREFIX);}
export async function resolveLocalVideo(value:string):Promise<string>{
  if(!isStoredLocalVideo(value))return value;
  const db=await openDB();
  try{return await new Promise<string>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly');const req=tx.objectStore(STORE).get(value.slice(PREFIX.length));
    req.onsuccess=()=>req.result instanceof Blob?resolve(URL.createObjectURL(req.result)):reject(new Error('Video no encontrado en este navegador.'));
    req.onerror=()=>reject(req.error||new Error('No se pudo abrir el video.'));
  });}finally{db.close();}
}
export async function removeLocalVideo(value:string):Promise<void>{
  if(!isStoredLocalVideo(value))return;
  const db=await openDB();try{await new Promise<void>((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(value.slice(PREFIX.length));
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });}finally{db.close();}
}
