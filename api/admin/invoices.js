import { getAdmin } from '../_mail.js';

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET')return res.status(405).json({error:'Método no permitido.'});
  try {
    const firebase=getAdmin();
    const token=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
    if(!token)return res.status(401).json({error:'Iniciá sesión como administrador.'});
    let user;
    try{user=await firebase.auth().verifyIdToken(token,true);}
    catch{return res.status(401).json({error:'Tu sesión de Firebase ya no es válida.'});}
    const scope=req.query?.scope==='mine'?'mine':'admin';
    if(scope==='admin' && user.admin!==true)return res.status(403).json({error:'Solo el administrador puede ver los comprobantes de todos los usuarios.'});
    const query=await firebase.firestore().collection('demo_invoices')
      .orderBy('createdAt','desc').limit(200).get();
    return res.status(200).json({
      invoices:query.docs.filter(doc=>scope==='admin'||doc.data().ownerUid===user.uid)
        .map(doc=>{const {ownerUid,...data}=doc.data();return data;}),
    });
  }catch(err) {
    return res.status(err.status||503).json({error:err.status?err.message:'No se pudo cargar el historial global de facturas en Firebase.'});
  }
}
