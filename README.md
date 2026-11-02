# ALUSORA Flowers — Tienda web y control de inventario

Sitio web funcional para una florería boutique de formato kiosco en London, Ontario. Incluye **catálogo de 9 arreglos**, selección individual de flores, carrito, pedidos con recogida, cálculo de HST de Ontario, **descuento transaccional de inventario** y cotizaciones para eventos.

> **Estado:** prototipo funcional desplegable para validación comercial. No es una tienda pública lista para recibir clientes reales sin completar los pasos de seguridad, operación y protección de datos indicados abajo. La ubicación de Cherryhill Village Mall es **propuesta** y no se afirma que ya exista un contrato de arrendamiento.

## Estructura

- `web/index.html`: página comercial en inglés canadiense, adaptada a móviles.
- `web/styles.css`: identidad visual ALUSORA (verde salvia, crema, rosa empolvado).
- `web/app.js`: catálogo, personalización, carrito, pedidos y solicitud de cotización.
- `web/admin.html`, `web/admin.js`, `web/admin.css`: panel privado para administrar pedidos, cotizaciones y existencias.
- `web/assets/*.svg`: ilustraciones botánicas originales incluidas en el proyecto (no dependen de imágenes externas).
- `app.py`: servidor web, API y base de datos SQLite; **sin dependencias Python adicionales**.
- `tests/test_app.py`: pruebas automáticas, incluyendo protección ante pedidos simultáneos.
- `Dockerfile`: ejemplo de despliegue en contenedor.

## Windows: corregir "NoInstallsError: No runtimes are installed"

Este error significa que está instalado **Python Install Manager**, pero **no hay ninguna versión de Python instalada**.

1. Abre **PowerShell** en Windows (menú Inicio → PowerShell).
2. Instala el intérprete con este comando:

   ```powershell
   py install 3.11
   ```

3. Verifica que la instalación finalizó correctamente:

   ```powershell
   py -3.11 --version
   ```

   El resultado debería comenzar con `Python 3.11.`.
4. Extrae este ZIP en una carpeta nueva y ejecuta **START_HERE_Windows.bat**. El navegador puede abrir `http://127.0.0.1:8080/` mientras el servidor permanezca en funcionamiento.

Si `py` no se reconoce, instala Python desde https://www.python.org/downloads/windows/ y repite los pasos. Si `py install 3.11` falla, copia **el texto exacto del error** para poder diagnosticar una causa de red, permisos o configuración.

**Nota sobre zonas horarias:** Algunas instalaciones nuevas de Python en Windows no tienen la base de zonas horarias IANA. Esta versión admite la zona horaria local de Windows como alternativa para pruebas: configura tu zona en **Eastern Time** si estás en London, Ontario. Para producción conviene instalar `tzdata` y configurar correctamente la zona del servidor.

## Inicio fácil para probar el sitio

1. Descomprime el archivo ZIP.
2. **Windows:** haz doble clic en `START_HERE_Windows.bat` (si Python ya está instalado). **Mac/Linux:** ejecuta `./START_HERE_Mac_Linux.command`.
3. Se mostrarán el enlace de la tienda, el del panel y una clave administrativa temporal. Abre el enlace de la tienda en tu navegador.
4. No abras `index.html` haciendo doble clic: las reservas de stock requieren que el servidor esté en ejecución.

También puedes ejecutar `python3 launch.py` desde la carpeta de la app.

## Puesta en marcha local

Se necesita **Python 3.11 o posterior** (por `zoneinfo`, sintaxis y SQLite).

### macOS / Linux

```bash
cd ALUSORA_Flowers_Website
export ALUSORA_ADMIN_TOKEN="REEMPLAZAR_CON_UN_SECRETO_LARGO_Y_ALEATORIO"
python3 app.py
```

### Windows PowerShell

```powershell
cd ALUSORA_Flowers_Website
$env:ALUSORA_ADMIN_TOKEN = "REEMPLAZAR_CON_UN_SECRETO_LARGO_Y_ALEATORIO"
python app.py
```

Abrir las dos páginas:

- **Tienda:** http://127.0.0.1:8080/
- **Administración:** http://127.0.0.1:8080/admin.html

En el panel de administración se introduce el mismo valor de `ALUSORA_ADMIN_TOKEN`. La clave no se incluye en los archivos y el panel queda bloqueado si no está configurada.

### Configuración

| Variable | Uso | Valor predeterminado |
|---|---|---|
| `HOST` | Dirección de escucha | `127.0.0.1` |
| `PORT` | Puerto HTTP | `8080` |
| `ALUSORA_ADMIN_TOKEN` | Clave administrativa obligatoria para administrar | Sin valor; admin deshabilitado |
| `ALUSORA_DB_PATH` | Ruta de SQLite | `./alusora.sqlite3` |

Para exponer la app mediante Docker, utilizar `HOST=0.0.0.0`, HTTPS en un proxy y almacenamiento persistente.

## Qué permite hacer

### Clientes

1. Explorar arreglos para noviembre y diciembre: Cozy Hello, Everyday Bouquet, Thank You Jar, Warm Moments, Little Christmas Joy, Poinsettia, Winter Glow, Christmas Table y Holiday Signature.
2. Filtrar por **Everyday** o **Holiday**.
3. Construir un ramo seleccionando **claveles, alstroemerias, crisantemos y rosas**, de 3 a 24 tallos, con paleta y envoltura o florero.
4. Ver precio instantáneo y existencia antes de añadir al carrito.
5. Registrar un pedido con nombre, email, teléfono, fecha y horario de recogida y mensaje de tarjeta.
6. Recibir número de pedido en pantalla, subtotal, HST del 13% y total; **el pago es presencial al recoger**.
7. Solicitar una cotización para eventos: fecha, tipo, invitados, número aproximado de arreglos, presupuesto, preferencias y mensaje. La web muestra un **rango orientativo no vinculante** en función de las cantidades.

### Administración

1. Revisar pedidos recientes y preparar recogidas.
2. Cambiar un pedido entre **confirmed / ready / collected / cancelled**.
3. Cancelar y **reintegrar exactamente los tallos y materiales del pedido** al inventario una sola vez.
4. Añadir o quitar existencias con **motivo y registro de ajuste**.
5. Revisar peticiones para eventos y marcarlas como new, contacted, quoted, booked o closed.

## Cómo impide la sobreventa

**El inventario se gestiona por tallo y material real**, no solo por número de ramos. Por ejemplo, un Everyday Bouquet descuenta 5 claveles, 3 alstroemerias, 1 crisantemo, 1 porción de follaje, envoltura, listón y tarjeta. Si se piden dos arreglos, descuenta el doble.

La API implementa transacciones SQLite con `BEGIN IMMEDIATE`, comprueba toda la demanda acumulada del carrito y descuenta los componentes **en una única transacción**. Si dos personas intentan comprar las últimas flores, solo puede confirmarse el pedido que llegue primero. El segundo obtiene un error de existencias (HTTP 409) y no se genera una reserva parcial.

Las cotizaciones para eventos **no** reservan stock hasta convertirse en un pedido real (operación que deberá coordinar el personal).

**Inventario inicial de ejemplo**: 180 claveles, 110 alstroemerias, 75 crisantemos, 52 rosas, entre otros materiales. Cambiarlo desde el panel antes de operar.

## Comprobar las pruebas

```bash
python3 -m unittest discover -s tests -v
```

Cubren pedidos, impuestos, idempotencia (evita duplicación por reintentos), cancelaciones, cotizaciones, ramos personalizados, validaciones y concurrencia.

## Docker

```bash
docker build -t alusora-flowers .
docker run -p 8080:8080 -e ALUSORA_ADMIN_TOKEN="CAMBIAR_CLAVE" -v alusora_data:/data alusora-flowers
```

Docker con volumen persistente **no equivale a una configuración de producción revisada**. Debe configurarse un host HTTPS, registro de errores y respaldos. Mantener **una sola instancia de esta app SQLite** y un almacenamiento persistente hasta migrar a PostgreSQL.

## Antes de publicar y captar pedidos reales — indispensable

1. **Arrendamiento y operación:** confirmar apertura, área exacta, horario, permisos y posibilidad de recoger en Cherryhill; actualizar el texto de ubicación y horario.
2. **Antifraude / confirmación:** la reserva ahora es inmediata y el pago ocurre en tienda. Un usuario malintencionado podría realizar pedidos falsos y agotar la disponibilidad. Antes del lanzamiento integrar verificación por email/teléfono, CAPTCHA y/o depósito con Stripe y un proceso de expiración de reservas.
3. **Avisos automáticos:** la demo guarda pedidos y cotizaciones en el panel, pero **no envía emails, SMS ni notificaciones**. Integrar servicio real (p. ej., proveedor SMTP transaccional) y vigilar el panel hasta entonces.
4. **Seguridad y privacidad:** HTTPS, dominio, políticas de privacidad, consentimiento, backups, retención y eliminación de datos de clientes, protección ante abuso, monitorización y revisión de seguridad.
5. **Escalabilidad:** para múltiples servidores o más tráfico, sustituir SQLite por PostgreSQL con stock descontado transaccionalmente. No usar almacenamiento efímero del proveedor de hosting.
6. **Pagos:** no existe integración de cobro real ni procesamiento de tarjetas. La interfaz muestra explícitamente **Pay at pickup**.
7. **Precios reales:** ajustar precios y recetas tras obtener costos de proveedores, comprobar impuestos aplicables y revisar que el inventario coincida con el stock físico.
8. **Operación y cumplimiento:** las estimaciones de evento no son una oferta vinculante; confirmar logística, fletes, montaje, fechas y existencia antes de aceptarlas.

## Notas de identidad

La web está en inglés canadiense porque vende localmente en London, Ontario. Los archivos son editables y reutilizables. Las ilustraciones SVG representan bouquets ilustrativos, no fotografías reales. Los nombres de productos y precios replican el plan preliminar de ALUSORA (noviembre–diciembre de 2026).
