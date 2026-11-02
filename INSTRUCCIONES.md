# ALUSORA Flowers — solicitudes y notificaciones por correo

## ¿Qué cambia?
- Las solicitudes a `POST /api/events` solo requieren `name` y `email`. Los otros campos son opcionales.
- Las solicitudes de **Picked by You** usan `POST /api/custom-request`, guardan los detalles del ramo como consulta y **no** descuentan stock ni completan una compra.
- El backend envía avisos de **nuevos pedidos**, **solicitudes de eventos/cotizaciones** y **Picked by You** a `arron.cursos@gmail.com`.
- Las solicitudes primero se guardan en SQLite. Si el servicio SMTP falla, **la solicitud permanece guardada** y `notification_sent` será `false`; revisa los logs.
- El correo que recibe ALUSORA incluye los datos de contacto y el detalle del pedido o solicitud; `Reply-To` es el email del cliente.
- No se envían correos automáticos al cliente con esta actualización.

## Instalación
1. Haz una copia de tu `app.py` actual.
2. Reemplázalo con el `app.py` de este ZIP en la carpeta de la aplicación, junto a `web/` y `Dockerfile`.
3. Conserva intactos los archivos de base de datos (`.sqlite3`, `-wal`, `-shm`).
4. Configura las siguientes variables de entorno **en el panel de tu hosting** (por ejemplo Render → tu servicio → Environment):

```env
ALUSORA_NOTIFICATION_EMAIL=arron.cursos@gmail.com
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=usuario-o-direccion-autorizada
SMTP_PASSWORD=CONTRASENA_O_APP_PASSWORD_DEL_PROVEEDOR
SMTP_FROM=una-direccion-verificada@tu-dominio.com
```

- `SMTP_HOST` y `SMTP_USER` dependen del proveedor donde está **la cuenta desde la cual enviarás** los mensajes. **La dirección de destino** `arron.cursos@gmail.com` no indica por sí sola el proveedor ni el servidor SMTP.
- Para SMTP sobre SSL/TLS implícito, normalmente usa `SMTP_PORT=465` y `SMTP_SECURITY=ssl`.
- **No** agregues contraseñas al repositorio, al ZIP público ni al código. `SMTP_FROM` debe ser un remitente permitido/verificado por tu proveedor.
- Configura `ALUSORA_ADMIN_TOKEN` como secreto largo y la ruta persistente `ALUSORA_DB_PATH` como antes.
5. Reinicia o vuelve a desplegar el servicio.
6. Prueba `/api/events` o `/api/custom-request` con solo `name` y `email`. Comprueba el registro en Admin, el valor `notification_sent` de la respuesta y la bandeja de entrada/carpeta de spam de `arron.cursos@gmail.com`.

## Ejemplo de prueba

```bash
curl -X POST https://TU_DOMINIO/api/custom-request \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Customer","email":"test@example.com","selection":{"stems":{"rose":3}},"message":"Could you contact me?"}'
```

## Pendiente: archivos web
No se entregó la carpeta `web/`. Por tanto, **no** se modificaron aún los botones, el formulario HTML ni el bloque "Illustrative Cost". Para concluir esos cambios, comparte la carpeta `web/` completa.

## Fallo o ausencia del correo
- `notification_sent: true`: el servidor SMTP aceptó el mensaje; no garantiza entrega final en la bandeja de destino.
- `notification_sent: false`: SMTP no estaba configurado o hubo error. La solicitud sigue guardada en SQLite.
- Revisa los logs del hosting en busca de `Email notification`.
- Un fallo del correo no impide guardar una solicitud, pero debe vigilarse para no dejar de atender clientes.
