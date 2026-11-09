# cambio — Subida de fotos y videos para publicaciones

## Problema detectado
- La subida de fotografías en la versión publicada dependía de una variable `VITE_PHOTO_MODERATION_URL` sin un servicio activo; por ello rechazaba los archivos.
- La subida de videos guardaba los archivos en IndexedDB del navegador, no en almacenamiento accesible desde otros dispositivos.
- No había un límite de duración de los videos; las imágenes de más de 8 MB se rechazaban.
- Los avisos con imágenes o videos siguen sujetos a revisión visual de contenido antes de hacerse públicos.

## Corrección aplicada
- Los archivos se envían **directamente a Firebase Storage** desde el navegador autenticado. No pasan por funciones Vercel ni localStorage.
- Se permiten imágenes JPG, PNG, WebP de hasta **50 MB por archivo**.
- Se permiten videos MP4, WebM y MOV de hasta **100 MB**, con duración real máxima **40 segundos** comprobada antes de subir.
- Progreso de carga, alerta visible en caso de error, miniaturas, apertura de imagen ampliada, galería de reproducción y opción **Quitar/Eliminar**.
- Al eliminar se intenta retirar el archivo de Firebase Storage con autorización de propietario.
- Los archivos existentes guardados solo en IndexedDB aún pueden reproducirse en el navegador de origen.
- La cuenta autenticada tiene carpeta propia en `property-media/<uid>/`, con reglas de acceso en `storage.rules`.

## Paso esencial de configuración
El despliegue de Vercel **NO publica reglas de Firebase Storage**. Se necesita tener Storage habilitado en el proyecto Firebase y publicar reglas seguras para las carpetas de la aplicación.

Desde la raíz del repositorio, usando Firebase CLI autenticada:
```bash
npx firebase-tools login
npx firebase-tools deploy --only storage --project nde-rogara
```
Este comando reemplaza las reglas de Storage anteriores por `storage.rules`; revisar antes si el proyecto tiene reglas o rutas adicionales.

## Límites actuales
- Las fotos y videos se almacenan en Firebase, pero los **datos de publicaciones siguen guardándose localmente** en el navegador. Para compartir el catálogo completo entre propietarios y visitantes de distintas máquinas hay que migrar el almacenamiento de publicaciones a una base común.
- Subida exitosa NO significa aprobación visual del contenido. Los avisos con multimedia continúan pendientes de revisión en Administración.
- El límite de duración de video se comprueba en el navegador; para enforcement independiente de clientes maliciosos se necesitaría un proceso de análisis multimedia del lado del servidor.
- No hay confirmación de cargas reales en Firebase hasta habilitar Storage, reglas y probar con archivos.
