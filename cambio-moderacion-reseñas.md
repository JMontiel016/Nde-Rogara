# cambio — Moderación automática de reseñas y publicaciones

## Diagnóstico
- Las reseñas quedaban siempre con `status: pending` y se persistían solo en `localStorage` del navegador.
- El panel administrativo mostraba **todas** las reseñas con los botones «Publicar»/«Ocultar».
- Un usuario distinto no podía consultar las opiniones de otro navegador.
- Las altas/ediciones de inmuebles también se marcaban siempre como pendientes, incluso si el texto no disparaba ninguna regla.

## Cambios aplicados
1. `api/reviews/index.js`: endpoint con lectura pública **por propertyId** y alta controlada en Firestore. Solo se devuelven reseñas con estado `published`. El servidor analiza insultos, amenazas, contenido prohibido, publicidad y enlaces externos antes de guardar.
2. Reseñas sin infracción: `published` automáticamente y visibles **solo en su inmueble**. Reseñas con infracción: `blocked`, no visibles y con motivo.
3. Control anti-spam: una reseña por identidad/navegador e inmueble y límite aproximado de envíos por IP y día. Datos de identidad anónima no se envían al cliente lector.
4. `api/admin/reviews.js`: solo rol Firebase `admin:true` puede consultar casos `blocked` y descartarlos. Se evita liberar reseñas que aún infringen las reglas.
5. `src/components/properties/PropertyReviews.tsx`: consulta una vez al abrir un inmueble y luego de que se publique una reseña; **sin temporizador de refresco** si no hay novedades. Indica errores y motivos de bloqueo.
6. `src/components/admin/AdminPanel.tsx`: sección **Reseñas bloqueadas** con motivo, enlace al inmueble y acción de descarte. Las aprobadas automáticamente no llenan el panel.
7. `src/services/adminGovernance.ts`: filtro de texto de anuncios ampliado para insultos, amenazas y publicidad ajena al alquiler.
8. `src/context/AppContext.tsx`: anuncios solo de texto que no infringen reglas pueden aprobarse automáticamente; anuncios con imágenes/videos sin verificación visual siguen pendientes por seguridad.
9. `src/components/properties/PublishModal.tsx`: comunica si una publicación pasó el filtro de texto o requiere revisión.

## Alcances y limitaciones
- El filtro textual funciona con **reglas explícitas**, no es un modelo de IA semántica y no garantiza detectar toda infracción ni evitar falsos positivos.
- Las imágenes y videos **no pueden declararse seguros** mediante el filtro de palabras. Se mantiene la revisión visual y las protecciones existentes para subir fotos; su aprobación automática exige un servicio de análisis de contenido conectado.
- Las reseñas anteriores alojadas únicamente en `localStorage` no se migran automáticamente a Firestore. Las nuevas son compartidas por inmueble.
- La información de publicaciones todavía se almacena en el navegador; el enlace entre una reseña pública y un inmueble de otro navegador depende de que ambos tengan el mismo identificador de publicación.
- El servidor puede necesitar índices/reglas/provisión adecuados de Firestore. La compilación no equivale a probar guardado/lectura real.
