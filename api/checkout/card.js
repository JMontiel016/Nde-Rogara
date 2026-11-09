import { cardCheckout } from '../_checkout.js';
export default (req,res) => req.method==='POST' ? cardCheckout(req,res) : res.status(405).json({error:'Método no permitido.'});
