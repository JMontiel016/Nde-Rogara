# cambio — Diseño de comprobante inspirado en factura electrónica paraguaya

## Ejemplo utilizado
Archivo facilitado por el usuario: `ejemplo.pdf`, una factura de una sola página con:
- Encabezado de emisor y recuadro de timbrado/RUC/número
- Datos del comprador y operación
- Tabla con código, descripción, unidad, cantidad, precio, descuento, exentas, IVA 5%, IVA 10%
- Subtotal, total y liquidación IVA
- Área inferior de consulta/CDC y representación gráfica.

## Modificaciones realizadas
1. `api/_receipt.js` — PDF A4 enviado automáticamente y por el reenvío manual: estructura de dos columnas, cabecera Nde Rogarã, número local, datos de emisor/receptor, detalle del plan, totales e IVA referencial.
2. `src/services/invoices.ts` — Versión imprimible en el navegador: mismo orden visual, formato de detalle tabular, sección fiscal y área de verificación no disponible.
3. Encabezado de **documento de demostración sin validez tributaria** de forma muy visible.
4. Se utilizaron únicamente identificadores fiscales declarados como ficticios: **timbrado 12345678, RUC emisor 87654321-0, numeración local**. No se copia ningún dato tributario ni el QR/CDC de la factura aportada.
5. En la sección inferior se informa que **no existe CDC, QR SIFEN ni XML firmado**; no hay enlace que aparente dar validez fiscal.

## Limitaciones
- El ejemplo se toma como modelo **gráfico** y no autoriza generar facturas fiscales reales.
- La simulación de pago no equivale a un cobro bancario; el IVA es referencial.
- Las credenciales SMTP se mantienen exclusivamente en variables secretas de Vercel.
- No se garantiza recepción de mensajes hasta que un ensayo real confirme que SMTP aceptó el envío y el destinatario lo recibe.

## Despliegue
Cambios aplicados sobre `main`, con despliegue automático de Vercel.
