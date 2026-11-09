import { getAdmin } from '../_mail.js';
import { reviewViolation } from '../reviews/index.js';
const json=(res,status,body)=>res.status(status).json(body);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Método no permitido'});
 try{
  const firebase=getAdmin();
  const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
  if(!token)return json(res,401,{error:'Iniciá sesión.'});
  let actor;
  try{actor=await firebase.auth().verifyIdToken(token,true);}catch{return json(res,401,{error:'Sesión de administrador no válida.'});}
  if(actor.admin!==true)return json(res,403,{error:'No tenés permisos de administración.'});
  const db=firebase.firestore();
  if(req.method==='GET'){
    const snapshot=await db.collection('property_reviews_public').where('status','==','blocked').limit(150).get();
    const reviews=snapshot.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
    return json(res,200,{reviews});
  }
  const {id,action}=req.body||{};
  if(typeof id!=='string'|| !/^[a-f0-9-]{36}$/i.test(id)||!['publish','hide'].includes(action))
    return json(res,400,{error:'Revisión inválida.'});
  const ref=db.collection('property_reviews_public').doc(id);
  const snap=await ref.get();
  if(!snap.exists)return json(res,404,{error:'La reseña no existe.'});
  const review=snap.data();
  if(review.status!=='blocked')return json(res,409,{error:'Solo se pueden resolver los casos bloqueados.'});
  if(action==='publish' && reviewViolation(review.author,review.comment))
    return json(res,422,{error:'Esta reseña contiene un motivo de bloqueo y no puede publicarse sin corregir el contenido.'});
  await ref.update({status:action==='publish'?'published':'hidden',reviewedBy:actor.uid,reviewedAt:new Date().toISOString()});
  return json(res,200,{ok:true});
 }catch(err){return json(res,err.status||503,{error:err.status?err.message:'No se pudo consultar o moderar el contenido en Firebase.'});}
}