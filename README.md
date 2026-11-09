# Nde Rogarã

Sitio web de avisos de alquiler de inmuebles, con búsqueda geográfica, planes de publicación, panel de propietarios, pagos y facturas de demostración, y administración local.

## Ejecutar en Ubuntu

Requiere **Node.js 20 o superior** y npm. Desde esta carpeta:

```bash
npm ci
npm run check
npm run dev
```

Abrí **http://localhost:5173**. Si el puerto está ocupado, cerrá la instancia anterior antes de iniciar otra. Para preparar una versión de producción: `npm run build` (la compilación queda en `dist/`).

Si el navegador sigue mostrando una versión anterior, utilizá **Ctrl + Shift + R** y verificá que estás en la carpeta nueva.

## Acceso de demostración solo en localhost

Solamente durante `npm run dev` desde `localhost` o `127.0.0.1`, en el formulario **Ingresar**:

- Correo: `admin@admin.com.py`
- Contraseña: la que configuraste en `.env.local` mediante `bash configurar-demo-local.sh` (no se publica en GitHub).

**También existe la cuenta inmobiliaria local `016.jmma@gmail.com`. Sus claves se configuran de forma privada ejecutando `bash configurar-demo-local.sh`.** Ninguna cuenta de demostración gestiona Firebase ni autoriza un despliegue público. No publiqués la demostración con estas credenciales como sistema administrativo.

## Datos y funcionamiento

- Los avisos de ejemplo se incluyen con el proyecto. Los registros de propietarios, pagos, planes y comprobantes de demostración se conservan localmente en el navegador.
- Los pagos con tarjeta o QR y sus facturas son **simulaciones**, sin débito ni emisión tributaria ante SIFEN.
- El módulo opcional `backend/` requiere un servicio externo para verificar realmente fotografías. Sin ese servicio, el bloqueo preventivo impide dar por verificadas imágenes nuevas.
- No se incluye `.env` por seguridad. Si utilizabas Firebase, copiá **tu propio** `.env` o `.env.local` desde tu instalación anterior, de forma privada, sin compartirlo ni subirlo al repositorio.

## Documentación de esta entrega

Todo el detalle de los cambios, los archivos retirados, las pruebas realizadas y los límites conocidos está en **`cambio.md`**.


### Confirmación QR de contratación

El QR descargable enlaza a una pantalla de confirmación en el servidor local. Para escanearlo desde el teléfono, iniciá `npm run dev`, usá el host **Network** que muestra Vite en el campo «Dirección de acceso desde el celular», y mantené los dispositivos conectados a la misma red. No se realiza débito bancario.

Ver `cambio.md` para el registro consolidado de cambios y validaciones.

## Comprobante de contratación

Después de completar una contratación simulada, el botón «Ver comprobante» abre un documento A4 imprimible. El comprobante presenta la operación y los datos del comprador. Los valores de timbrado `12345678` y RUC `87654321-0` son exclusivamente ficticios. **No es una factura electrónica, KuDE ni una acreditación bancaria**.

El sistema prepara un aviso por correo tras el pago simulado, pero el envío efectivo depende del backend SMTP autorizado; no se informa como enviado sin confirmación del servidor.

## Publicación segura en GitHub

No subas `.env`, `.env.local`, credenciales privadas, archivos de clientes ni compilaciones. Comprobá el contenido con `bash publicar_github_seguro.sh --revisar` antes de ejecutar `bash publicar_github_seguro.sh --subir`. La cuenta GitHub conectada debe estar autenticada en tu terminal.
