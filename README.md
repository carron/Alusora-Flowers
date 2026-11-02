# ALUSORA Flowers — actualización de solicitudes

## Cambios
- **Picked by You:** sin botón Add to Bag; permite escoger flores y muestra formulario obligatorio con nombre, email, teléfono y fecha de entrega (desde mañana, zona horaria America/Toronto), además de notas.
- **Request your event quote:** envía la información de todos los campos al servidor.
- Los dos formularios guardan la solicitud en SQLite y tratan de notificar a `arron.cursos@gmail.com` por SMTP.
- El aviso de éxito en inglés aparece **solo cuando el SMTP acepta el mensaje**. Si falla, se informa al cliente que su solicitud quedó guardada, pero que debe contactar a Alusora.
- Las solicitudes no reservan inventario ni constituyen una compra confirmada.

## Importante sobre los archivos originales
La carpeta `web/` original NO venía entre los archivos compartidos. Por eso se incluye una nueva interfaz pública, responsive, con los formularios solicitados y una vista de colección, en lugar de una modificación visual exacta del sitio anterior. La API y las tablas existentes del servidor se mantienen. Esta versión **no incluye el carrito de compras del antiguo frontend**. Se conserva el endpoint `/api/orders` para una futura integración.

## Instalar
1. Haz respaldo de tu proyecto y de tu base SQLite; conserva su ruta/volumen en el hosting.
2. Reemplaza `app.py` e incorpora la carpeta `web/` de este ZIP. Si prefieres conservar el diseño original, habrá que integrar el formulario en tus archivos originales.
3. Configura variables de entorno *en el hosting*, no en GitHub:

```env
ALUSORA_NOTIFICATION_EMAIL=arron.cursos@gmail.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURITY=starttls
SMTP_USER=TU_CUENTA_GMAIL@gmail.com
SMTP_PASSWORD=TU_CONTRASENA_DE_APLICACION_DE_GOOGLE
SMTP_FROM=TU_CUENTA_GMAIL@gmail.com
ALUSORA_ADMIN_TOKEN=UN_TOKEN_LARGO_ALEATORIO
HOST=0.0.0.0
PORT=8080
```

Para Gmail se necesita una **contraseña de aplicación** de Google (cuando esté disponible para tu cuenta); no uses la contraseña habitual ni subas secretos al repositorio. Puedes usar otro servicio SMTP con su host y cuenta verificada.

4. Reinicia o despliega el sitio y revisa los logs. Prueba ambos formularios con datos de prueba y comprueba inbox/spam en `arron.cursos@gmail.com`.
5. `notification_sent=true` significa que el servidor SMTP aceptó el correo, no garantiza la entrega final. `false` significa que se guardó sin poder enviarse.

## Prueba local
Requiere Python 3.11+:
```bash
python app.py
```
Abre http://127.0.0.1:8080/ y http://127.0.0.1:8080/admin.html.

**Nota:** en la versión empaquetada no se incluye la base SQLite subida, para no exponer información real de clientes ni mezclarla con datos de producción. El servidor crea una base nueva si no defines `ALUSORA_DB_PATH`.

## Limitaciones y próximos pasos
Antes de recibir solicitudes reales configura HTTPS, privacidad, protección contra spam (CAPTCHA o equivalente), monitoreo del envío SMTP y respaldo de SQLite. La entrega depende de la confirmación manual del equipo.
