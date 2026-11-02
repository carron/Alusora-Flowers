# ALUSORA — actualización puntual de formularios

Se utilizaron `index.html`, `app.js` y `styles.css` originales proporcionados por el usuario. Sólo se modificaron las secciones Picked by You y Request your event quote, así como las validaciones y notificaciones correspondientes en `app.py`. El catálogo y el carrito de pedidos estándar se conservan.

## Instalación en el proyecto existente

Reemplaza estos archivos en el proyecto original:
- `app.py` por el de este paquete.
- `web/index.html` por el de este paquete.
- `web/app.js` por el de este paquete.
- `web/styles.css` por el de este paquete.

**No elimines la carpeta web/assets, el panel de administración, otros archivos del proyecto ni la base de datos SQLite.** Este paquete deliberadamente no los incluye para evitar reemplazarlos.

## Correo

Configura las variables en el servicio de alojamiento (no son cargadas automáticamente desde .env):
```
ALUSORA_NOTIFICATION_EMAIL=arron.cursos@gmail.com
SMTP_HOST=servidor_smtp_del_remitente
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=usuario_smtp
SMTP_PASSWORD=contrasena_smtp
SMTP_FROM=remitente_autorizado
```

El email de destino no es suficiente para enviar correos. No subas las credenciales a GitHub.

## Comportamiento

- Ambos formularios requieren sólo nombre, correo, teléfono y fecha. En el formulario de eventos los demás campos, incluida la casilla de consentimiento de contacto, son opcionales.
- Picked by You requiere elegir entre 3 y 24 tallos; rechaza fechas de entrega del mismo día o anteriores. Es una solicitud, no una compra ni una reserva de inventario.
- Ambos formularios guardan la solicitud antes de intentar enviar el correo.
- Sólo se muestra el mensaje de que el correo fue enviado si el servidor SMTP aceptó el mensaje (`notification_sent=true`). Esto no garantiza entrega final en la bandeja de entrada.
- Si SMTP falla, se informa que la solicitud quedó guardada pero la notificación por correo falló; consultar los logs y el panel de administración.

## Pruebas

Se comprobó sintaxis de JavaScript y Python, los campos requeridos en HTML, la validación de fechas en el servidor, guardado de solicitudes y la construcción de notificaciones SMTP con un servidor simulado. **No se realizó una entrega real a Gmail.**
