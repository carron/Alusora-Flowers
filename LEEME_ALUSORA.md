# ALUSORA Flowers — Balloons & Event Styling

**Nueva versión en inglés, enfocada en decoración con globos para eventos en London, Ontario.**

La marca sigue siendo **ALUSORA Flowers**; la nueva portada prioriza **balloon décor**, arcos, guirnaldas orgánicas, photo backdrops y eventos. La sección **Picked by You** de flores se conserva como servicio secundario, con el inventario de D1 y panel administrativo ya existentes.

## Qué incluye

- Página principal actualizada en inglés para **arreglos y decoración con globos**.
- Seis opciones de cotización: **Little Pop**, **Organic Garland**, **Celebration Arch**, **The Statement Moment**, **Balloon & Bloom**, **Corporate Pop**.
- Imágenes **SVG originales** de globos realizadas específicamente para el proyecto; son **ilustraciones conceptuales**, no fotografías de eventos realizados.
- Formularios funcionando con el endpoint existente `/api/request-event`: nombre, correo, teléfono opcional, fecha, invitados, local o zona, interior/exterior, rango de presupuesto, colores y comentarios.
- Las solicitudes **siguen llegando a `CONTACT_EMAIL` mediante el secreto `RESEND_API_KEY`**, que debes tener ya configurado en Cloudflare. La plantilla incluida apunta a `alusoraflowers@gmail.com`.
- El formulario desaparece al confirmar que la API de Resend **aceptó** el envío y muestra un mensaje de agradecimiento. Esto no garantiza la recepción final en Gmail: revisa el estado en Resend.
- Se conservan **Picked by You, `admin.html`, el inventario de flores, las solicitudes y D1**.
- Metadatos SEO ajustados a balloon décor en London, ON, y archivos `sitemap.xml` y `robots.txt`.

## Decisión deliberada sobre precios

**No hemos atribuido los antiguos precios de los paquetes florales a los nuevos paquetes con globos.** Las nuevas opciones muestran **Custom Quote**. Los costos reales dependen de tamaño, modelo, montaje, transporte, equipo, accesorios y lugar del evento. El backend guarda `subtotal_cents = NULL` para una solicitud de diseño de globos sin precio fijo.

## ¡Importante! Actualizar un sitio que YA está publicado

**NO sustituyas tu `wrangler.jsonc` de producción por el de este ZIP sin revisarlo.** El ZIP parte del código inicial y conserva la marca `REPLACE_WITH_YOUR_D1_DATABASE_ID`, porque no tenemos el UUID de tu base de datos real. Si lo publicas tal cual, reaparecerá el error `binding DB ... database_id [code: 10021]`.

**Ruta recomendada, para conservar tu configuración de Cloudflare, D1, Resend y el panel administrativo:**

1. Haz una copia de seguridad de la carpeta del proyecto que actualmente despliegas en Cloudflare.
2. Descomprime `ALUSORA_Balloons_ACTUALIZACION.zip` **encima de esa misma carpeta**, manteniendo las subcarpetas `public/` y `src/`. Este paquete contiene **solo los archivos modificados** y no toca `wrangler.jsonc`, migraciones o el panel administrativo.
3. Si has modificado el HTML en vivo desde que entregamos el proyecto original (p. ej. favicon, SEO o accesibilidad), compara los archivos antes de sustituirlos: `public/index.html` se reemplaza completo. `public/assets/favicon.svg` **no** se toca.
4. Comprueba que tu `wrangler.jsonc` existente tiene un UUID válido en `database_id`, `binding: "DB"`, `CONTACT_EMAIL: "alusoraflowers@gmail.com"` y el `FROM_EMAIL` verificado con Resend.
5. Dentro de la carpeta, ejecuta:

   ```bash
   npm install
   npm test
   npm run deploy
   ```

   Si publicas desde GitHub, sube estos mismos cambios a la rama que Cloudflare despliega y verifica que el build terminó.

6. Antes de anunciar el cambio, prueba en la URL `*.workers.dev` (si está disponible): que los botones **Request a quote** seleccionen el paquete correcto, el formulario envíe y el correo llegue a `alusoraflowers@gmail.com`.
7. En Cloudflare, comprueba **Settings → Bindings** (`DB` enlazada a `alusora-flowers-db`) y **Settings → Variables and Secrets** (`RESEND_API_KEY` como secreto).

**No necesitas crear otra base de datos ni ejecutar migraciones:** la estructura existente de D1 admite las solicitudes de globos sin cambios de esquema.

## Nuevo proyecto desde cero (alternativa)

`ALUSORA_Balloons_Cloudflare_COMPLETO.zip` contiene el proyecto completo, pero **antes de desplegar debes poner tu UUID real en `wrangler.jsonc`**. También debes registrar los secretos de producción (`RESEND_API_KEY`, `ADMIN_PASSWORD`, `SESSION_SECRET`) y configurar los permisos de Resend y el binding DB. **No ejecutes** `npx wrangler d1 create` si ya tienes una base `alusora-flowers-db`.

## Archivos modificados para la actualización

- `public/index.html` — texto, catálogo, formulario y SEO.
- `public/style.css` — nueva paleta, estilos de tarjetas, hero y formularios.
- `public/assets/hero-balloons.svg`, `little-pop.svg`, `organic-garland.svg`, `balloon-arch.svg`, `statement-backdrop.svg`, `balloon-and-bloom.svg`, `corporate-decor.svg` — gráficos originales.
- `src/index.js` — seis nuevos identificadores de paquetes, manejo de cotización sin precio, campos de presupuesto/venue en la notificación.
- `public/sitemap.xml`, `public/robots.txt` — SEO técnico.
- `tests/` — pruebas unitarias y de envío simulado.

**La sección `Picked by You` usa el inventario de flores original.** El panel administrativo no incluye inventario ni precios por globo: los servicios de globos se ofrecen mediante solicitud de cotización. Si más adelante deseas vender globos por unidad con inventario, se necesitará otro desarrollo.

## Datos por comprobar antes de publicar

- **Nombre público:** se mantiene ALUSORA Flowers con el descriptor “Events”. Si el nombre registrado en Google Business Profile sigue siendo ALUSORA Flowers, no lo cambies sólo por este diseño.
- **Disponibilidad:** no anuncies entregas, instalación, estructuras o props como incluidos sin confirmar inventario y capacidad.
- **Imágenes:** las ilustraciones muestran un concepto estilístico, no prueba de trabajos realizados.
- **Precio:** no se publican precios fijos hasta calcular materiales, montaje, transporte y margen.

## Pruebas

Ejecuta `npm test` en Node.js. Incluye una prueba que envía una solicitud ficticia a una instancia simulada de Resend (sin usar tu API Key real), comprueba el destinatario y el correo de detalles y verifica que no se inventa un precio fijo.
