# cambio — Facturas: estado de envío SMTP y reenvío excepcional

## Problema
El estado `Registrada` en Facturas indicaba la creación del comprobante local, sin consultar el envío SMTP. No había acción de reenvío ante errores ni selección de copias.

## Ajuste implementado
- En **Administración → Facturas** se conserva el estado del comprobante y se agrega la columna **Envío por correo**.
- Se consulta `/api/admin/mail/logs` con token Firebase y privilegio admin para identificar por `paymentId` los envíos automáticos y manuales.
- Estados diferenciados: **Aceptado por SMTP**, **Error de envío**, **Sin confirmación SMTP** y **Servicio no disponible**.
- Estadísticas de aceptados/fallidos/sin confirmación, botón **Actualizar estado de correos**, actualización automática cada minuto mientras se ve la sección.
- Se muestra destinatario, fecha, motivo de error y copia (si la hubo).
- Si no hay aceptación previa, un administrador puede **Enviar manualmente** el PDF existente al correo original del comprobante y añadir hasta tres correos CC opcionales.
- El servidor valida el rol admin, los datos de plan/importe y los destinatarios; rechaza duplicaciones ya aceptadas, limita intentos y guarda los resultados en Firestore.
- Envíos manuales se identifican con `type: receipt_manual` y quedan visibles también en el Centro de correo.
- El envío **automático al contratar** se conserva; la acción manual es únicamente una salida ante errores o falta de confirmación.

## Archivos
- `api/_receipt.js`: reutiliza el generador PDF del servidor.
- `api/admin/mail/receipt.js`: endpoint de reenvío administrativo con permisos, CC y control de duplicados.
- `src/services/adminReceiptMail.ts`: consulta y envío manual.
- `src/components/admin/AdminPanel.tsx`: vista, contadores, estados y controles de reenvío.

## Alcances y límites
- **Aceptado por SMTP** no confirma recepción en la bandeja de entrada ni lectura.
- Si no existe registro SMTP, el estado se presenta como **Sin confirmación**, no se afirma que el correo definitivamente no fue enviado.
- Los comprobantes en esta vista proceden del almacenamiento local del navegador que los creó; no hay una base central de facturas fiscales ni verificación de pago real.
- Los documentos son comprobantes de demostración **sin validez tributaria ni aprobación SIFEN**.
- La cuenta remitente Gmail y su contraseña de aplicaciones siguen bajo la configuración privada de Vercel; no se agregaron claves al código.
