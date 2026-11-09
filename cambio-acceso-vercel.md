# cambio — Acceso de usuarios en Vercel (Firebase Authentication)

## Qué se modificó
- `src/services/firebaseAuth.ts`: el rol administrador se obtiene únicamente de una *custom claim* firmada por Firebase, nunca del correo ni del almacenamiento local.
- `src/components/auth/AuthModal.tsx`: el mismo formulario funciona en producción y redirige a administración cuando Firebase confirma `admin: true`. Los demás usuarios inician sesión como propietarios. Si falta Firebase en producción no simula cuentas locales.
- `src/context/AppContext.tsx`: los perfiles guardados en el navegador no pueden sobrescribir el rol comprobado en Firebase.
- `backend/provisionar-usuarios.mjs`: herramienta privada para crear/actualizar dos cuentas fijas, otorgando `admin: true` exclusivamente a `admin@admin.com.py` y rol propietario a `016.jmma@gmail.com`. No publica ni incluye contraseñas.

## Pasos únicos para activarlo en Vercel
1. En Firebase Console, habilitar **Authentication → Sign-in method → Email/Password**.
2. Agregar el dominio real de Vercel en **Authentication → Settings → Authorized domains**.
3. En Vercel → Project → Settings → Environment Variables configurar para Production (y Preview si corresponde):
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET` (si corresponde).
   Todos esos datos son la configuración pública de la aplicación Firebase. **No** agregar claves privadas Firebase Admin como `VITE_`.
4. Hacer **Redeploy** en Vercel después de configurar las variables. Vite las incorpora durante `npm run build`.
5. Desde una máquina privada de administración (NO Vercel, NO navegador, NO GitHub), preparar credenciales de Firebase Admin mediante `GOOGLE_APPLICATION_CREDENTIALS`, instalar `backend/` y ejecutar:
   ```bash
   cd backend
   npm install
   read -rs -p 'Contraseña administrador: ' INIT_ADMIN_PASSWORD; echo
   read -rs -p 'Contraseña inmobiliaria: ' INIT_OWNER_PASSWORD; echo
   export INIT_ADMIN_PASSWORD INIT_OWNER_PASSWORD
   node provisionar-usuarios.mjs
   unset INIT_ADMIN_PASSWORD INIT_OWNER_PASSWORD
   ```
   Usar **contraseñas distintas de los correos y de mínimo 12 caracteres**, porque los correos son públicos y usar el mismo texto para la contraseña expone el panel a cualquiera. El script rechaza contraseñas iguales a las direcciones.
6. Iniciar sesión en la URL de Vercel. El administrador accede al panel; la inmobiliaria al panel de propietario. El resto puede registrarse con correo/contraseña normalmente.

## Pendiente de activar fuera del código
La publicación de GitHub por sí sola **NO crea usuarios de Firebase ni actualiza variables de Vercel**. Sin los pasos anteriores no se podrá iniciar sesión en producción.
Los perfiles y contenidos locales del proyecto siguen usando localStorage para parte de sus datos: Firebase Authentication persiste la identidad, pero esos datos de negocio necesitarán migrarse a Firestore para compartirse entre dispositivos.

## Seguridad
- Nunca subir `.env`, claves de servicio, contraseñas o archivos de credenciales a Git.
- Las contraseñas solicitadas iguales al correo no son adecuadas para una aplicación publicada, especialmente el administrador.
- Las rutas SMTP del backend ya exigen `admin: true` validado con Firebase Admin; los cambios del frontend no eliminan esta verificación.
