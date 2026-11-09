# cambio — Reenvío de comprobantes exclusivo del administrador

## Cambios
- Eliminada la opción «Enviar PDF por correo» del panel `Mis publicaciones → Mis comprobantes` de propietarios/usuarios. Solo conserva «Ver comprobante» para abrir/imprimir/guardar el PDF.
- El primer envío automático al contratar un plan se mantiene sin cambios.
- El reenvío manual se gestiona únicamente desde `Administración → Facturas`, disponible con rol Firebase `admin: true`.
- El administrador puede reenviar incluso cuando el servidor SMTP ya había aceptado el mensaje, con confirmación explícita de los destinatarios.
- Soporte para hasta tres correos en copia separados por `;` (punto y coma), manteniendo el destinatario principal original.
- Cada intento de reenvío obtiene un identificador único y registro propio en Firestore y en el historial SMTP, sin reemplazar los envíos anteriores.
- Protecciones: límite de ocho reenvíos por comprobante y día, espera de un minuto entre solicitudes y bloqueo de doble envío del mismo intento.

## Archivos
- `src/components/owner/OwnerDashboard.tsx`
- `src/components/admin/AdminPanel.tsx`
- `src/services/adminReceiptMail.ts`
- `api/admin/mail/receipt.js`

## Notas
- «Aceptado por SMTP» confirma recepción por el servidor de correo, no entrega final en bandeja.
- Los documentos y pagos siguen siendo de demostración y no facturas fiscales SIFEN.
- No se introducen contraseñas ni credenciales privadas en el código.
