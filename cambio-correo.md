# cambio — Configuración de correo en panel administrador

## Correcciones incluidas
- `backend/index.mjs`: habilita GET, POST y PUT en CORS para consultar, verificar y guardar la configuración SMTP.
- `vite.config.ts`: añade proxy de desarrollo para `/api/admin/mail` hacia el backend `http://127.0.0.1:8081`, conservando el QR local y la autenticación demo existente.
- El componente `src/components/admin/AdminSmtpSettings.tsx` y el servicio `backend/mailAdmin.mjs` ya incluyen los formularios, verificaciones, prueba de envío, historial y cifrado de contraseña. No se alteran.

## Pasos para habilitar en Ubuntu
1. `npm install` (raíz); `cd backend && npm install`.
2. Configurar Firebase frontend y credenciales de Firebase Admin en backend; habilitar Firestore.
3. Crear un `backend/.env` privado con `MAIL_ENCRYPTION_KEY` generado mediante `openssl rand -hex 32`. No subir archivos .env ni llaves.
4. La cuenta Firebase que gestione correo debe tener el custom claim `admin: true` emitido por un administrador confiable; la cuenta demo local no sirve para SMTP.
5. Desde `backend`, cargar el entorno privado y ejecutar el servidor según su `package.json`; desde la raíz, ejecutar `npm run dev`.
6. En el panel: Centro de correo → Configuración SMTP → Guardar configuración → Verificar conexión → Enviar prueba.
7. Para utilizar otro puerto local de backend, exportar `MAIL_BACKEND_PROXY_TARGET=http://127.0.0.1:PUERTO` antes de iniciar Vite.

## Límites
- No se ejecutaron pruebas con una cuenta SMTP real ni con Firestore privado.
- La aceptación SMTP no garantiza entrega final en bandeja de entrada.
- Los pagos/facturas de demostración no se transforman en cobros ni en KuDE reales.
- En producción se necesita proxy o dirección API HTTPS propia; el proxy de Vite es solo de desarrollo.

## Ajuste posterior — Acceso demo al panel
- `src/components/auth/AuthModal.tsx`: elimina los avisos de configuración administrativa y mensajes internos del formulario de ingreso; conserva validación de correo/contraseña y separación entre cuentas.
- Usuarios locales existentes: `admin@admin.com.py` (administrador) y `016.jmma@gmail.com` (inmobiliaria).
- Las contraseñas elegidas NO se incluyen en GitHub: ejecutar `bash configurar-demo-local.sh` y escribir las dos contraseñas solicitadas cuando el script lo pida. La configuración queda en `.env.local` con permisos limitados; reiniciar Vite.
- Las cuentas de demostración solo funcionan con `npm run dev` en `localhost` o `127.0.0.1` y no conceden acceso al SMTP de producción ni permisos Firebase.
