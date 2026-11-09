# cambio — Multimedia conjunta, guardado de edición y portada de anuncios

## Problemas corregidos
1. El formulario ofrecía únicamente botones separados para fotos y videos. Ahora suma una carga múltiple conjunta.
2. Al editar una publicación, se eliminaban archivos remotos/locales antes de pulsar «Guardar cambios», de modo que cancelar podía dejar referencias rotas.
3. Al modificar la portada o los datos de un inmueble aprobado, el contexto forzaba una nueva revisión y lo quitaba del inicio. Además limpiaba prematuramente el inmueble en edición, pudiendo reiniciar el formulario antes de mostrar confirmación.
4. La elección de portada usaba solamente una estrella pequeña y era difícil de encontrar.

## Cambios realizados
- **Subir fotografías y videos juntos**: selector múltiple, distingue imágenes y clips, valida límites independientes del plan; admite imagen JPG/PNG/WebP y video MP4/WebM (máximo 40 s y 50 MB en el modo local).
- Los controles separados siguen disponibles. Las nuevas fotografías y clips se agregan a los existentes, no sustituyen los ya seleccionados.
- Cada fotografía se muestra en una miniatura y puede abrirse completa, quitarse o seleccionarse como portada.
- **Elegir portada** mueve la fotografía seleccionada a la primera posición. La tarjeta del anuncio, el inicio y los listados ya utilizan `property.images[0]`; al guardar esta selección se actualiza donde se muestre ese anuncio.
- En una edición, quitar multimedia marca los archivos para borrarlos **después de guardar correctamente**; cancelar mantiene los originales.
- La edición deja de limpiar `editingProperty` durante la operación, preservando el mensaje de confirmación.
- Un aviso previamente aprobado sigue aprobado y visible al cambiar solo portada, contactos, precio u otros datos permitidos. Nuevas fotos o videos pasan a revisión visual antes de exponerse públicamente; un aviso ya pendiente se mantiene pendiente.
- El catálogo local se guarda antes de actualizar el estado. Si el navegador no tiene cuota suficiente, muestra error.

## Límites actuales
- El modo gratuito todavía conserva fotografías optimizadas en `localStorage` y videos en IndexedDB **del navegador actual**. No se comparte automáticamente con otros dispositivos ni con un administrador desde otro navegador.
- La publicación de una foto/video **nuevo** debe revisarse antes de aparecer en el catálogo público. El sistema no tiene análisis visual automático.
- Estos cambios no modifican planes, pagos, cuentas ni numeración de comprobantes.
- La presencia del código en GitHub no implica despliegue exitoso en Vercel; comprobar la versión Ready.

## Prueba rápida
1. Abrir Mis avisos → Editar un inmueble ya aprobado.
2. En Fotografías y recorridos en video, seleccionar JPG + MP4 desde «Agregar fotos y videos».
3. Revisar las dos galerías y reproducir el video.
4. Elegir otra foto con «Elegir portada».
5. Guardar y volver a abrir Edición: la portada y videos deben seguir en la publicación.
6. En Inicio, tras aprobación de multimedia nueva, la tarjeta debe usar la primera fotografía.
7. Editar **solo** la portada de un inmueble aprobado: debe mantenerse publicado, sin otra aprobación.
8. Abrir Editar, quitar una foto y pulsar Cancelar: la fotografía debe permanecer al volver a abrir.
