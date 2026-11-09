import { confirmQrCheckout } from '../../_checkout.js';
export default (req,res) => req.method==='POST' ? confirmQrCheckout(req,res,String(req.query.token||'')) : res.status(405).json({error:'Método no permitido.'});
