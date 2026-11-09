import { randomUUID, timingSafeEqual } from 'node:crypto';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Coordinación temporal del QR entre el navegador del propietario y otro dispositivo.
 * No procesa fondos ni acredita pagos de ninguna entidad bancaria.
 * Los tokens caducan y solo se guardan en memoria durante la sesión local.
 */
function qrCheckoutBridge(): Plugin {
  const requests = new Map<string, { state: 'pending' | 'confirmed'; expires: number; planName: string; amount: number }>();
  const plans: Record<string, { name: string; amount: number }> = {
    basic: { name: 'Básico mensual', amount: 50000 },
    quarterly: { name: 'Trimestral', amount: 135000 },
    premium: { name: 'Premium anual', amount: 450000 },
    professional: { name: 'Profesional anual', amount: 900000 },
  };
  const ttl = 15 * 60 * 1000;

  const attach = (server: { middlewares: { use: (path: string, fn: (req: any, res: any) => void) => void } }) => {
    server.middlewares.use('/api/checkout', async (req, res) => {
      const reply = (status: number, body: Record<string, unknown>) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(JSON.stringify(body));
      };
      const requestUrl = new URL(req.url || '/', 'http://localhost');
      const path = requestUrl.pathname;
      for (const [key, value] of requests) if (value.expires < Date.now()) requests.delete(key);

      if (req.method === 'POST' && path === '/') {
        if (requests.size >= 300) return reply(429, { error: 'Demasiadas solicitudes activas.' });
        const chosen = plans[requestUrl.searchParams.get('plan') || ''];
        if (!chosen) return reply(400, { error: 'El plan seleccionado no es válido.' });
        const token = randomUUID();
        requests.set(token, { state: 'pending', expires: Date.now() + ttl, planName: chosen.name, amount: chosen.amount });
        return reply(201, { token, expiresInSeconds: ttl / 1000 });
      }

      const match = /^\/(status|confirm)\/([0-9a-f-]{36})$/.exec(path);
      if (!match) return reply(404, { error: 'Enlace no encontrado.' });
      const checkout = requests.get(match[2]);
      if (!checkout) return reply(410, { error: 'El enlace de contratación venció. Generá uno nuevo.' });
      if (req.method === 'GET' && match[1] === 'status') return reply(200, { state: checkout.state, planName: checkout.planName, amount: checkout.amount });
      if (req.method === 'POST' && match[1] === 'confirm') {
        checkout.state = 'confirmed';
        return reply(200, { state: checkout.state, planName: checkout.planName, amount: checkout.amount });
      }
      return reply(405, { error: 'Método no permitido.' });
    });
  };

  return {
    name: 'nderogara-qr-local',
    configureServer: attach,
    configurePreviewServer: attach,
  };
}

/**
 * Autenticación de muestra, EXCLUSIVA de `npm run dev` desde localhost.
 * Las contraseñas se leen de .env.local por Node.js; jamás de variables VITE_.
 * No reemplaza un backend de autenticación/autorización de producción.
 */
function demoCredentialsLocalOnly(): Plugin {
  return {
    name: 'nderogara-local-demo-credentials',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.root, '');
      server.middlewares.use('/__nde_local_auth', async (req, res) => {
        const reply = (code: number, msg: string) => {
          res.statusCode = code;
          res.setHeader('Cache-Control', 'no-store');
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: code === 200, message: msg }));
        };
        const rawHost = (req.headers.host || '').toLowerCase();
        let host = '';
        try { host = new URL(`http://${rawHost}`).hostname; } catch { return reply(403, 'Host no válido'); }
        const origin = req.headers.origin;
        if (req.method !== 'POST') return reply(405, 'Método no permitido');
        if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return reply(403, 'Solo localhost');
        if (origin) {
          try {
            const source = new URL(origin);
            if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname) ||
                source.host !== req.headers.host) return reply(403, 'Origen no autorizado');
          } catch { return reply(403, 'Origen no válido'); }
        }
        const chunks: Buffer[] = [];
        let size = 0;
        try {
          for await (const item of req) {
            const chunk = Buffer.from(item);
            size += chunk.length;
            if (size > 1024) return reply(413, 'Solicitud demasiado grande');
            chunks.push(chunk);
          }
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { email?: string; password?: string };
          const email = String(parsed.email || '').trim().toLowerCase();
          const stored = email === 'admin@admin.com.py' ? env.DEMO_ADMIN_PASSWORD :
            email === '016.jmma@gmail.com' ? env.DEMO_OWNER_PASSWORD : undefined;
          const offered = String(parsed.password || '');
          // Comparación de longitud constante cuando ambas cadenas tienen el mismo tamaño.
          const a = Buffer.from(stored || '');
          const b = Buffer.from(offered);
          const valid = a.length >= 8 && a.length === b.length && timingSafeEqual(a, b);
          return reply(valid ? 200 : 401, valid ? 'Cuenta local autorizada' : 'Acceso no autorizado');
        } catch { return reply(400, 'Solicitud incorrecta'); }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), qrCheckoutBridge(), demoCredentialsLocalOnly()],
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
  preview: { host: '0.0.0.0', port: 4173, strictPort: true },
});
