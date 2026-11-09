# cambio — Envío automático de comprobantes por correo

## Diagnóstico
Antes, al confirmar una contratación, el navegador llamaba a `preparePlanMail()` para guardar un mensaje **solo en localStorage**; no enviaba por SMTP ni generaba el PDF en el servidor. El área administrativa tampoco podía consultar el envío generado desde otro navegador.

## Implementación
- Función autenticada `POST /api/mail/receipt` que recibe los datos de una contratación de demostración y genera un comprobante PDF adjunto desde el servidor.
- El destinatario sale de **Correo para comprobantes** y requiere una sesión Firebase con correo verificado. El contenido del correo es fijo y el plan/importe se contrastan con los planes configurados en el servidor.
- Restricciones antiabuso: máximo 5 intentos por usuario/día, hasta 3 intentos por comprobante, reserva atómica para evitar duplicados concurrentes, consulta idempotente si el envío ya fue aceptado.
- Estados persistidos en Firestore: `processing`, `accepted`, `failed`. Los logs SMTP se consultan con rol administrativo desde `/api/admin/mail/logs`.
- Al finalizar una contratación, el navegador inicia el envío inmediatamente, indica si fue aceptado, muestra un error si falla y ofrece **Reintentar envío**.
- Desde **Mis publicaciones → Mis comprobantes**, el usuario puede solicitar el PDF por correo para compras anteriores guardadas en el mismo navegador.
- El Centro de correo administrativo muestra historial de comprobantes, totales de aceptados/errores y motivos de fallo, con actualización manual y automática periódica.
- La contraseña SMTP y la credencial privada de Firebase permanecen en variables Secret de Vercel; no se almacenan en el navegador.

## Archivos
- `api/_mail.js`: reutiliza la conexión Firebase/SMTP existente.
- `api/_receipt.js`, `api/mail/receipt.js`: servicio de envío, PDF e historial.
- `src/services/receiptDelivery.ts`: cliente del servicio de comprobantes.
- `src/components/plans/PlansPage.tsx`: envío automático y control visible del resultado.
- `src/components/owner/OwnerDashboard.tsx`: reenvío de comprobantes guardados.
- `src/components/admin/AdminSmtpSettings.tsx`: errores e historial.
- `package.json`: dependencia privada de servidor PDFKit.

## Pruebas y limitaciones
- Compilación de Vite/TypeScript validada por despliegue de Vercel.
- **No se puede afirmar recepción real** hasta completar una contratación de prueba autenticada y verificar el mensaje en Gmail. El historial registra aceptación del servidor SMTP, no entrega en bandeja.
- Este **no es un sistema fiscal**: el pago se simula en el navegador, el PDF es un comprobante de demostración y no un KuDE ni una factura electrónica con CDC/SIFEN.
- Los comprobantes de operaciones anteriores están guardados localmente por navegador. No existe todavía base de datos central de pagos verificados.
- Si las credenciales SMTP de Gmail se revocaron, actualizarlas en Vercel antes de probar. Las contraseñas expuestas en chats no deben reutilizarse.
