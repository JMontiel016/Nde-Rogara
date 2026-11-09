# cambio — Corregir correo 404 de Nde Rogarã en Vercel

## Diagnóstico
El panel de correo enviaba peticiones a `/api/admin/mail/settings` y `/api/admin/mail/logs`, pero en Vercel solo estaba publicado el frontend Vite; el servidor `backend/index.mjs` no se despliega automáticamente. Por eso se veían respuestas 404.

## Cambios
- Funciones de Vercel en `api/admin/mail/settings.js`, `logs.js`, `verify.js`, `test.js` y `send.js`.
- `api/_mail.js`: verificación de JWT Firebase `admin: true` en servidor; Firestore para persistencia de configuración e historial; clave SMTP cifrada AES-256-GCM; Nodemailer con TLS y confirmación de envío, con límite de 50 logs y sin devolver secretos.
- Dependencias privadas del backend instalables desde el paquete raíz: `firebase-admin` y `nodemailer`.
- Mensajes claros ante rutas API ausentes.
- Los datos SMTP del panel se mantienen separados de cualquier contraseña pública.

## Configuración obligatoria (Vercel)
Esta configuración no puede efectuarse desde GitHub. En el proyecto de Vercel abrir **Settings > Environment Variables**, crear variables en Production (y Preview si se desea):

| Variable | Valor |
| --- | --- |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | JSON de cuenta de servicio **nueva** de Firebase, codificada en base64, sin saltos |
| `MAIL_ENCRYPTION_KEY` | 64 caracteres hexadecimales aleatorios |
| `SMTP_USER` | `016.jmma@gmail.com` (opcional si se configuran campos en el panel) |
| `SMTP_HOST` | `smtp.gmail.com` (opcional) |
| `SMTP_PORT` | `465` (opcional) |
| `SMTP_PASS` | Contraseña de aplicación **nueva**, solo si se desea administrar el secreto en Vercel. Si no, dejar sin definir y utilizar el panel junto con MAIL_ENCRYPTION_KEY |

**Nunca usar variables `VITE_*` para secretos SMTP o Firebase Admin.** Revocar las claves JSON y la contraseña de aplicaciones ya compartidas por chat.

Para crear los valores desde Ubuntu, con el JSON seguro en `~/.config/nde-rogara/firebase-admin.json`:

```bash
base64 -w0 "$HOME/.config/nde-rogara/firebase-admin.json"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar los resultados únicamente a los campos **secretos** de Vercel, jamás al repositorio o al chat.

Tras guardar, ejecutar **Redeploy** de la versión nueva en Vercel, o crear un nuevo despliegue.

## Prueba
1. Iniciar sesión con Google como `016.jmma@gmail.com`, que ya tiene el claim `admin: true`.
2. Ir a Administración > Centro de correo > Configuración SMTP.
3. Ajustar datos de Gmail, activar envío y **Guardar configuración**.
4. Elegir **Verificar conexión** y luego **Enviar prueba** al propio Gmail.
5. Verificar la recepción e historial. Mensaje `503` implica configuración privada ausente o Firestore inaccesible, y `404` que la función no se publicó.

El backend separado `backend/index.mjs` puede seguir usándose localmente para moderación: las nuevas funciones sirven el correo en el propio dominio de Vercel sin un servidor Express adicional.

## Limitaciones
No es posible confirmar el envío SMTP hasta configurar secretos privados de Vercel y realizar una prueba autenticada. Firebase Authentication y SMTP Gmail son servicios separados.
