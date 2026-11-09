import { firebaseAuth } from './firebaseAuth';
import type { Property } from '../types';

/** Catálogo compartido: Firestore es la autoridad, localStorage solo la copia del navegador. */
export async function fetchCloudProperties(scope: 'public'|'mine'|'admin'):Promise<Property[]> {
  const token=scope==='public'?null:await firebaseAuth.getFreshIdToken();
  if(scope!=='public'&&!token)throw new Error('Iniciá sesión en Firebase para consultar anuncios privados.');
  const response=await fetch('/api/properties?scope='+scope,{cache:'no-store',
    headers:token?{Authorization:'Bearer '+token}:{}});
  const data:{properties?:Property[];error?:string}=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'No se pudo consultar el catálogo compartido.');
  return Array.isArray(data.properties)?data.properties:[];
}

export async function saveCloudProperty(property:Property):Promise<Property>{
  const token=await firebaseAuth.getFreshIdToken();
  if(!token)throw new Error('La sesión de Firebase venció. Iniciá sesión nuevamente.');
  const response=await fetch('/api/properties',{method:'POST',headers:{
    Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action:'save',property})});
  const data:{property?:Property;error?:string}=await response.json().catch(()=>({}));
  if(!response.ok||!data.property)throw new Error(data.error||'No se pudo guardar la publicación en Firebase.');
  return data.property;
}

export async function moderateCloudProperty(id:string,status:'approved'|'removed',reason:string):Promise<void>{
  const token=await firebaseAuth.getFreshIdToken();
  if(!token)throw new Error('La sesión del administrador venció.');
  const response=await fetch('/api/properties',{method:'POST',headers:{
    Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify({action:'moderate',id,status,reason})});
  const data:{error?:string}=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'No se pudo guardar la revisión en el servidor.');
}
