# ALUSORA — corrección puntual de formularios

Se conservaron `web/index.html`, `web/app.js`, `web/styles.css` y `app.py` de la versión anterior. Solo cambia `web/index.html` y `web/app.js` para corregir los bugs de la página y eliminar el catálogo. `app.py` y los estilos se incluyen sin cambios.

## Fallo que provocaba que no funcionaran ambos botones

En `init()` se buscaba `#add-custom`, elemento ya eliminado de HTML. Esto provocaba una excepción de JavaScript antes de registrar los eventos `submit` de los formularios. Ahora se registra `#custom-request-form` con `submitCustomRequest`. Se mantienen `submitEvent` y `updateEventEstimate`.

Además, al quitar la sección `#shop`, el antiguo `renderProducts` habría intentado acceder a `#product-grid` inexistente. Ahora comprueba la existencia de ese contenedor antes de renderizar. Se actualizaron los enlaces que antes dirigían a `#shop` para apuntar a `#build`.

## Email — requisito imprescindible para que llegue a Gmail

Las solicitudes se guardan en SQLite y el servidor intenta enviar una notificación a `arron.cursos@gmail.com`. En hosting deben existir variables reales SMTP_HOST, SMTP_PORT, SMTP_SECURITY, SMTP_USER, SMTP_PASSWORD y SMTP_FROM (remitente autorizado), más ALUSORA_NOTIFICATION_EMAIL=arron.cursos@gmail.com.

El archivo `.env.example` es un ejemplo, no habilita el envío automáticamente. No subas las credenciales a GitHub.

`notification_sent=true` significa que SMTP aceptó el mensaje; no garantiza entrega final en la bandeja Gmail. Con `notification_sent=false` se muestra aviso de registro sin correo enviado, con referencia; revisa logs y panel de administración. Una configuración SMTP real no puede verificarse sin credenciales del proveedor.

## Instalación

Reemplaza en tu proyecto original `web/index.html`, `web/app.js`; si no has instalado aún el backend anterior, actualiza `app.py` a la versión incluida. Conserva carpeta de assets, panel, bases de datos y demás archivos existentes. Despliega/reinicia el servidor y prueba ambos formularios con datos de prueba; confirma en la pestaña Network que POST /api/custom-request y POST /api/events devuelvan código 201 y `notification_sent=true`.
