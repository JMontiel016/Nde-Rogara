# cambio — Mapa de inicio, usuarios Firebase y revisión de anuncios

## Incidencias
1. El mapa de Inicio aparecía como un rectángulo gris: faltaban los estilos base de Leaflet y el alto del contenedor dependía de un flexbox de tamaño variable.
2. La lista administrativa de propietarios consultaba el estado local del navegador, por lo que no mostraba las cuentas registradas desde otros dispositivos.
3. Aprobar un anuncio exigía escribir repetidamente un motivo de más de 12 caracteres, sin vista conjunta de las fotografías y videos, y el historial ofrecía solo enlaces para preparar correos manuales.

## Correcciones
- `src/main.tsx`: importación de `leaflet/dist/leaflet.css`.
- `src/components/home/HomeMapLocationPicker.tsx`: altura estable para el contenedor, recalcular tamaño y URL de teselas de OpenStreetMap.
- `api/admin/users.js`: nueva consulta protegida por Firebase ID token y `admin:true`; lista cuentas reales creadas en Firebase, roles, estado y último acceso. No expone contraseñas/tokens.
- `src/components/admin/AdminPanel.tsx`:
  - «Usuarios y propietarios»: tabla independiente con usuarios de Firebase, incluso si nunca publicaron, búsqueda y actualizar.
  - «Moderación»: solicitudes antiguas primero, fecha de solicitud, miniaturas y reproductor para revisar la multimedia antes de aprobar.
  - «Aprobar ahora»: el motivo estándar se precarga, se mantiene confirmación y control humano.
  - Tras una aprobación o retirada se usa el endpoint SMTP de administración para enviar un aviso al correo del propietario. Si SMTP falla, el panel indica el error; no se dice «enviado» sin respuesta de aceptación.

## Limitaciones IMPORTANTES
- **Las publicaciones y aprobaciones de avisos todavía se guardan localmente en el navegador, no en una base central compartida**. Un administrador de otro dispositivo no verá esos avisos todavía aunque sí verá las cuentas reales de Firebase.
- **Los archivos guardados en modo local tampoco se comparten entre navegadores**. No se puede certificar una imagen/video que el revisor no puede abrir.
- La notificación local se registra en el mismo navegador y el envío SMTP se solicita cuando el administrador realiza la acción y tiene una sesión válida. «Aceptado por SMTP» no equivale a lectura por destinatario.
- La revisión visual del contenido prohibido sigue siendo manual. El programa no tiene todavía un servicio de clasificación de imágenes y videos conectado.
- La compilación debe validarse en el despliegue de Vercel y se requiere probar el mapa y el correo desde un navegador real.
