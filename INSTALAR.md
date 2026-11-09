# Nde Rogarã — Instalación y presentación

## 1. Iniciar el sistema

Requiere Node.js 20 o superior, npm y Ubuntu, Windows o macOS.

```bash
npm ci
npm run build
npm run check
bash configurar-demo-local.sh
npm run dev
```

Abrí **http://localhost:5173/**. Las cuentas de muestra funcionan exclusivamente en desarrollo local, no en producción ni a través de una IP de red.

## 2. Cuentas de demostración

| Perfil | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@admin.com.py` | Elegida en `configurar-demo-local.sh` |
| Inmobiliaria / Propietario | `016.jmma@gmail.com` | Elegida en `configurar-demo-local.sh` |

Las contraseñas se almacenan en `.env.local`, archivo **excluido de Git**. No agregues allí contraseñas personales o bancarias reales.

## 3. Probar el comprobante

1. Ingresá con la cuenta inmobiliaria desde localhost.
2. Entrá a **Planes**, elegí el plan y completá el proceso de pago de muestra por tarjeta o QR.
3. Después de confirmar la operación local, seleccioná **Ver comprobante**.
4. En la ventana abierta, usá **Imprimir / Guardar como PDF**.
5. Desde **Administración → Facturas**, el administrador también puede consultar las constancias registradas en el mismo navegador.

El documento utiliza timbrado `12345678`, RUC `87654321-0` y numeración estilo factura **solo para presentación**. No constituye documento tributario electrónico, KuDE ni cargo bancario real. Las cifras de IVA son referenciales.

## 4. Avisos por correo

Las contrataciones generan **borradores locales de correo** en el Centro de correo administrativo. Para enviar realmente se requiere backend SMTP con credenciales privadas, autenticación administrativa Firebase y confirmación del servidor. El envío automático de PDF a destinatarios no está activo en este entorno local.

## 5. Publicar en GitHub

El repositorio de destino es `https://github.com/JMontiel016/Nde-Rogara.git`.

```bash
bash publicar_github_seguro.sh --revisar
bash publicar_github_seguro.sh --subir
```

Revisá previamente `git diff --cached --name-only` y asegurate de haber iniciado sesión en GitHub con credenciales de Git seguras (credential manager o SSH). El script **no hace force push**, no sube `.env.local` ni dependencias, y se detiene ante archivos privados comunes. Una auditoría de seguridad completa sigue siendo necesaria antes de publicar el sistema en internet.
