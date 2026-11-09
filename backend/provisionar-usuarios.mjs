/**
 * Alta/actualización privada de las dos cuentas iniciales de producción.
 * Ejecutar solo desde una máquina administrativa con Firebase Admin configurado.
 * NO se ejecuta durante npm run build ni en Vercel.
 */
import admin from 'firebase-admin';

const initialUsers = [
  { email: 'admin@admin.com.py', label: 'Administrador', isAdmin: true, password: process.env.INIT_ADMIN_PASSWORD },
  { email: '016.jmma@gmail.com', label: 'Inmobiliaria', isAdmin: false, password: process.env.INIT_OWNER_PASSWORD }
];

if (initialUsers.some(user => !user.password || user.password.length < 12)) {
  console.error('Definí INIT_ADMIN_PASSWORD e INIT_OWNER_PASSWORD (mínimo 12 caracteres) de forma privada.');
  process.exit(1);
}
if (initialUsers.some(user => user.password === user.email)) {
  console.error('No se permite usar el correo como contraseña de producción. Elegí claves distintas y seguras.');
  process.exit(1);
}
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.applicationDefault() });
const auth = admin.auth();

for (const user of initialUsers) {
  let record;
  try {
    record = await auth.getUserByEmail(user.email);
    await auth.updateUser(record.uid, { password: user.password, disabled: false, displayName: user.label });
    console.log(`Cuenta actualizada: ${user.email}`);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    record = await auth.createUser({
      email: user.email, password: user.password, displayName: user.label,
      disabled: false, emailVerified: false
    });
    console.log(`Cuenta creada: ${user.email}`);
  }
  const claims = { ...(record.customClaims || {}) };
  if (user.isAdmin) claims.admin = true;
  else delete claims.admin;
  await auth.setCustomUserClaims(record.uid, claims);
  console.log(`Permiso asignado: ${user.isAdmin ? 'administrador' : 'propietario'}`);
}
console.log('Configuración terminada. Volvé a iniciar sesión para renovar los permisos.');
