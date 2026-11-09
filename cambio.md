# cambio — Actualización v14 · 9 de noviembre de 2026

## Resumen ejecutivo

Esta entrega agrega dos accesos locales de exhibición, un Centro de correo dentro de Administración, avisos preparados a partir de contrataciones y retiros de anuncios, una opción de envío SMTP seguro cuando exista backend autorizado y el manual de usuario en Word/PDF. Se conservan los datos, la estructura de publicación, planes y moderación.

## 1. Accesos preparados (solo desarrollo local)

- **Administrador:** `admin@admin.com.py`. La contraseña solicitada coincide exactamente con ese correo.
- **Cuenta inmobiliaria:** `016.jmma@gmail.com`. La contraseña solicitada coincide exactamente con ese correo.
- Ambos accesos operan solamente con `npm run dev` en `localhost` o `127.0.0.1` y corresponden a cuentas locales de demostración, no a usuarios reales de Firebase.
- La cuenta inmobiliaria usa los permisos existentes de propietario para crear y gestionar publicaciones; el rol de inmobiliaria independiente fue descartado del alcance.
- Las credenciales no se rellenan automáticamente y el formulario se limpia al abrirlo. Se impide restaurar estas sesiones locales fuera del entorno de desarrollo.
- **Advertencia:** contraseñas iguales al correo son inseguras. No publicar este acceso en Internet ni usarlo para producción. Se requiere un sistema de autenticación y autorización de servidor para cuentas reales.

## 2. Centro de correo administrativo

- Nuevo módulo `Administración > Centro de correo` con redacción de avisos de planes, moderación y mensajes generales.
- Buzón de salida local con estado **Preparado**. No se marca como enviado por abrir un cliente de correo.
- Al completar una contratación local se prepara un aviso para el correo de compra; las retiradas de anuncios también preparan un aviso al propietario.
- Botones para **Abrir en mi correo**, **Copiar** o **Enviar por servidor**.
- La opción de envío directo requiere servidor Node, configuración SMTP y un ID token de Firebase con `admin: true` como claim emitido desde un sistema de administración autorizado. El usuario administrador local no tiene permisos de Firebase; solo prepara avisos y abre el cliente de correo.
- Se incorpora `backend/.env.example` con parámetros SMTP. Los secretos no se guardan en el frontend ni en el ZIP.
- Se eliminó la falsa respuesta de éxito del antiguo botón de prueba SMTP del frontend.

## 3. Limpieza y conservación

- El paquete contiene **solo archivos modificados o agregados**; no incluye `node_modules`, `dist`, carpetas temporales ni `.env` real.
- Se mantienen los módulos de Inicio, Planes, Mapa, Publicaciones, Administración, Comprobantes, Moderación y Perfil sin borrar datos locales.
- No se limpiaron datos de `localStorage`, publicaciones, facturas ni cuentas anteriores para evitar pérdida de información.
- Se agregaron comentarios explicativos en los flujos sensibles de autenticación y de mensajería.

## 4. Archivos de código incluidos en v14.zip

```text
src/context/AppContext.tsx
src/services/adminAccessMode.ts
src/services/adminGovernance.ts
src/services/mailQueue.ts                  (nuevo)
src/components/auth/AuthModal.tsx
src/components/admin/AdminPanel.tsx
src/components/admin/AdminMailCenter.tsx   (nuevo)
src/components/plans/PlansPage.tsx
backend/index.mjs
backend/package.json
backend/.env.example
.env.example
package.json
scripts/comprobar-correo.mjs             (nuevo)
```

## 5. Pruebas realizadas

- `npm run build`: **OK** (TypeScript y Vite).
- `npm run check`: **OK**, 16 validaciones previas y 7 nuevas para cola local de correo.
- `node --check backend/index.mjs`: **OK**.
- Servidor Vite de desarrollo: **HTTP 200** en la ruta principal.
- **Límite:** la navegación visual automatizada fue bloqueada por el entorno, por lo que no se afirma haber completado pruebas E2E desde el navegador.
- Word y PDF: renderizados y revisados visualmente, documento editable con 9 páginas.

## 6. Instalación y prueba

1. Respaldar la carpeta actual `NdeRogara 1` y detener Vite (`Ctrl+C`).
2. Descomprimir `v14.zip` **dentro** de esa carpeta, conservando la estructura de directorios.
3. Ejecutar `npm ci`, `npm run build`, `npm run check` y `npm run dev`.
4. Abrir `http://localhost:5173`, salir de cualquier sesión anterior y probar ambos accesos.
5. Acceder a Administración > Centro de correo para preparar un aviso.
6. Consultar `manuales/Manual_de_uso_NdeRogara_v14.docx` (editable) o su PDF.

### Opcional: envío SMTP directo real

- Configurar en el **servidor** (nunca en el navegador) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` y la cuenta Firebase Admin.
- Instalar dependencias dentro de `backend/` mediante `npm install`; se añadió Nodemailer al archivo `backend/package.json`.
- Exponer un endpoint protegido, por ejemplo `VITE_MAIL_API_URL=http://localhost:8081/api/admin/mail/send`, y configurar `WEB_ORIGINS`.
- Conceder `admin: true` solo a una identidad Firebase verificada desde un entorno seguro. Sin estas condiciones, el envío directo no funciona; el uso local normal permite abrir el programa de correo de la computadora.

## 7. Entregables

- `v14.zip`: actualización del código y documentación en un solo paquete.
- `manuales/Manual_de_uso_NdeRogara_v14.docx`: manual editable.
- `manuales/Manual_de_uso_NdeRogara_v14.pdf`: manual de lectura.
- `cambio.md`: este informe consolidado y el historial anterior.

---

## Historial de actualizaciones anteriores

# Nde Rogarã — Informe consolidado de cambios (v10)

**Entrega:** `v10.zip` incluye únicamente archivos nuevos o modificados, para instalar **encima de v09**. No incluye `node_modules`, `dist`, `.env`, claves ni datos personales.

## v10 — Edición, identidad de visitantes, moderación y servicios cercanos

### 1. Permisos y datos de propietario

- Se conserva y refuerza la regla **solo propietario autenticado o administrador local** puede abrir y guardar una edición del inmueble.
- Un aviso retirado no puede volver a editarse/activarse por el propietario; requiere intervención administrativa.
- Al crear un aviso se fija `ownerId` y `ownerEmail` a la cuenta autenticada, y al editar no se permite reasignar su propietario ni cambiar la fecha de creación.
- **Limitación:** estos controles corresponden al frontend y al estado local de la demostración. Para garantizar privacidad/autorización entre dispositivos deben implementarse reglas de Firebase/servidor que validen la identidad y las operaciones de cada usuario.

### 2. Identidad y reseñas

- Los visitantes sin iniciar sesión reciben un **ID aleatorio persistente por navegador** (`nderogara_visitor_id_v1`). Es un identificador técnico, **no identifica a una persona** y no se comparte entre navegadores/dispositivos.
- Los usuarios registrados mantienen el ID de su cuenta, local o Firebase.
- Las reseñas de visitantes se publican sin nombre, como **«Anónimo»**; para los registrados se emplea su nombre de cuenta sin pedir otro nombre.
- El nombre de un usuario registrado abre un **perfil público compacto** sin divulgar correo, documento, número de teléfono ni facturación; para los anónimos no hay perfil.
- Se conserva la revisión administrativa de comentarios y el filtro preventivo de insultos/publicidad; el control anti-repetición se vincula al ID del usuario o navegador para no mezclar usuarios registrados distintos.
- Las reseñas no se ofrecen en fichas pendientes o retiradas.

### 3. Verificación y sanciones

- **Las nuevas publicaciones y las ediciones pasan a revisión.** No se publican ni se marcan «Verificado» inmediatamente.
- El distintivo **«Verificado»** aparece en el detalle y las tarjetas solo después de que un administrador aprueba el anuncio: `isVerified=true` y fecha `verifiedAt`. El estado de revisión no es una certificación de identidad o legalidad.
- La cola del administrador muestra cuántas fotos y videos hay y ordena primero los anuncios con menos fotografías (priorización orientativa, sin prometer tiempos).
- Al confirmar el administrador la retirada **por infracción**, la primera infracción suspende la cuenta local y la reincidencia la bloquea; los avisos del propietario quedan pausados. El administrador puede rehabilitarla manualmente y conserva el número de infracciones.
- Un aviso de cuenta suspendida/bloqueada no se aprueba para el público.
- Los avisos pendientes también consumen cupos del plan, evitando saltarse el límite de publicaciones durante la revisión.
- La moderación de fotos continúa funcionando **solo si el servicio real de revisión de imágenes está configurado**; en otro caso la carga se rechaza de forma preventiva. Los videos nuevos necesitan revisión humana u otro servicio audiovisual para determinar su contenido: **no se afirma que sean automáticamente examinados**.
- **No se promete aprobación en 5 minutos, 1 hora ni 12 horas**, ni verificación de identidad automática. No hay tareas programadas ni procesamiento continuo del servidor en esta entrega.
- **Los correos no se envían automáticamente**: el sistema conserva el registro/aviso local y la preparación manual de notificaciones; el envío real exige servicio de correo y permisos en el backend.

### 4. Mapa y servicios alrededor del inmueble

- Mejora de los marcadores de alquiler: etiquetas de precios más legibles, mejor tamaño y capa superior sobre los puntos de interés. Los destacados siguen usando celeste.
- Para evitar que cientos de comercios oculten los alquileres, el mapa dibuja hasta 24 puntos cercanos a la vez, filtrables por categoría y búsqueda; el listado muestra más información sin amontonar iconos.
- La **ficha y el mapa consultan la misma función de OpenStreetMap** y comparten categorías, distancias y enlaces a las ubicaciones reales disponibles en los datos públicos.
- Se incorpora una búsqueda de servicios en el detalle y enlaces para abrir cada establecimiento en OpenStreetMap.
- Lo informado por el propietario al publicar aparece como **«referencias declaradas (no verificadas)»**; nunca se inventa un pin o una coordenada para un establecimiento sin ubicación comprobable.
- Hay reintento mediante un segundo proveedor Overpass cuando el primero está fuera de servicio. La existencia/exactitud y disponibilidad de cada lugar depende de los datos registrados en OSM y del acceso a internet; no puede garantizarse cobertura completa de todos los locales.

### 5. Archivos de código incluidos

1. `src/context/AppContext.tsx`
2. `src/types/index.ts`
3. `src/services/reviewerIdentity.ts` (**nuevo**)
4. `src/services/nearbyPlaces.ts`
5. `src/data/publicationPlans.ts`
6. `src/components/admin/AdminPanel.tsx`
7. `src/components/nearby/NearbyServices.tsx`
8. `src/components/properties/PropertyDetail.tsx`
9. `src/components/properties/PropertyReviews.tsx`
10. `src/components/properties/PublishModal.tsx`
11. `src/components/properties/PropertyCard.tsx`
12. `src/components/properties/PropertyMap.tsx`
13. `src/index.css`
14. `scripts/comprobar.mjs`
15. `cambio.md` (este informe con el historial anterior)

### 6. Instalación y pruebas

Sobre la carpeta que ya tiene **v09** instalado:

```bash
cd "$HOME/Descargas/NdeRogara 1"
unzip -o "$HOME/Descargas/v10.zip"
npm run build
npm run check
npm run dev
```

Después recargar con **Ctrl + Shift + R**.

**Verificado en entorno de desarrollo:** `npm run build` (TypeScript y Vite), correcto; `npm run check`, **16 comprobaciones correctas** (13 existentes y 3 nuevas sobre identidad/cupos/permisos). No se realizaron pruebas integrales del navegador ni verificación en tu máquina. No se conectó Firebase para validar aislamiento entre dispositivos, no se generaron pagos reales y no se enviaron correos.

---

## Historial de actualizaciones anteriores

# cambio — Historial consolidado de Nde Rogarã

**Actualización:** v09.zip — 8 de noviembre de 2026  
**Entrega:** únicamente archivos modificados, para aplicar sobre v08.  
**Objetivo:** publicación de inmuebles sin datos prefijados, con direcciones y servicios próximos, multimedia y reglas claras.

## v09 — Publicación y ficha inmobiliaria

### Correcciones incluidas

1. **Formulario de alta limpio.** Se retiraron las plantillas rápidas de viviendas, botones de barrios preseleccionados, imágenes de muestra y todos los datos ficticios que se cargaban automáticamente para un anuncio nuevo. Al editar, se conservan los datos reales previamente guardados.
2. **Campos mejor definidos.** Títulos y descripciones de texto; precio mensual y expensas con separador de miles paraguayo (`2.000.000`) y almacenamiento como número entero; dormitorios, baños, cocheras, superficie y niveles numéricos. Garantía, amoblamiento, mascotas y disponibilidad se pueden describir libremente.
3. **Ubicación seleccionable.** Ciudad de Paraguay con sugerencias, barrio, dirección y consulta puntual con Nominatim / OpenStreetMap. Los resultados se eligen manualmente y centran el marcador; también es posible marcar o arrastrar el punto en el mapa. Se exige confirmar la ubicación antes de publicar.
4. **Servicios cercanos.** Para una ubicación confirmada se consultan establecimientos reales registrados en OpenStreetMap, con nombres y distancias aproximadas en línea recta. Se priorizan supermercados, hospitales/sanatorios, escuelas/colegios y facultades/universidades. Los lugares detectados pueden modificarse, quitarse o complementarse con otros puntos que conozca el propietario. No se inventan servicios si la consulta falla.
5. **Multimedia ligada al plan.** Se mantienen los cupos de fotos compartidas o por aviso, límites de videos y restricciones de publicaciones; las fotografías necesitan aprobación del sistema de moderación. La carga de MP4/WebM permite **hasta 50 MB por archivo** y presenta una vista previa de los videos guardados localmente.
6. **Comodidades y condiciones.** Se reemplazaron los valores sugeridos por campos agregables, editables y eliminables. Se incorporaron listas de requisitos, condiciones permitidas y condiciones prohibidas, que también aparecen en la ficha pública. Estas listas son informativas y no constituyen contrato legal.
7. **Contacto y redes sociales.** Se conservó WhatsApp, llamadas, horarios, Instagram y Facebook, con enlaces visibles en el detalle tanto para escritorio como para móvil (según los datos suministrados).
8. **Compatibilidad.** Los campos nuevos de la propiedad son opcionales y no rompen la lectura de anuncios anteriores. Se respeta el propietario original al editar una publicación desde el panel administrativo.

### Archivos incluidos en v09

- `src/components/properties/PublishModal.tsx`: nuevo formulario y flujo de ubicación, multimedia y campos.
- `src/components/properties/PropertyDetail.tsx`: dirección, reglas y redes en móvil.
- `src/types/index.ts`: tipos de las condiciones permitidas/prohibidas.
- `src/services/videoMedia.ts`: límite de 50 MB por video.
- `cambio.md`: informe único con esta actualización y el historial anterior.

### Instalación

```bash
cd "$HOME/Descargas/NdeRogara 1"
unzip -o "$HOME/Descargas/v09.zip"
npm run build
npm run check
npm run dev
```

Aplicar únicamente sobre una carpeta **ya actualizada hasta v08**. Detener el servidor antes de reemplazar archivos y actualizar el navegador con `Ctrl + Shift + R`. El ZIP no incluye `.env`, `node_modules`, datos de usuario ni archivos generados.

### Comprobaciones y límites

- `npm run build`: TypeScript y Vite correctos en una reconstrucción de base v01 + parches v02 a v08.
- `npm run check`: 13 verificaciones correctas.
- Prueba visual integral del formulario en Ubuntu: pendiente; debe comprobarse en el navegador del usuario.
- Las fotografías nuevas requieren el servicio de moderación de imágenes configurado; si no está disponible, no se aceptan sin revisión, como protección preventiva de publicaciones.
- OpenStreetMap / Nominatim / Overpass requieren internet y pueden carecer de algunos servicios. La posición exacta y la existencia de cada lugar deben ser confirmadas por el propietario. Las distancias son estimaciones en línea recta.
- Los videos de 50 MB se conservan en IndexedDB del dispositivo; quedan sujetos a cuota de almacenamiento y no se publican de forma sincronizada sin un backend.
- No se modificaron pagos, planes, controles administrativos ni autenticación.

---

# cambio

**Actualización:** v08.zip — 2 de noviembre de 2026  
**Entrega:** actualización incremental del mapa, buscador y catálogo. Aplicar sobre v07; no incluye el proyecto completo.

## v08 — Mapa de alquileres, servicios y búsqueda sincronizada

### Problemas resueltos

- Se retiró el cuadro flotante «Explorar servicios alrededor de», que ocupaba espacio y tapaba precios sobre el mapa.
- Se retiró la caja flotante de categorías que cubría los marcadores de propiedades.
- El mapa vuelve a identificar los alquileres con etiquetas legibles en **Gs.**, manteniendo celeste para inmuebles destacados.
- Se incorporó un buscador de **ciudades de Paraguay con sugerencias al escribir**. Seleccionar una sugerencia o pulsar «Buscar inmuebles» actualiza el filtro compartido entre mapa y listado. Al dejar vacío el campo se restablecen todos los filtros.
- El mapa ampliado conserva los precios y controles de zoom, sin salir de la página. El buscador también funciona en el mapa ampliado.
- Al pulsar el precio de un inmueble, «Servicios cerca del inmueble» se abre **debajo del mapa**, o a la derecha cuando se amplía (en móvil aparece debajo). Tiene búsqueda de nombres, categorías y una lista de resultados que se corresponden con los marcadores de lugares.
- Al seleccionar un resultado del panel de servicios, el mapa se centra en ese lugar. Los enlaces de servicios abren la ficha cartográfica en OpenStreetMap.
- Cada tarjeta del catálogo incorpora **«Ver en mapa»** para ubicar su anuncio, de manera que los resultados y el mapa siempre provienen del mismo conjunto filtrado de inmuebles.

### Archivos de código incluidos

1. `src/components/properties/PropertyMap.tsx` — mapa, búsqueda, precios y servicios.
2. `src/components/properties/PropertyList.tsx` — sincronización del filtro y acceso desde el listado.
3. `src/components/properties/PropertyCard.tsx` — acción «Ver en mapa».
4. `src/services/locationPreference.ts` — autocompletado limitado al catálogo de ciudades de Paraguay.
5. `src/index.css` — estilos y tamaño de los marcadores.
6. `cambio.md` — informe único con el historial consolidado.

### Instalación

```bash
cd "$HOME/Descargas/NdeRogara 1"
unzip -o "$HOME/Descargas/v08.zip"
npm run build
npm run check
npm run dev
```

> Importante: v08 presupone que se instalaron v05, v06 y v07. El servicio `src/services/nearbyPlaces.ts` introducido por esos parches debe existir; en caso contrario, falta completar ese parche previo.

### Verificaciones y límites

- Compilación TypeScript y Vite: **correcta**.
- 13 comprobaciones de lógica del proyecto: **correctas**.
- Pruebas directas del autocompletado y validación de ciudades: **correctas**.
- Prueba visual con navegador headless: **no completada** por restricción de acceso a localhost del entorno. Verificar zoom, selección de sugerencias y servicios en el navegador de Ubuntu.
- Los comercios y servicios dependen de los datos públicos de OpenStreetMap/Overpass y de la conexión a internet. No se inventan ubicaciones cuando no hay resultados.

---


**Actualización:** v07.zip — 2 de noviembre de 2026  
**Entrega:** parche mínimo para restaurar el servicio geográfico faltante.

## v07 — Corrección de importación del mapa

**Incidencia reportada:** Vite no puede cargar `src/components/properties/PropertyMap.tsx` porque importa `../../services/nearbyPlaces` y falta el archivo `src/services/nearbyPlaces.ts` en la carpeta de trabajo.

**Causa:** el servicio fue agregado originalmente en el parche v05; el parche v06 solo cambiaba `PropertyMap.tsx` y `PropertyList.tsx`, por lo que no volvía a incluir esta dependencia. Si v05 no se había aplicado por completo, v06 producía el error reportado.

**Corrección aplicada:** se restaura exclusivamente `src/services/nearbyPlaces.ts`, con las funciones, tipos y constantes que consume el mapa: `getNearbyPlaces`, `formatNearbyDistance`, `nearbyPlaceLink`, `NEARBY_CATEGORY_INFO` y `NEARBY_RADIUS_METERS`. El servicio incluye validación de coordenadas, radio de consulta, categorías de comercios, caché y consulta pública a OpenStreetMap/Overpass solo al seleccionar un inmueble.

### Archivos de esta entrega

- `src/services/nearbyPlaces.ts` — archivo que faltaba.
- `cambio.md` — informe único y consolidado.

### Instalación

Aplicar **en la carpeta exacta** donde ejecutás `npm run dev`, por ejemplo:

```bash
cd "$HOME/Descargas/NdeRogara 1"
unzip -o "$HOME/Descargas/v07.zip"
ls -l src/services/nearbyPlaces.ts
npm run build
npm run check
npm run dev
```

Si `npm run dev` estaba abierto, detenerlo antes con `Ctrl + C`. En el navegador, actualizar con `Ctrl + Shift + R`.

### Pruebas de esta entrega

- Verifiqué que el archivo coincide con el servicio original del parche v05.
- Probé reconstruir la base v01 aplicando v06 y agregando este único archivo: **`npm run build` correcto**.
- `npm run check`: **13 verificaciones satisfactorias**.
- La prueba visual en el navegador del usuario queda pendiente: no tengo acceso al Ubuntu local.

**Alcance:** no modifica estilos, planes, pagos, base de datos ni configuración de Firebase. Restaura la importación que impedía levantar la página. Las consultas a locales cercanos dependen de la conexión a internet y la disponibilidad de OpenStreetMap/Overpass.

---

## Historial consolidado anterior

# cambio

**Actualización:** v06.zip — 2 de noviembre de 2026  
**Instalación:** aplicar sobre v05 en la carpeta existente `cambio`.  
**Entrega:** solo 2 archivos de código y este informe; sin archivos generados ni dependencias.

## v06 — Ampliación del mapa y búsqueda por ciudad

1. **Se corrigió el botón «Ampliar mapa» del catálogo.** Antes se confundía con ocultar el mapa; ahora siempre abre un visor amplio y centrado en la pantalla, con fondo atenuado.
2. **Se corrigió el recorte del mapa ampliado.** Se utiliza un portal de React hacia `document.body` para que no quede oculto dentro del contenedor del buscador o por elementos de la página.
3. **Pantalla ampliada simplificada.** Contiene un mapa grande con zoom de rueda y arrastre, un campo para escribir la ciudad, el botón «Buscar inmuebles» y una X para cerrar. No duplica filtros, paneles de servicios ni bloques de opciones en esa ventana.
4. **Búsqueda conectada al catálogo.** Al buscar Asunción, Ciudad del Este u otra ciudad registrada, actualiza el filtro global, conserva la preferencia de ubicación de la sesión, cierra el visor y lleva al listado de inmuebles. Dejar el campo vacío muestra todas las ciudades y reinicia los demás filtros para mostrar resultados completos.
5. **Validación y navegación.** Si no se reconoce el nombre de la ciudad, se informa sin cerrar la ventana. Desde el mapa de una ficha también se puede buscar y volver al explorador. El visor se cierra con X, clic fuera o tecla Esc.
6. **Conservación de funciones.** El mapa incrustado sigue mostrando propiedades y sus precios, vista de calle externa, marcadores destacados, mapa/satélite y servicios cercanos.

### Archivos modificados

- `src/components/properties/PropertyMap.tsx` — visor centrado, portal, buscador y filtros conectados.
- `src/components/properties/PropertyList.tsx` — botón de ampliación y navegación a resultados.
- `cambio.md` — informe consolidado de las versiones v05 y v06.

### Comprobaciones

- `npm run build`: **correcto**, TypeScript y Vite.
- `npm run check`: **13 comprobaciones correctas**.
- Revisión estática de 8 comportamientos: portal, apertura, dimensión, formulario, filtrado, resultados, zoom y ocultamiento de paneles complementarios: correctos.
- Verificación visual con Chromium: **no disponible**; el entorno impide abrir el servidor local desde el navegador con `ERR_BLOCKED_BY_ADMINISTRATOR`. Probar en Ubuntu después de aplicar.

### Aplicar sobre v05

```bash
cd ~/Descargas/cambio
unzip -o ~/Descargas/v06.zip
npm run build
npm run check
npm run dev
```

Actualizar la web con `Ctrl + Shift + R`.

---

## Historial de v05 (reemplazado por v06 en cuanto a ampliación y navegación)

**Actualización:** v05.zip — 2 de noviembre de 2026  
**Base requerida:** Nde Rogarã v04 ya aplicado (o la carpeta `cambio` con el último parche).  
**Tipo de entrega:** solo archivos modificados; no reinstala ni borra datos.

## v05 — Mapa y buscador inmobiliario

### Cambios funcionales

1. **Mapa rediseñado:** cabecera propia, controles de mapa/satélite, zoom con rueda, controles +/−, desplazamiento con el mouse, botón «Ver todos» y cuadro **Ampliar/Reducir** que utiliza la pantalla disponible sin salir de la web. Esc cierra la ampliación.
2. **Propiedades destacadas:** los avisos con destaque vigente conservan el marcador celeste; los anuncios comunes utilizan marcador oscuro. Cada pin muestra tipo de inmueble, ubicación, precio y acceso al detalle.
3. **Exploración del entorno:** seleccioná un inmueble desde el mapa o el selector superior para consultar comercios y servicios a unos 1,1 km: compras (supermercados, Biggie si existe en los datos), educación, salud, transporte, gastronomía, bancos y parques. Los servicios se identifican con iconos compactos y filtros por categoría.
4. **Datos geográficos públicos:** los puntos de interés provienen de OpenStreetMap mediante Overpass API al seleccionar un inmueble, **sin inventar negocios**. Se usa caché de 15 minutos y se limita la cantidad de resultados a 100 para reducir carga. Si el servicio no responde, se informa el error y se ofrece «Reintentar» sin impedir ver los alquileres.
5. **Detalles y visita de calle:** cada servicio permite consultar su ubicación en OpenStreetMap. El anuncio tiene un enlace opcional a Google Street View (abre Google Maps en otra pestaña, sujeto a cobertura); no se incorpora Street View en un iframe ni se necesita una clave de Google para este enlace.
6. **Explorador mejorado:** cabecera más clara, botones y selector de orden uniformes, vista lista/cuadrícula accesible, filtros móviles mejor distribuidos y botones de cantidad de dormitorios/baños sin texto cortado.
7. **Rendimiento y seguridad:** los puntos de interés se solicitan únicamente para un inmueble seleccionado, con cancelación de consultas anteriores. Se filtran coordenadas inválidas y se usan nombres escapados por React; se mantienen los filtros compartidos con el catálogo.

### Archivos incluidos

- `src/components/properties/PropertyMap.tsx` — navegación, mapa ampliado, puntos de interés y popups.
- `src/components/properties/PropertyList.tsx` — cabecera y controles del explorador.
- `src/components/properties/PropertyFilters.tsx` — ajuste de controles numéricos.
- `src/services/nearbyPlaces.ts` — nuevo servicio OSM con validación, categorización, distancia y caché.
- `src/index.css` — estilos del mapa, marcadores y herramientas.
- `cambio.md` — este informe consolidado.

### Verificaciones

- `npm run build`: correcto (TypeScript y Vite; 1.984 módulos transformados).
- `npm run check`: 13 comprobaciones satisfactorias.
- Pruebas aisladas de Overpass con respuesta simulada: 5 comprobaciones correctas (categorías, radio, coordenadas, caché y validación).
- Servidor local Vite: HTTP 200.
- Navegador automatizado: **pendiente**; el entorno bloquea la navegación a `127.0.0.1` con `ERR_BLOCKED_BY_ADMINISTRATOR`.

### Condiciones de uso y límites

- Las fichas y nombres de servicios cercanos dependen de la cobertura de OpenStreetMap y de que la API Overpass esté disponible. No necesariamente están registrados todos los locales, y la distancia indicada es en línea recta, no una ruta.
- Las capas de calle y satélite requieren internet. Los mapas no tienen la misma cobertura de imágenes y establecimientos que Google Maps.
- La actualización del catálogo/planes/facturas no se modifica; las contrataciones y facturas conservan el carácter de simulación local.
- Las ubicaciones de los anuncios son aproximadas según la ficha del propietario. Street View depende de su cobertura y se abre externamente.

### Instalar sobre v04

```bash
cd ~/Descargas/cambio
unzip -o ~/Descargas/v05.zip
npm run build
npm run check
npm run dev
```

Actualizá la web con `Ctrl + Shift + R`. Conservar `.env`, `node_modules` y la información local; no vienen dentro del parche.

---

## Historial consolidado de entregas anteriores

# Nde Rogarã — Informe de cambios (v04)

## Ajuste de la ventana de políticas del pago

- **Ventana pequeña:** ancho máximo de 360 px y alto máximo de 360 px, adaptable a pantallas pequeñas.
- **Frente al pago:** el diálogo se monta directamente en la capa superior de la página para evitar que el formulario recorte la ventana o la muestre detrás.
- **Contenido por apartados:** el texto deja de mostrarse completo al abrir. Primero aparece un resumen con las secciones cerradas; cada tema se abre al seleccionarlo.
- **Desplazamiento limitado:** si un apartado tiene mucho texto, solo se desplaza el interior; el título, la X y el botón **«Volver al pago»** permanecen visibles.
- **Conservación del formulario:** cerrar las políticas mantiene los campos, selección de método y estado del formulario intactos.
- **Sin modificar los pagos:** se mantienen las funciones de los planes, tarjeta, QR, facturas y aceptación de condiciones.
- **Código mantenible:** la página de políticas y la ventana compacta comparten una fuente única de contenidos.

## Archivos incluidos

1. `src/components/plans/PlansPage.tsx` — corrige el diálogo y su posición.
2. `src/components/policy/PublicationPolicy.tsx` — presenta secciones desplegables y conserva la página completa.
3. `cambio.md` — este informe.

## Instalación sobre v03

En la carpeta raíz del proyecto (`~/Descargas/cambio`):

```bash
unzip -o ~/Descargas/v04.zip
npm run dev
```

Actualizá la página con **Ctrl + Shift + R**.

## Verificaciones

- Sintaxis TSX de ambos archivos: correcta, verificada con el analizador de TypeScript.
- Integridad del ZIP: comprobada.
- **Pendiente:** compilación integral y prueba visual en navegador. La instalación de dependencias con npm no se completó en el entorno de revisión; ejecutá `npm ci && npm run build` en Ubuntu para verificarlas.

Los cambios de v01 a v03 permanecen en el resto del proyecto; esta entrega es únicamente un parche.

---

## v11 — Corrección de pantalla de error y administración del sitio

### Problema resuelto
- Se incluye expresamente `src/services/locationPreference.ts` con la función exportada `suggestParaguayCities(text, limit): string[]` que requieren `PropertyMap.tsx` y `PublishModal.tsx` (soluciona TS2305 y los errores de tipado derivados). Este archivo se entrega aunque coincida con versiones anteriores, porque faltaba en la instalación reportada.
- Se corrigió una importación inexistente de `Instagram` desde `lucide-react` en `ProfileView.tsx`, que también impedía compilar.
- Se separaron las actualizaciones de React del perfil, usuario y publicaciones para evitar actualizaciones anidadas; se agregó contención de errores para el mapa del formulario de publicación.

### Perfil, contactos y apariencia
- Perfil editable con foto o logo comprimido, nombre, ciudad opcional, correo de consultas, WhatsApp principal obligatorio y un segundo contacto opcional con su responsable.
- Redes opcionales: Instagram, Facebook, TikTok, YouTube y sitio web. Al crear un aviso se cargan los datos del perfil, y pueden editarse de forma independiente para cada publicación.
- Ficha pública con contactos, segundo WhatsApp, correo y enlaces sociales válidos. Los datos personales no configurados no se muestran.
- Interruptor claro/oscuro en la barra junto a Publicar. La preferencia se guarda localmente y se aplica antes de iniciar la interfaz.

### Administración
- Nueva sección **Sitio y soporte**: módulos de texto, enlace, WhatsApp, línea telefónica, correo, redes sociales e imagen/logo; ubicación en columnas y cambio de orden mediante flechas. El pie de página se actualiza al guardar.
- Propietarios: suspensión, reactivación y eliminación local de la cuenta con sus anuncios, documentos y planes asociados, mediante confirmación con motivo.
- Avisos: retirada y eliminación local definitiva con confirmación y registro de moderación.
- Las funciones de administrador y la edición del pie de página están restringidas por la interfaz de demostración al rol `admin`. Para una web pública y varios usuarios **faltan permisos verificados por backend**.

### Alcance de los cambios
Sólo se reemplazan los archivos incluidos en `v11.zip` y se agrega `cambio.md`. No se eliminan datos de `localStorage`, `.env` ni proyectos originales. **La eliminación real de usuarios en Firebase y la publicación del contenido en todos los navegadores NO están implementadas**; son operaciones locales de demostración.

### Verificación
- `npm run build`: correcto (TypeScript + Vite).
- `npm run check`: 16 comprobaciones correctas.
- La prueba de interacción en navegador dentro de este entorno fue bloqueada por la política de acceso a localhost. Comprobar visualmente en Ubuntu el perfil, el formulario de publicación, el panel, las eliminaciones y los dos temas antes de publicar la web.

### Instalación (después de v10)
```bash
cd "$HOME/Descargas/NdeRogara 1"
unzip -o "$HOME/Descargas/v11.zip"
npm run build
npm run check
npm run dev
```
Refrescar con `Ctrl + Shift + R`. Si aparece otro error de ejecución, abrir F12 → Consola y copiar la primera línea roja completa junto con el archivo y la línea indicados.


---

## v12 — Reparación de publicación, perfil, contactos y estabilidad

### Problemas atendidos
- El ZIP de base (`NdeRogara 1.zip`) todavía traía el perfil antiguo. Se incluyen de nuevo los cambios necesarios de v11 para evitar depender de que se haya instalado un parche previo.
- El formulario de publicación rechazaba toda fotografía sin token de Firebase y sin un endpoint de moderación. **En desarrollo local** se permiten imágenes JPG/PNG/WebP válidas comprimidas a una copia sin metadatos, pero el aviso queda **pendiente y oculto** hasta revisión del administrador. NO se afirma que las imágenes hayan sido moderadas automáticamente. Para producción sigue siendo obligatorio activar el servicio de moderación y almacenar archivos en un backend.
- Errores al cargar un módulo ya no deberían sustituir toda la aplicación: Publicar, Perfil y otras pantallas disponen de manejo aislado de errores. En `npm run dev` se muestra el mensaje técnico para facilitar el diagnóstico.
- El almacenamiento local puede agotarse: al crear o editar publicaciones se verifica la escritura antes de mostrar éxito; si falla, el formulario conserva los datos y muestra un mensaje de espacio insuficiente.

### Perfil y contactos
- Foto o logo editable, nombre, ciudad opcional, correo de consultas, redes sociales y sitio web.
- WhatsApp principal obligatorio; nombre de quien atiende por WhatsApp 1, WhatsApp adicional y nombre de la segunda persona opcionales.
- Contactos y redes del perfil se precargan al publicar. El correo de consultas se rellena desde el perfil o, si aún no existe, desde el correo de cuenta para que el propietario pueda editarlo antes de publicar.
- En las fichas se presenta quién atiende cada WhatsApp y los enlaces sociales habilitados por plan.
- Sin campo de dirección en el perfil; la dirección específica se solicita solo para el inmueble.

### Apariencia
- El interruptor claro/oscuro aparece en la barra de navegación, junto a Publicar en escritorio y junto al menú en móvil.
- La preferencia se conserva en el almacenamiento local del navegador y se aplica a todas las vistas y modales que usan los estilos compartidos. No se sincroniza entre dispositivos.

### Aplicación
1. Respaldar la carpeta original y el archivo `.env` si existe.
2. Extraer `v12.zip` en la **raíz del proyecto**, con sobrescritura de archivos. **No** eliminar `node_modules`, `.env` ni el almacenamiento del navegador.
3. Ejecutar `npm run build`, `npm run check` y `npm run dev`.
4. Actualizar el navegador con `Ctrl + Shift + R`.

### Verificaciones
- `npm run build`: correcto (TypeScript + Vite).
- `npm run check`: 16 comprobaciones correctas.
- Los archivos relativos y el ZIP se comprobaron sobre una instalación limpia derivada del ZIP original.
- Prueba visual automatizada no completada por restricciones del navegador de pruebas; verificar clics en Ubuntu.

### Limitaciones explícitas
- Datos, usuarios, medios y ajustes almacenados localmente no se sincronizan en diferentes equipos.
- El modo de desarrollo permite preparar un anuncio para revisión, **no valida el contenido** de fotos o videos por IA ni sustituye la revisión manual.
- El control de permisos de administrador y propietario debe ejecutarse en el servidor para ser seguro en una web pública.
- La cuenta de administración de desarrollo y los pagos simulados no son adecuados para producción.

---

## v15 — Comprobante de suscripción y preparación de GitHub (9 de noviembre de 2026)

**Alcance:** presentación profesional del comprobante de contratación simulada y limpieza de la distribución del proyecto.

- `src/services/invoices.ts`: rediseño de la vista imprimible A4 inspirado en la distribución del comprobante aportado (emisor, referencia, comprador, detalle, totales e IVA referencial); documento de muestra explícitamente sin validez tributaria; evita CDC y QR fiscal inventados; previene duplicidad por referencia de pago.
- `src/services/billing.ts`: datos predeterminados ficticios de timbrado `12345678` y RUC `87654321-0`, editables por el administrador en el borrador del emisor.
- `src/services/mailQueue.ts` y `src/components/plans/PlansPage.tsx`: el borrador de correo de confirmación ahora incorpora la referencia del comprobante. El envío directo y el adjunto PDF aún requieren integración y permisos del backend SMTP.
- `src/components/auth/AuthModal.tsx` y `vite.config.ts`: se eliminó la comparación de contraseñas de demostración incrustadas en el frontend. Se comprueban en un endpoint **solo de Vite DEV para localhost**, leyendo claves privadas de `.env.local` sin exponerlas en el bundle de producción.
- `src/data/mockData.ts`: se retiraron contraseñas antiguas de perfiles ilustrativos.
- `.gitignore`: exclusiones adicionales de certificados, claves, copias de seguridad y datos privados.
- `configurar-demo-local.sh`: configuración privada de las cuentas de presentación.
- `publicar_github_seguro.sh`: inspección de archivos preparados y envío explícito a GitHub sin forzar historiales.
- `README.md` e `INSTALAR.md`: instrucciones actualizadas para la presentación y publicación segura.

**Validaciones:** TypeScript y Vite compilan; 16 verificaciones de lógica y 7 de avisos/correo pasan; autenticación de muestra probada localmente (admin/inmobiliaria aceptados, contraseña incorrecta rechazada); factura generada en A4 y revisada visualmente; HTML del comprador escapa etiquetas. La entrega Git excluye `node_modules`, `dist`, `.env.local` y archivos temporales.

**Limitaciones:** pagos, RUC y timbrado de demostración; no hay emisión fiscal SIFEN ni correo automático con PDF adjunto. Las cuentas de desarrollo no reemplazan un sistema de permisos y autenticación de servidor.
