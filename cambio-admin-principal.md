# cambio — Administrador principal

## Identidad administrativa
- Correo administrador principal: `016.jmma@gmail.com`.
- Método de acceso: Google (el proveedor ya registrado en Firebase Authentication).
- La cuenta antigua `admin@admin.com.py` deja de ser la cuenta administrativa objetivo.
- No se fijan ni cambian contraseñas, no se crean cuentas desde el navegador.

## Archivos ajustados
- `backend/asignar-admin-existente.mjs`: ahora concede `admin: true` a la cuenta de Google existente `016.jmma@gmail.com` y revoca el permiso anterior a `admin@admin.com.py` si todavía existe.
- `backend/provisionar-usuarios.mjs`: desactivado para evitar que vuelva a otorgar el rol al correo anterior o agregue una contraseña al usuario Google.

## Activación real en Firebase (pendiente)
GitHub/Vercel despliegan el frontend, pero no ejecutan automáticamente scripts privados de Firebase Admin. Desde una máquina administrativa, con una **clave de servicio nueva** y segura:
```bash
cd backend
npm install
export GOOGLE_APPLICATION_CREDENTIALS="/ruta/privada/clave-nueva.json"
node asignar-admin-existente.mjs
```
La clave anteriormente compartida debe revocarse y no debe utilizarse para producción. **Nunca subir JSON de Firebase Admin, .env o claves al repositorio.**

Una vez ejecutado, cerrar sesión en la web, volver a abrir `https://nde-rogara.vercel.app` y usar **Continuar con Google** con `016.jmma@gmail.com`. Firebase emitirá un nuevo token con `admin: true` y aparecerá la opción Administración.

## Límite
El cambio de código ya está disponible en GitHub, pero hasta ejecutar el script con acceso autorizado no se ha modificado la cuenta real en Firebase.
