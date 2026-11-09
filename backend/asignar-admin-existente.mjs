/**
 * Concede rol admin a una cuenta EXISTENTE en Firebase Authentication.
 * No crea usuarios, no conoce ni altera contraseñas.
 * Se ejecuta manualmente desde un equipo administrativo con ADC.
 */
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const email = 'admin@admin.com.py';
const auth = admin.auth();
const record = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(record.uid, { ...record.customClaims, admin: true });
console.log('Permiso de administración actualizado para:', email);
console.log('Cerrá sesión y volvé a ingresar para renovar los permisos de Firebase.');
