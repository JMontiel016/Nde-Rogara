import { createHash } from 'node:crypto';
import { getAdmin } from './_mail.js';

const json=(res,code,data)=>res.status(code).json(data);
const fail=(status,message)=>Object.assign(new Error(message),{status});
const validId=id=>typeof id==='string'&&/^[a-z0-9_-]{1,110}$/i.test(id);
const validEmail=e=>typeof e==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const dataUrl=s=>typeof s==='string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(s) && s.length<=210000;
const imgUrl=s=>typeof s==='string'&&(dataUrl(s)||(/^https:\/\//.test(s)&&s.length<2200));
const mediaKey=s=>createHash('sha256').update(s).digest('hex');
const sanitize=(prop)=>JSON.parse(JSON.stringify(prop||{}));
const banned=/\b(?:puta|puto|pelotudo|pelotuda|mierda|pornografia|prostitucion|casino|apuestas|te voy a matar|nazi)\b/i;
async function authUser(firebase,req,required=false) {
  const raw=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
  if(!raw){if(required)throw fail(401,'Iniciá sesión con Firebase.');return null;}
  try{return await firebase.auth().verifyIdToken(raw,true);}
  catch{throw fail(401,'Tu sesión de Firebase ya no es válida.');}
}
async function inflateMedia(db,row) {
  const media=await db.collection('real_estate_properties').doc(row.id).collection('images').orderBy('position').limit(25).get();
  return {...row,images:media.docs.map(d=>d.data().url).filter(imgUrl),videos:row.videos||[]};
}
async function getListings(db,scope,user) {
  const snapshot=await db.collection('real_estate_properties').limit(200).get();
  const rows=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(row=>{
    if(scope==='admin')return user?.admin===true;
    if(scope==='mine')return user && (row.ownerId===user.uid||row.ownerEmail?.toLowerCase()===user.email?.toLowerCase());
    return row.moderationStatus==='approved' && row.isActive===true;
  });
  return Promise.all(rows.map(row=>inflateMedia(db,row)));
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(!['GET','POST'].includes(req.method))return json(res,405,{error:'Método no permitido.'});
  try {
    const firebase=getAdmin(),db=firebase.firestore();
    if(req.method==='GET'){
      const scope=['admin','mine'].includes(req.query?.scope)?req.query.scope:'public';
      const user=await authUser(firebase,req,scope!=='public');
      if(scope==='admin' && user.admin!==true)throw fail(403,'Se requiere el permiso administrador.');
      return json(res,200,{properties:await getListings(db,scope,user)});
    }
    const user=await authUser(firebase,req,true);
    const body=req.body||{},id=body.property?.id||body.id;
    if(!validId(id))throw fail(400,'Identificador inválido.');
    const ref=db.collection('real_estate_properties').doc(id);
    if(body.action==='moderate'){
      if(user.admin!==true)throw fail(403,'Solo administración puede moderar.');
      const reason=String(body.reason||'').trim().slice(0,500);
      if(reason.length<12||!['approved','removed'].includes(body.status))
        throw fail(400,'Elegí una decisión y motivo claros.');
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref);if(!snap.exists)throw fail(404,'La publicación no existe en el servidor.');
        const old=snap.data();
        if(body.status==='approved'&&old.mediaUnavailable===true)
          throw fail(409,'No se puede aprobar: el video aún está guardado únicamente en otro navegador y no puede ser inspeccionado.');
        tx.update(ref,{moderationStatus:body.status,moderationReason:reason,
          moderationRequestedAt:null,moderatedAt:new Date().toISOString(),isVerified:body.status==='approved',
          isActive:body.status==='approved',verifiedAt:body.status==='approved'?new Date().toISOString():null});
      });
      return json(res,200,{ok:true});
    }
    if(body.action!=='save')throw fail(400,'Acción inválida.');
    const p=sanitize(body.property);
    const images=Array.isArray(p.images)?p.images:[];
    const videos=Array.isArray(p.videos)?p.videos:[];
    if(images.length>25||images.some(i=>!imgUrl(i)))throw fail(400,'Las fotografías deben ser JPG optimizados o enlaces HTTPS seguros; máximo 25.');
    if(videos.length>4)throw fail(400,'Máximo cuatro videos.');
    if(!p.title||String(p.title).length>160||!p.city||!p.address||!p.description||!validEmail(user.email))
      throw fail(400,'Completá los datos de la publicación.');
    const existing=await ref.get();
    if(existing.exists && existing.data().ownerId!==user.uid && user.admin!==true)
      throw fail(403,'Esta publicación pertenece a otra cuenta.');
    if(!existing.exists && p.ownerId!==user.uid && user.admin!==true)
      throw fail(403,'No se puede publicar con una cuenta diferente.');
    const old=existing.data()||{};
    const oldImages=(await ref.collection('images').orderBy('position').get()).docs.map(d=>d.data().url);
    const hasAdded=images.some(url=>!oldImages.includes(url));
    const hasLocalVideo=videos.some(url=>typeof url==='string'&&!url.startsWith('https://'));
    const unsafeText=banned.test([p.title,p.description,p.address].join(' '));
    const pending=unsafeText||hasLocalVideo||hasAdded||!existing.exists||old.moderationStatus==='flagged';
    const now=new Date().toISOString();
    // Explicit owner keys, moderation keys, and review state are server-controlled.
    const record={...p,id,ownerId:existing.exists?old.ownerId:user.uid,
      ownerEmail:existing.exists?old.ownerEmail:user.email.toLowerCase(),
      createdAt:old.createdAt||now,images:[],
      videos:videos.filter(x=>typeof x==='string'&&/^https:\/\//.test(x)),
      mediaUnavailable:hasLocalVideo,
      moderationStatus:pending?'flagged':'approved',
      moderationReason:unsafeText?'Contenido textual prohibido':
        hasLocalVideo?'Video pendiente de alojamiento compartido y revisión':
        pending?'Fotografías o contenido pendiente de revisión':old.moderationReason||'Revisión aprobada',
      moderationRequestedAt:pending?(old.moderationStatus==='flagged'?old.moderationRequestedAt||now:now):null,
      isActive:pending?false:old.isActive===true,
      isVerified:pending?false:old.isVerified===true,
      verifiedAt:pending?null:old.verifiedAt||null,
      moderatedAt:pending?null:old.moderatedAt||null,
      updatedAt:now};
    const batch=db.batch();batch.set(ref,record);
    const snap=await ref.collection('images').get();
    for(const doc of snap.docs)batch.delete(doc.ref);
    for(let index=0;index<images.length;index++){
      const url=images[index];
      batch.set(ref.collection('images').doc(mediaKey(url)),{url,position:index,updatedAt:now});
    }
    await batch.commit();
    return json(res,200,{property:{...record,images,videos},serverSaved:true});
  }catch(err) {
    return json(res,err.status||503,{error:err.status?err.message:'No se pudo sincronizar la publicación con Firebase. Revisá el servicio de datos.'});
  }
}
