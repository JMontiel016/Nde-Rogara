import { createHash, randomUUID } from 'node:crypto';
import { getAdmin } from '../_mail.js';

function fold(text='') {
  return String(text).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/[@4]/g,'a').replace(/[0]/g,'o').replace(/[1!]/g,'i')
    .replace(/[$5]/g,'s').replace(/[^a-z0-9]+/g,' ').trim();
}
const words=[
 /\b(?:puta|puto|mierda|pelotudo|pelotuda|boludo|boluda|idiota|imbecil|estupido|estupida|pendejo|pendeja|hijo de puta|hija de puta|malparido|malparida)\b/,
 /\b(?:matarte|te voy a matar|amenaza de muerte|te voy a golpear|violarte|violar|nazi|supremacia racial|odio racial)\b/,
 /\b(?:pornografia|porno|xxx|contenido sexual|sexo explicito|prostitucion|escort|casino|apuesta|tragamonedas|estafa|vender droga)\b/
];
export function reviewViolation(author, comment) {
  const raw = String(comment||'');
  const val = fold((author||'')+' '+raw);
  if (/(?:https?:\/\/|www\.|wa\.me|t\.me|bit\.ly|@[a-z0-9_.]{3,}|(?:\+?595|09\d{2})[\s\-]?\d{5,})/i.test(raw) ||
    /\b(?:https?|www|wa me|t me|bit ly|instagram|telegram|publicidad|promocion)\b/.test(val))
    return 'Publicidad, enlaces o información de contacto no permitida.';
  if (words.some(re=>re.test(val))) return 'Insultos, amenazas o contenido prohibido.';
  if (/(.)\1{12,}/.test(val)) return 'Contenido repetitivo no permitido.';
  return null;
}
const response=(res,status,body)=>res.status(status).json(body);
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if (!['GET','POST'].includes(req.method)) return response(res,405,{error:'Método no permitido'});
  const propertyId=typeof (req.method==='GET'?req.query?.propertyId:req.body?.propertyId)==='string'
    ? String(req.method==='GET'?req.query.propertyId:req.body.propertyId).trim():'';
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(propertyId))return response(res,400,{error:'Identificador de inmueble inválido.'});
  try{
    const firebase=getAdmin(),db=firebase.firestore();
    if(req.method==='GET'){
      const snapshot=await db.collection('property_reviews_public').where('propertyId','==',propertyId).limit(200).get();
      const reviews=snapshot.docs.map(doc=>({id:doc.id,...doc.data()}))
        .filter(row=>row.status==='published')
        .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
      return response(res,200,{reviews});
    }
    const input=req.body||{};
    const comment=String(input.comment||'').trim();
    const rating=Number(input.rating);
    const author=input.authorRegistered ? String(input.author||'').trim().slice(0,70) : 'Anónimo';
    const anonymousId=String(input.reviewerId||'').slice(0,80);
    const title=String(input.propertyTitle||'').trim().slice(0,160);
    if(comment.length<20||comment.length>1500||!Number.isInteger(rating)||rating<1||rating>5 ||
       !author||title.length<2 || !/^[a-zA-Z0-9_-]{8,80}$/.test(anonymousId))
      return response(res,400,{error:'Completá una opinión de 20 a 1500 caracteres y elegí una calificación de 1 a 5.'});
    const violation=reviewViolation(author,comment);
    // Identificador por navegador más IP aproximada para reducir spam anónimo.
    const ip=String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'').split(',')[0].trim();
    const actorKey=createHash('sha256').update(propertyId+':'+anonymousId).digest('hex');
    const limitKey=createHash('sha256').update(ip+':'+new Date().toISOString().slice(0,10)).digest('hex');
    const byActor=db.collection('review_once_per_property').doc(actorKey);
    const quota=db.collection('review_ip_quotas').doc(limitKey);
    const id=randomUUID();
    await db.runTransaction(async tx=>{
      const [existing,count]=await Promise.all([tx.get(byActor),tx.get(quota)]);
      if(existing.exists)throw Object.assign(new Error('Ya enviaste una reseña para este inmueble.'),{status:409});
      if((count.data()?.count||0)>=15)throw Object.assign(new Error('Se alcanzó el límite diario de opiniones desde esta conexión.'),{status:429});
      tx.create(byActor,{propertyId,createdAt:Date.now()});
      tx.set(quota,{count:(count.data()?.count||0)+1},{merge:true});
      tx.create(db.collection('property_reviews_public').doc(id),{
        propertyId,propertyTitle:title,author,authorRegistered:Boolean(input.authorRegistered),
        reviewerId:anonymousId,date:new Date().toISOString(),rating,comment,unit:String(input.unit||'').slice(0,100),
        isVerified:false,status:violation?'blocked':'published',moderationReason:violation||null
      });
    });
    return response(res,201,{id,status:violation?'blocked':'published',reason:violation||undefined});
  }catch(err){return response(res,err.status||503,{error:err.status?err.message:'No se pudieron guardar o consultar las reseñas. Revisá el servicio de Firebase.'});}
}
