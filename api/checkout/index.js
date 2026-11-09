import { createQrCheckout } from '../_checkout.js';
export default (req,res) => req.method==='POST' ? createQrCheckout(req,res) : res.status(405).json({error:'Método no permitido.'});
