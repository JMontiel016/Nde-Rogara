# cambio — Validación y confirmación de ubicación del inmueble

## Problema comprobado
El formulario no guardaba un anuncio si la variable `locationConfirmed` era falsa, incluso cuando ciudad, barrio y dirección ya estaban escritos. El error general no explicaba cómo marcar el punto. Buscar la dirección en OpenStreetMap tampoco garantiza que aparezca la dirección exacta.

## Corrección
- Separación de validaciones: campos de dirección y confirmación del punto tienen mensajes diferentes.
- Cuando falta el punto, el sistema despliega el mapa y desplaza el formulario hasta la sección «Dirección y ubicación».
- Estado visible «Ubicación pendiente» / «Punto confirmado».
- Botón «Confirmar este punto», además de la opción de hacer clic directamente sobre el mapa.
- El botón requiere ciudad reconocida en Paraguay, barrio y referencia de dirección completos. El punto debe estar dentro de las coordenadas aproximadas de Paraguay.
- No se guarda silenciosamente la ubicación inicial sin una acción explícita del usuario.
- Se conservan las demás validaciones del formulario, límites de fotografías/videos, plan y revisión de contenido.

## Prueba
1. Iniciar sesión y entrar en Mis avisos → Nuevo inmueble.
2. Completar nombre/tipo/precio y los campos de la sección 2.
3. Elegir un punto sobre el mapa, o verificar el centro antes de pulsar «Confirmar este punto».
4. Verificar el mensaje «Punto confirmado».
5. Subir al menos una fotografía y completar los campos restantes; publicar.
6. Comprobar que el anuncio aparezca en Mis avisos. Si usa multimedia, el anuncio seguirá pendiente de verificación antes de ser público.

## Limitación
Los cambios de GitHub se deben compilar/publicar correctamente en Vercel antes de aparecer en la web pública. Los últimos despliegues mostraron errores previos y esta modificación por sí sola no confirma el funcionamiento total del sistema.
