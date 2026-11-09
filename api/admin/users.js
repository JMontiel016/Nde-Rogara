import { getAdmin } from '../_mail.js';

/** Directorio real de cuentas de Firebase Auth, no del almacenamiento de un navegador. */
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Método no permitido.'});
  try {
    const firebase=getAdmin();
    const auth=(req.headers.authorization||'').match(/^Bearer (.+)$/)?.[1];
    if (!auth) return res.status(401).json({error:'Debés iniciar sesión como administrador.'});
    let user;
    try {user=await firebase.auth().verifyIdToken(auth,true);}
    catch {return res.status(401).json({error:'La sesión del administrador ya no es válida.'});}
    if (user.admin !== true) return res.status(403).json({error:'Solo el administrador puede consultar los usuarios.'});
    const items=[];
    let pageToken;
    // Limitar la lectura para evitar sobrecargas. La respuesta no incluye datos secretos.
    do {
      const page=await firebase.auth().listUsers(500,pageToken);
      for (const item of page.users) {
        items.push({
          uid:item.uid,
          name:item.displayName || (item.email||'').split('@')[0] || 'Usuario',
          email:item.email||'',
          emailVerified:item.emailVerified,
          disabled:item.disabled,
          provider:item.providerData.map(p=>p.providerId).join(', ') || 'password',
          role:item.customClaims?.admin===true?'admin':'landlord',
          createdAt:item.metadata.creationTime||null,
          lastSignInAt:item.metadata.lastSignInTime||null
        });
      }
      pageToken=page.pageToken;
    } while(pageToken && items.length<2000);
    items.sort((a,b)=>(b.lastSignInAt||b.createdAt||'').localeCompare(a.lastSignInAt||a.createdAt||''));
    return res.status(200).json({users:items,partial:Boolean(pageToken)});
  } catch(error) {
    return res.status(503).json({error:'No se pudo consultar Firebase Authentication desde Vercel. Revisá la clave del servidor.'});
  }
}
