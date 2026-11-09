# cambio — Identificación del receptor para facturación de demostración

## Solicitud aplicada
- Selector **CI (no contribuyente)** o **RUC (contribuyente)** dentro del pago.
- Para CI se solicita nombre y número de cédula.
- Para RUC se solicita nombre/razón social, número de RUC sin DV y **dígito verificador en campo separado**.
- El nombre se precarga desde el perfil de la plataforma y se puede editar.
- Dirección de facturación eliminada del formulario obligatorio.
- El dato elegido se muestra correctamente en la constancia/comprobante local, sin presentarlo como factura SIFEN.
- Los perfiles anteriores con RUC-número-DV unidos se migran al cargarlos (sin borrar los registros antiguos).
- Se mantienen opciones de renovación, políticas y simulación de tarjeta/QR.

## Archivos modificados
1. `src/services/billing.ts`: datos de identidad CI/RUC, migración de perfil y validaciones.
2. `src/components/plans/PlansPage.tsx`: selector y formulario condicional, nombre predeterminado y DV separado.
3. `src/services/invoices.ts`: receptor del comprobante y dirección omitida si no se informa.

## Alcance
Este comprobante sigue siendo una simulación **sin validez tributaria**. No se verifican documentos contra DNIT, no se calculan dígitos verificadores ni se genera factura electrónica real. Tipos de receptor adicionales (persona física/jurídica, gobierno, B2B) se dejan para una etapa posterior.
