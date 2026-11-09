# cambio — Formulario de tarjeta para contratación de prueba

## Ajustes
- Se permite introducir números ficticios variados, sin limitarse a dos tarjetas de ensayo concretas.
- Se validan las longitudes según la marca detectada: Mastercard 16, American Express 15, Visa 13/16/19, otras entre 13 y 19.
- El número se agrupa visualmente cada cuatro dígitos (formato 4-6-5 para Amex); se impide escribir más dígitos que el límite de la marca.
- La marca detectada aparece con un distintivo visual de Visa, Mastercard o American Express. Son representaciones tipográficas, no integración bancaria.
- El campo de vencimiento adopta MM/AA, comprueba el mes y que no esté vencido.
- El CVV se limita a tres dígitos o cuatro para American Express.
- Se añade código postal paraguayo de seis dígitos, comprobado al pagar con tarjeta ocasional.
- Todos los campos sensibles de tarjeta empiezan vacíos y se reinician al iniciar una contratación nueva.
- Se mantiene el guardado de solo la marca y los cuatro últimos dígitos si el usuario decide recordar una referencia.
- Se reduce el texto explicativo repetitivo, conservando la aclaración imprescindible antes de confirmar: la operación es de prueba, sin cargo bancario.
- El código postal se guarda con los datos del comprobante y puede aparecer en la constancia no tributaria.

## Alcance
La operación **no procesa fondos**, no autoriza tarjetas bancarias, no verifica titularidad ni contiene pasarela de pagos. Solo se valida el formato y se simula el alta de un plan en el entorno de presentación. Nunca se deben ingresar números de tarjeta reales.

## Archivos
- `src/services/billing.ts`
- `src/components/plans/PlansPage.tsx`
- `src/services/invoices.ts`
