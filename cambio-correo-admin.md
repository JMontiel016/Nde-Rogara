# cambio — Correo y cuenta administradora Nde Rogarã

## Cambios realizados
- El administrador principal previsto sigue siendo **016.jmma@gmail.com** y se inicia con el proveedor **Google**.
- El acceso a Administración depende del **custom claim Firebase `admin: true`**, otorgado mediante Firebase Admin. No se concede por reconocer el correo en el frontend.
- `src/components/admin/AdminSmtpSettings.tsx`: sugerencias SMTP de Gmail precargadas (remitente y destinatario), sin insertar contraseñas.
- `backend/mailAdmin.mjs`: soporte para variables privadas de servidor `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` y `SMTP_PASS` como respaldo cuando no existe clave SMTP cifrada almacenada en Firestore. Las contraseñas nunca se envían al frontend.
- `backend/.env.example`: ejemplo para SMTP de Gmail sin secreto real.

## Configuración obligatoria fuera del código
1. La contraseña de aplicaciones enviada al chat debe **revocarse en la cuenta Google** y reemplazarse por otra nueva. **No subir la nueva contraseña a GitHub ni enviarla al chat.**
2. La clave de servicio Firebase Admin anteriormente compartida también debe rotarse. No reutilizar claves expuestas.
3. Guardar los nuevos secretos como variables de entorno del backend, nunca como variables `VITE_*`.
4. Desplegar el backend Node/Express `backend/index.mjs` en un servidor con HTTPS, Firebase Admin/Firestore y `MAIL_ENCRYPTION_KEY` opcional para guardar credenciales cifradas desde el panel. El frontend Vercel publicado solo tiene un proxy para desarrollo local; no publica automáticamente el servicio Express.
5. Establecer `VITE_MAIL_API_URL=https://URL-REAL-DEL-BACKEND/api/admin/mail/send` en Vercel y redesplegar, o crear un proxy inverso HTTPS bajo `/api/admin/mail`.
6. Ejecutar una vez `node backend/asignar-admin-existente.mjs` en un equipo privado con credenciales Firebase Admin **nuevas** para otorgar `admin: true` a la cuenta Google existente. Cerrar sesión y volver a ingresar con Google.
7. En el panel de correo, guardar/activar SMTP y realizar **Verificar conexión** y **Enviar prueba**.

## Pendiente
No hay acceso directo desde la integración de GitHub a las variables privadas de Vercel ni a Firebase Authentication para asignar claims. Por ello **no se han asignado permisos reales ni validado envíos SMTP**, y no se debe afirmar que el servicio esté operativo en producción hasta completar los pasos descritos.
