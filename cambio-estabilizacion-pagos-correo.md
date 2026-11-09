# cambio — Estabilización del pago de prueba y correo SMTP (2026-11-09)

## Diagnóstico realizado
- El último despliegue del sitio sigue siendo una versión anterior: Vercel rechazó despliegues recientes por límite de compilaciones del plan Hobby.
- En el entorno **Production** existen variables FIREBASE_SERVICE_ACCOUNT_BASE64, SMTP_PASS y MAIL_ENCRYPTION_KEY, entre otras, pero su existencia no prueba que las credenciales sean válidas o que estén siendo usadas por la versión visible.
- Los logs de Vercel registran solicitudes recientes a `POST /api/checkout/card` y a `/api/admin/mail/*`. La alerta `DEP0169 url.parse()` es una advertencia de Node, **no el diagnóstico definitivo del fallo de pago o correo**.
- El panel SMTP recargaba los datos cada 60 segundos y podía sobrescribir cambios aún no guardados en el formulario.
- El formulario de pago generaba una referencia nueva en cada intento; un reintento tras un corte de conexión podía abrir otra solicitud y crear un nuevo número de comprobante.
- Después de que el servidor confirmaba una contratación, una excepción en el `localStorage` del navegador podía mostrar un error genérico de pago, aunque la operación ya estuviera registrada.

## Correcciones en main
1. `src/components/admin/AdminSmtpSettings.tsx`: retirado el refresco automático que pisaba cambios pendientes; los ajustes se consultan al entrar o al pulsar Actualizar. Mensajes claros sobre la contraseña de aplicaciones: se guarda cifrada y no se devuelve en texto plano, el campo vacío conserva la existente; verificar la conexión es un paso independiente.
2. `api/_mail.js`: las claves de aplicación Gmail pueden pegarse con espacios y se normalizan antes de cifrarlas. Si una contraseña previamente cifrada no puede descifrarse tras rotar MAIL_ENCRYPTION_KEY, y existe SMTP_PASS, se utiliza esa configuración como respaldo sin exponerla. Si no existe, muestra error específico para volver a guardar.
3. `src/components/plans/PlansPage.tsx`: reintentos de tarjeta comparten una referencia idempotente hasta que el servidor confirme; no se genera una operación nueva por un error momentáneo. Tras confirmación del backend, los fallos de almacenamiento local aparecen como **avisos específicos**, no como pago rechazado. La numeración y estado siguen siendo responsabilidad del servidor/Firestore.
4. Se conserva que **SMTP no revierte un comprobante confirmado**: en caso de fallo se registra como `failed`, visible en Administración para reenvío manual.

## Validaciones que faltan en producción
- Vercel necesita compilar y publicar la nueva revisión para que estos cambios funcionen en `nde-rogara.vercel.app`.
- En Administración → Centro de correo: Guardar configuración → Verificar conexión → Enviar prueba a un correo real. Distinguir "guardado" de "aceptado por SMTP" y de "entregado al destinatario".
- En contratación de prueba: comprobar que un intento produce **un** comprobante con número global; volver a consultar el panel después de una reconexión. Confirmar que el comprobante aparece en el servidor, y que su registro SMTP es `accepted` o `failed`.
- Los campos de tarjeta y el botón Pagar realizan un **registro de demostración**, no un cargo bancario real.
- La contraseña de aplicaciones que anteriormente se compartió en el chat se debe revocar/rotar en Google por seguridad. No se incorporó ninguna contraseña al repositorio.

## Restricciones actuales
- La configuración de SMTP se mantiene en Firestore/variables secretas de Vercel; el navegador no almacena la clave.
- La existencia de variables no garantiza su valor correcto. No se han expuesto ni copiado sus valores.
- El código de backend se ha corregido, pero no se ha confirmado una prueba final extremo a extremo por límites de despliegue de Vercel.
