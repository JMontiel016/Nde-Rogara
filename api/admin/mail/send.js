import { handleMail } from '../../_mail.js';

export default function handler(req, res) {
  return handleMail(req, res, 'send');
}
