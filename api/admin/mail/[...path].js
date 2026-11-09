import { handleMail } from '../../_mail.js';

export default function handler(req, res) {
  const path = Array.isArray(req.query.path) ? req.query.path : [req.query.path];
  const action = path.length === 1 ? String(path[0] || '') : '';
  if (!['settings', 'logs', 'verify', 'test', 'send'].includes(action)) {
    return res.status(404).json({ error: 'Ruta de correo desconocida.' });
  }
  return handleMail(req, res, action);
}
