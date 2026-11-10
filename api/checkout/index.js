import { createQrCheckout, cardCheckout, statusQrCheckout, confirmQrCheckout } from '../_checkout.js';

// Una sola función estable para el flujo de contratación. Los proveedores
// serverless pueden fallar al desplegar subrutas dinámicas de dos segmentos.
export default function handler(req,res) {
  const query = new URL(req.url || '/api/checkout','https://nde-rogara.vercel.app').searchParams;
  const action = String(query.get('operation') || '');
  const token = String(query.get('token') || '');
  if(action==='card' && req.method==='POST')return cardCheckout(req,res);
  if(action==='status' && req.method==='GET')return statusQrCheckout(req,res,token);
  if(action==='confirm' && req.method==='POST')return confirmQrCheckout(req,res,token);
  if(!action && req.method==='POST')return createQrCheckout(req,res);
  return res.status(405).json({error:'Operación no admitida.'});
}
