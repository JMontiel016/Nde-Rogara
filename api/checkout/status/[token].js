import { statusQrCheckout } from '../../_checkout.js';
export default (req,res) => req.method==='GET' ? statusQrCheckout(req,res,String(req.query.token||'')) : res.status(405).json({error:'Método no permitido.'});
