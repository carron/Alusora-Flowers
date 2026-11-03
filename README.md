# ALUSORA Flowers — sitio listo para Cloudflare Workers

Sitio nuevo en **inglés**, con diseños florales originales creados digitalmente, paquetes comerciales, solicitudes por correo, inventario real en Cloudflare D1 y panel de administración.

## Lo que hace

- Seis paquetes con detalles completos, precios en CAD y botones **Request this package**.
- Selección de paquete, nombre, email, teléfono opcional, fecha de evento, invitados, colores y comentarios.
- Al recibir **confirmación del envío del email** desde Resend, desaparece el formulario y aparece un agradecimiento cálido.
- **Picked by you**: flor, color, cantidad (3–24 tallos), envoltura o florero y subtotal estimado.
- Inventario administrable: tipos de flor, colores, precios, cantidad de tallos disponibles y opción de ocultar la variante. Si el stock es cero, aparece *Currently sold out* y no se puede seleccionar.
- Para bouquets, una instrucción de actualización atómica verifica **todos los tallos disponibles a la vez** para impedir sobreventa concurrente. En caso de fallo del envío, intenta restaurar el inventario.
- Todas las solicitudes llegan a **alicia.arron@gmail.com** (no a otra dirección), mediante **Resend** (requiere configuración).
- Se almacenan las solicitudes en D1. El panel muestra el historial y permite marcarlas como *new*, *contacted* o *completed*.
- Protección básica: cookies de sesión firmadas y HttpOnly, secreto no expuesto, comprobación de origen, validación en servidor, límite de peticiones, campo antispam invisible y **Cloudflare Turnstile opcional pero recomendado**.
- Imágenes SVG originales generadas mediante código `make_art.py`; NO están copiadas ni descargadas de ningún sitio. Son **ilustraciones conceptuales**, no fotografías de arreglos reales ni compromiso de suministro.

## Requisitos

Node.js 20.11+ y cuenta Cloudflare con Workers + D1; dominio `alusoraflowers.com` administrado en Cloudflare o añadir un dominio compatible. Cuenta Resend para enviar correo desde el propio dominio.

**IMPORTANTE**: los formularios no enviarán correo automáticamente con sólo subir los archivos. Cloudflare no ejecuta Python/Flask de forma nativa. Esta versión usa un **Worker con código backend**, D1 y un proveedor de email. Configura todos los secretos y verifica el dominio antes de publicar.

## Pasos para desplegar

1. Descomprime el ZIP y abre una terminal en la carpeta `Alusora_Cloudflare`.
2. Instala herramientas e inicia sesión:

   ```bash
   npm install
   npx wrangler login
   ```

3. Crea la base de datos de producción:

   ```bash
   npx wrangler d1 create alusora-flowers-db
   ```

4. Copia el UUID `database_id` de la salida a `wrangler.jsonc` donde dice `REPLACE_WITH_YOUR_D1_DATABASE_ID`. No modifiques el `binding` (`DB`).
5. Aplica el esquema y la lista inicial de flores (**todas con cero de stock**):

   ```bash
   npm run db:remote
   ```

6. En **Resend → Domains**, agrega/verifica `alusoraflowers.com`. Configura los registros DNS que te solicite Resend y espera el estado *Verified*. Después crea una clave API de envío. El `FROM_EMAIL` inicial (`ALUSORA Flowers <hello@alusoraflowers.com>`) debe corresponder a un dominio verificado.
7. Registra los secretos en Cloudflare (los comandos te pedirán pegarlos sin ponerlos en el código):

   ```bash
   npx wrangler secret put RESEND_API_KEY
   npx wrangler secret put ADMIN_PASSWORD
   npx wrangler secret put SESSION_SECRET
   ```

   Usa una contraseña administrativa única y larga; `SESSION_SECRET` debe tener **al menos 32 caracteres aleatorios**. Por ejemplo, `node -e "console.log(require('crypto').randomBytes(40).toString('hex'))"`. No reutilices contraseñas personales.

8. **Recomendado antes de aceptar tráfico público:** crea un widget Cloudflare Turnstile (managed mode) con el dominio `alusoraflowers.com`. En `wrangler.jsonc`, coloca su **Site Key** pública en `TURNSTILE_SITE_KEY`. Guarda su **Secret Key** de forma privada:

   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

   Si usas Turnstile, configura **ambas** claves. La validación se hace en el Worker mediante Siteverify.

9. Publica:

   ```bash
   npm run deploy
   ```

10. En Cloudflare Dashboard → **Workers & Pages → alusora-flowers → Settings → Domains & Routes**, agrega tu dominio `alusoraflowers.com` (y `www` si lo utilizas). **Primero revisa el sitio actual** para evitar reemplazar la versión existente accidentalmente. Haz una prueba desde la URL `*.workers.dev` antes de mover el dominio.

11. Abre `/admin.html`, inicia sesión con `ADMIN_PASSWORD` y asigna **existencias reales** a los tipos y colores disponibles. Todos los productos aparecen agotados hasta que tú los cargues. Comprueba que las solicitudes de prueba llegan a **alicia.arron@gmail.com**; revisa también spam.

## Pruebas locales

Antes de publicar, puedes ejecutar:

```bash
npm install
cp .dev.vars.example .dev.vars
# Edita .dev.vars con valores reales de prueba
npm run db:local
npm run dev
```

Visita `http://127.0.0.1:8787` (o la dirección mostrada). Admin: `http://127.0.0.1:8787/admin.html`.

Tests unitarios básicos:

```bash
npm test
```

## Cómo funciona el inventario

- El inventario está compuesto por **variantes** (tipo de flor + color), con precio en centavos, stock entero y estado visible/oculto.
- En el panel puedes actualizar el stock o agregar variantes como `Lily / White`.
- El precio mostrado es un subtotal estimado; el cliente **no paga en línea**. No incluye impuestos.
- Las solicitudes de ramos reservan tallos automáticamente **una vez recibido el request**. Si el correo falla, el sistema libera esos tallos. Tú debes gestionar manualmente solicitudes abandonadas, retiros o cambios de cantidades desde el panel.
- El panel de solicitudes no ofrece cancelación automática, reembolso ni devolución de stock. Para liberar stock de un pedido cancelado, **ajusta el inventario manualmente**.
- Las solicitudes de paquetes para eventos son **cotizaciones**, no reservas de fecha ni de flores.
- Para reservas sujetas a caducidad, pagos online, imágenes reales de productos o informes fiscales, hacen falta desarrollos adicionales.

## Precios configurados

| Categoría | Paquete | Precio inicial |
|---|---|---:|
| Cumpleaños | Little Celebration | $289 CAD |
| Cumpleaños | Birthday Garden | $649 CAD |
| Cumpleaños | Birthday Statement | $1,690 CAD |
| Memorial | A Gentle Tribute | $249 CAD |
| Iglesia | Sacred Harmony | $289 CAD / service |
| Iglesia | Sacred Celebration | $549 CAD / event |

**Sacred Celebration** es el nombre propuesto para el segundo paquete de iglesia, que llegó sin nombre. Los precios de paquetes de eventos están guardados en `src/index.js` para impedir que un cliente manipule los importes desde el navegador.

## Ubicación y expectativas

La web menciona **Cherryhill neighbourhood, London, Ontario** y *pickup by arrangement*, sin afirmar que la empresa tiene un kiosco abierto en Cherryhill Village Mall. Se debe añadir dirección exacta y horario **sólo cuando exista una ubicación confirmada**. No promete entregas ilimitadas ni fechas garantizadas.

## Datos y privacidad

Los datos de solicitudes se almacenan en Cloudflare D1 (nombre, email, teléfono cuando se proporciona, fecha, notas, paquete/ramos), y se envían mediante Resend al correo comercial. Limita quién accede al panel y establece una política de retención y borrado apropiada para el negocio antes del lanzamiento. No subas `.dev.vars` ni valores de secretos a GitHub.

## Archivos clave

- `public/index.html` — página principal y contenido comercial.
- `public/style.css` — diseño responsive.
- `public/app.js` — formularios e interfaz de inventario.
- `public/admin.html` y `public/admin.js` — gestión de stock y solicitudes.
- `src/index.js` — endpoints y lógica segura de backend.
- `migrations/0001_initial.sql` — esquema de D1 con stock inicial 0.
- `wrangler.jsonc` — configuración del Worker.
- `make_art.py` y `public/assets/*.svg` — imágenes digitales originales, editables.

## Notas de lanzamiento

Publicación en Cloudflare Workers con Static Assets, no Cloudflare Pages de arrastrar y soltar. **NO** bastará con subir el HTML a Pages, porque el inventario y el correo requieren el backend y D1. Usa `npm run deploy`. Antes de conectar el dominio existente, verifica recepción real de emails, validación de Turnstile y actualizaciones de stock desde dos navegadores.
