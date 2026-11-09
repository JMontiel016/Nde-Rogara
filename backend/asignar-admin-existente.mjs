/**
 * Crear o habilitar una ÚNICA cuenta de administración en Firebase Auth.
 * Uso manual con credenciales privadas de Firebase Admin; nunca en Vercel build.
 * No modifica usuarios de inmobiliaria ni contraseñas de cuentas existentes.
 */
import admin from 'firebase-admin';
import { randomBytes } from 'node:crypto';

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Definí ADMIN_EMAIL con una dirección real a la que tengas acceso.');
  process.exit(1);
}
if (email === '016.jmma@gmail.com') {
  console.error('La cuenta de la inmobiliaria no se convertirá en administrador.');
  process.exit(1);
}
const configuredPassword = process.env.ADMIN_INITIAL_PASSWORD || '';
if (configuredPassword && (configuredPassword.length < 14 || configuredPassword.toLowerCase() === email)) {
  console.error('ADMIN_INITIAL_PASSWORD debe tener al menos 14 caracteres y ser distinta del correo.');
  process.exit(1);
}

if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();
let record;
let created = false;
try {
  record = await auth.getUserByEmail(email);
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error;
  const password = configuredPassword || randomBytes(24).toString('base64url');
  record = await auth.createUser({
    email, password, disabled: false, emailVerified: false,
    displayName: 'Administración Nde Rogarã'
  });
  created = true;
  console.log('Cuenta administradora creada:', email);
  // Solo se imprime en la terminal privada, nunca en Git, logs de Vercel o frontend.
  if (!configuredPassword) console.log('Contraseña inicial (guardala en un gestor):', password);
}
const claims = { ...(record.customClaims || {}), admin: true };
await auth.setCustomUserClaims(record.uid, claims);
console.log(created ? 'Permiso admin asignado.' : 'Cuenta existente: permiso admin actualizado sin alterar su contraseña.');
console.log('Cerrá sesión y volvé a iniciar para renovar los permisos.');
