import { cardCheckout, statusQrCheckout, confirmQrCheckout } from '../_checkout.js';

export default function handler(req, res) {
  const route = Array.isArray(req.query.path)
    ? req.query.path : [String(req.query.path || '')];
  if (route.length === 1 && route[0] === 'card')
    return req.method === 'POST' ? cardCheckout(req, res) : res.status(405).json({error:'Método no permitido.'});
  if (route.length === 2 && route[0] === 'status')
    return req.method === 'GET' ? statusQrCheckout(req, res, route[1]) : res.status(405).json({error:'Método no permitido.'});
  if (route.length === 2 && route[0] === 'confirm')
    return req.method === 'POST' ? confirmQrCheckout(req, res, route[1]) : res.status(405).json({error:'Método no permitido.'});
  return res.status(404).json({error:'Ruta de contratación desconocida.'});
}
