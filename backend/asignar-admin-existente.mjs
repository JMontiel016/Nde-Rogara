/**
 * Cambia la administración principal a la cuenta REAL de Google.
 *
 * Ejecutar una única vez desde un entorno privado con Firebase Admin SDK.
 * No cambia contraseñas, métodos de acceso ni crea cuentas ficticias.
 * Nunca ejecutar este script en el navegador o durante el build de Vercel.
 */
import admin from 'firebase-admin';

const principal = '016.jmma@gmail.com';
const anterior = 'admin@admin.com.py';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}
const auth = admin.auth();

// Verificar primero que el usuario principal exista.
const user = await auth.getUserByEmail(principal);
if (user.disabled) throw new Error('La cuenta principal está deshabilitada en Firebase. Revisala antes de continuar.');

// Mantener claims ajenos al rol y habilitar solamente el privilegio administrativo.
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
console.log('Administrador principal habilitado:', principal);

// El correo antiguo no debe conservar el rol admin, si aún existe.
try {
  const oldUser = await auth.getUserByEmail(anterior);
  if (oldUser.uid !== user.uid && oldUser.customClaims?.admin === true) {
    const claims = { ...(oldUser.customClaims || {}) };
    delete claims.admin;
    await auth.setCustomUserClaims(oldUser.uid, claims);
    await auth.revokeRefreshTokens(oldUser.uid);
    console.log('Permiso anterior revocado:', anterior);
  }
} catch (err) {
  if (err?.code !== 'auth/user-not-found') throw err;
  console.log('El usuario administrador anterior ya no existe.');
}
await auth.revokeRefreshTokens(user.uid);
console.log('Listo. Cerrá sesión y volvé a ingresar con Google para actualizar los permisos.');
