# ALUSORA Flowers · Migración completa a Cloudflare Workers

## Estado de la entrega

Proyecto preparado para desplegar en **Cloudflare Workers**: archivos estáticos originales de la tienda, Worker JavaScript para la API, base de datos **Cloudflare D1**, notificaciones mediante **Resend** desde el Worker y panel de administración para solicitudes, pedidos e inventario. **No requiere Python ni servidor externo para la web o su base de datos.** Resend es el proveedor de correo externo; también puede sustituirse posteriormente por Cloudflare Email Service.

**No está desplegado todavía en tu cuenta.** Debes crear la base D1, configurar secretos de correo y publicar el Worker. Los correos se han simulado en pruebas automáticas; no se ha verificado recepción real en Gmail.

La versión mantiene la estructura visual existente de `web/index.html`, `web/styles.css` y `web/app.js`, con la sección “Flowers for every moment” ya eliminada. Se incluyen las ilustraciones SVG botánicas reproducidas en el estilo original porque los SVG originales no estaban en los archivos adjuntos. Si tienes la carpeta `web/assets` original, puedes copiarla sobre la incluida **sin modificar HTML/CSS/JS** para conservar también las imágenes exactas.

## 1) Antes de empezar

- Tener acceso a la **misma cuenta Cloudflare** que usa `alusora-flowers.orrisdataai.workers.dev`.
- Tener **Node.js 20 o posterior** instalado y acceso a terminal (Windows PowerShell funciona).
- Tener acceso al dominio del remitente para verificarlo en **Resend**. La dirección de destino `arron.cursos@gmail.com` no puede utilizarse automáticamente como remitente sin autorización del proveedor.
- Tener permisos para crear base de datos Cloudflare D1 y secretos del Worker.
- Guardar copia del código actual y de cualquier inventario o pedido existente. **La migración crea D1 nueva; NO importa automáticamente pedidos existentes del archivo SQLite**.

## 2) Instalar y entrar a Cloudflare

En la carpeta extraída que contiene `wrangler.jsonc`:

```powershell
npm install
npx wrangler login
```

Si estás usando GitHub, coloca **todos los archivos de esta carpeta** en la **raíz efectiva del proyecto que despliega Cloudflare** (o configura el directorio raíz de build de Cloudflare para que apunte exactamente a esta carpeta). Evita mantener dos proyectos publicándose sobre el mismo Worker.

## 3) Crear Cloudflare D1

```powershell
npx wrangler d1 create alusora-flowers-db
```

Cloudflare mostrará un UUID (`database_id`). Abre `wrangler.jsonc` y sustituye `REPLACE_WITH_D1_DATABASE_ID` por ese UUID. **No uses un UUID inventado.** Si ya existe una base D1 apropiada, utiliza su ID real y verifica el esquema antes de migrar.

Crear tablas y stock inicial **solo una vez**:

```powershell
npx wrangler d1 migrations apply alusora-flowers-db --local
npx wrangler d1 migrations apply alusora-flowers-db --remote
```

`--local` es para desarrollar; `--remote` inicializa la base que utilizará el sitio real. El script de migración agrega inventario de **demostración**. Ajusta los valores con tu inventario real antes de aceptar pedidos.

## 4) Configurar email real

1. Crea una cuenta en Resend y **verifica un dominio de envío que controles**, siguiendo los pasos de SPF/DKIM indicados por Resend.
2. Crea una API key de Resend con permiso de envío.
3. Configura estos secretos con los siguientes comandos (la terminal te pedirá el valor; **no escribas valores secretos dentro de un commit ni en capturas**):

```powershell
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ALUSORA_EMAIL_FROM
npx wrangler secret put ALUSORA_ADMIN_TOKEN
```

- `RESEND_API_KEY`: clave secreta de Resend (`re_...`).
- `ALUSORA_EMAIL_FROM`: remitente verificado, por ejemplo `ALUSORA Flowers <orders@TU-DOMINIO-VERIFICADO.COM>`.
- `ALUSORA_ADMIN_TOKEN`: una cadena aleatoria larga y secreta para entrar a `/admin.html`.
- `ALUSORA_NOTIFICATION_EMAIL=arron.cursos@gmail.com`: **ya viene configurado** en `wrangler.jsonc`.

> La identidad `arron.cursos@gmail.com` es el **destinatario**. No necesitas contraseña de Gmail: el envío sale del dominio verificado por Resend. El email del cliente se agrega como **Reply-To**.

Para probar localmente el correo, copia `.dev.vars.example` a `.dev.vars` y rellena las tres variables **solo en tu equipo**; `.dev.vars` está en `.gitignore`.

## 5) Publicar el mismo Worker que usa tu URL

```powershell
npx wrangler deploy
```

**Importante:** la configuración `"name":"alusora-flowers"` debe ejecutarse bajo la cuenta Cloudflare del subdominio `orrisdataai.workers.dev`. Revisa el enlace exacto que Wrangler muestra al terminar. Si publica bajo otra cuenta/subdominio, no reemplazará tu página actual.

Si publicas con GitHub → Cloudflare Builds, comprueba que la raíz del proyecto sea donde está `wrangler.jsonc`, que el **Build command** instale dependencias y que el **Deploy command** ejecute `npx wrangler deploy`. Retira o desactiva cualquier workflow anterior que despliegue únicamente archivos estáticos y sobrescriba este Worker. **No subas `.dev.vars`** al repositorio.

## 6) Pruebas después de publicar

Abre en el navegador:

`https://alusora-flowers.orrisdataai.workers.dev/api/health`

La respuesta esperada es HTTP 200:

```json
{"status":"ok","backend":"cloudflare-worker","database":"ready","version":"cloudflare-2026-11-03"}
```

Si sale **404**, sigues accediendo al despliegue anterior o al Worker equivocado. Si sale **503**, faltan el binding DB o las migraciones. Si sale **200**, continúa con ambos formularios:

1. En **Request your event quote**, llena solo nombre, email, teléfono y fecha futura. Debe guardar en D1, devolver HTTP 201 y enviar un email.
2. En **Picked by You**, selecciona al menos 3 tallos y una fecha posterior a hoy. Debe guardar la selección, fecha y datos de contacto; no descuenta inventario.
3. Abre Chrome DevTools → Network → petición `/api/events` o `/api/custom-request`. Comprueba `notification_sent`.
4. Comprueba bandeja principal y spam de `arron.cursos@gmail.com`; revisar también Resend → Logs si el servicio aceptó el envío.
5. Abre `/admin.html` y usa el token privado para ver los registros.

**Semántica de `notification_sent`:**
- `true`: Resend aceptó la solicitud de envío (no garantiza entrega final en el buzón).
- `false`: la solicitud **quedó guardada** en D1 pero el servicio de correo no confirmó su aceptación. El frontend muestra un mensaje informativo en lugar de afirmar que se envió.

## 7) Pruebas de desarrollo

```powershell
npm test
npm run dev
```

`npm test` usa el runner integrado en Node 22 y una simulación D1 respaldada por SQLite para verificar validaciones, mensajes, stock, cotizaciones y pedidos. La prueba de email se hace con un `fetch()` simulado; no realiza envíos reales. `npm run dev` inicia Wrangler con D1 local (aplicar migraciones locales primero).

## 8) Endpoints disponibles

| Ruta | Función |
|---|---|
| `GET /api/health` | Verificar Worker y conexión D1 |
| `GET /api/catalog` | Flores, stock y catálogo original para selección |
| `POST /api/events` | Cotización de evento (nombre, email, teléfono y fecha requeridos) |
| `POST /api/custom-request` | Solicitud de ramo personalizado (fecha a partir de mañana) |
| `POST /api/orders` | Pedidos del carrito existente, con reserva transaccional |
| `GET /api/admin/overview` | Inventario, solicitudes y pedidos (token Bearer) |
| `POST /api/admin/stock` | Ajustar inventario (token Bearer) |
| `POST /api/admin/{order-status,quote-status,custom-status}` | Estados (token Bearer) |

El formulario guarda y envía el email **al mismo destino** (`arron.cursos@gmail.com`) e incluye detalles del ramo o evento. La fecha se valida del lado del navegador y **del servidor** usando el huso horario `America/Toronto`.

## 9) Antes de producción comercial

- Habilitar protección antispam con **Cloudflare Turnstile** y/o una regla WAF de *rate limiting* para rutas POST `/api/events`, `/api/custom-request`, `/api/orders`. El campo oculto anti-bot del formulario no sustituye protección profesional.
- Tener una política de privacidad y retención de datos de clientes; habilitar respaldos y permisos para D1.
- Si ya hay pedidos/inventario en SQLite, planear una importación controlada antes de utilizar D1 en operaciones reales. El script incluido no los recupera.
- Verificar tarifas, inventario, logística y que la tienda esté efectivamente habilitada para recoger/entregar.
- Para auditar correos, revisar Resend logs, bounces y spam. No confundir `notification_sent:true` con recepción en Gmail.

**Documentación oficial**: https://developers.cloudflare.com/workers/static-assets/binding/ · https://developers.cloudflare.com/d1/reference/migrations/ · https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/
