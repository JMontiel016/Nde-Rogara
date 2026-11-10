import { handleMail } from '../../_mail.js';

export default function handler(req, res) {
  // Vercel no siempre rellena req.query.path en rutas catch-all. El URL real
  // es la fuente fiable para identificar la operación solicitada.
  const pathname = new URL(req.url || '/', 'https://nde-rogara.vercel.app').pathname;
  const parts = pathname.split('/').filter(Boolean);
  const raw = parts.length === 4 && parts[0] === 'api' && parts[1] === 'admin'
    && parts[2] === 'mail' ? parts[3] : '';
  if (!['settings', 'logs', 'verify', 'test', 'send'].includes(raw)) {
    return res.status(404).json({error:'Ruta de correo desconocida.'});
  }
  return handleMail(req, res, raw);
}
