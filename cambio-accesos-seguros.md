# cambio — Acceso administrador e inmobiliaria

## Resultado
- Se conserva el correo del administrador `admin@admin.com.py` y el de inmobiliaria `016.jmma@gmail.com`.
- `src/components/auth/AuthModal.tsx`: añade **Continuar con Google**. La cuenta inmobiliaria existente con proveedor Google podrá utilizar ese método. El resto sigue iniciando con correo/contraseña.
- `backend/asignar-admin-existente.mjs`: asigna el custom claim `admin: true` al administrador ya creado, sin cambiar su contraseña ni crear nuevas cuentas.
- «¿Olvidaste tu contraseña?» envía un enlace de Firebase al correo registrado para que el titular elija una contraseña nueva.

## Activación requerida (NO automatizada por GitHub o Vercel)
1. Para administrador, desde `https://nde-rogara.vercel.app` seleccionar **¿Olvidaste tu contraseña?**, escribir `admin@admin.com.py` y usar el enlace que llega a la bandeja de ese correo. No se configura una clave universal.
2. En un equipo con acceso autorizado a Firebase Admin y credenciales de aplicación configuradas (`GOOGLE_APPLICATION_CREDENTIALS` o ADC), ejecutar desde `backend/`:
   ```bash
   npm install
   node asignar-admin-existente.mjs
   ```
   El script no usa contraseñas ni solicita datos privados en GitHub.
3. Cerrar sesión y volver a ingresar como administrador tras asignar el claim.
4. Inmobiliaria: iniciar con **Continuar con Google** y seleccionar `016.jmma@gmail.com`.

## Seguridad
No se establecen contraseñas iguales a las direcciones de correo ni se restablecen cuentas públicas automáticamente a `12345678`. Eso permitiría tomar control de los usuarios, especialmente del panel administrador.
No se puede confirmar acceso real sin ejecutar la asignación del rol en Firebase y completar el enlace de recuperación del titular.
