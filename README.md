# MesaLista · web

Web de MesaLista hecha con **Node.js, plantillas EJS, HTML, CSS, JavaScript y
Bootstrap 5.3**, servida detrás de **nginx**. No tiene base de datos: todo lo
pide al servidor de MesaLista ([LXPT-UIB/Servidor](https://github.com/LXPT-UIB/Servidor))
por su API `/api/v1`. La app para Android de los clientes es
[LXPT-UIB/APP](https://github.com/LXPT-UIB/APP) y usa la misma API.

Las tres partes de MesaLista, cada una en su repositorio:

| Parte | Repositorio |
|---|---|
| Servidor: API REST (Node.js + PostgreSQL) y nginx | [LXPT-UIB/Servidor](https://github.com/LXPT-UIB/Servidor) |
| Web de clientes y panel del restaurante (Node.js) | [LXPT-UIB/WEB](https://github.com/LXPT-UIB/WEB) |
| App para Android de los clientes (Kotlin, Firebase) | [LXPT-UIB/APP](https://github.com/LXPT-UIB/APP) |

```
Navegador ──HTTPS──> nginx ──┬── /assets ────> archivos de publico/
                             ├── /api/v1 ────> API (Node.js, 127.0.0.1:8091)
                             └── el resto ───> web (Node.js, 127.0.0.1:8092) ──(Bearer)──> API
```

El navegador nunca ve el token de la API: lo guarda la web en la sesión, y el
navegador solo recibe una cookie con un identificador aleatorio.

## Carpetas

| Carpeta | Qué hay |
|---|---|
| `src/servidor.js` | Arranque del servidor HTTP (`npm start`) |
| `src/app.js` | Atiende cada petición: cabeceras de seguridad, sesión, CSRF y la página que corresponde |
| `src/rutas.js` | Direcciones de la web y la página que atiende cada una |
| `src/paginas/` | Lo que hace cada página: lee el formulario, llama a la API y decide |
| `src/lib/` | `api` (llamadas al servidor), `sesion`, `csrf`, `vista`, `formato`, `html`, `peticion` y `zonas` (cliente, panel y administración) |
| `vistas/` | Cómo se ve cada página (plantillas EJS con Bootstrap); `base.ejs` es el diseño común |
| `publico/assets/` | CSS, JS, Bootstrap 5.3.8 oficial, librerías (jsQR, qrcode-generator) e icono; nginx los sirve directamente |
| `config/` | `config.example.json`; cada instalación tiene su `config.json` (no se sube a Git) |
| `bin/escribir-config.js` | Crea `config.json` al instalar |
| `despliegue/` | `instalar.sh` (instalar o actualizar en el servidor), `nginx-mesalista.conf` y `mesalista-web.service` |
| `docs/instalacion.md` | Cómo instalar la web en la máquina de Azure, paso a paso |
| `docs/paginas.md` | Qué archivo cambiar para cada página (aspecto, textos, páginas nuevas) |

## Instalar en el servidor

Resumen (los detalles, en [docs/instalacion.md](docs/instalacion.md)): con el
servidor de MesaLista ya instalado en la máquina de Azure, se clona este
proyecto allí y se ejecuta el instalador:

```bash
git clone https://github.com/LXPT-UIB/WEB.git ~/MesaLista-web
cd ~/MesaLista-web && sudo bash despliegue/instalar.sh
```

Para actualizar: `git pull` y volver a ejecutar `instalar.sh`. El dominio es el
del servidor (lo lee de `/etc/mesalista/install.env`).

Seguridad:
- La web solo usa HTTPS (nginx redirige el puerto 80). La cookie de sesión es `HttpOnly`, `Secure` y `SameSite=Lax`.
- Cada formulario lleva un token CSRF.
- La política de seguridad de contenidos (CSP) solo permite scripts y estilos de la propia web, sin código en línea.
- Las páginas no se guardan en la caché del navegador (`no-store`).
- `next` solo lleva a direcciones de la propia web.
- Los procesos de Node.js solo escuchan en `127.0.0.1`; el servicio corre con su propio usuario, sin privilegios y sin poder escribir en su código.

## Probar en local

Necesita Node.js 20.11 o posterior y el servidor de MesaLista funcionando en
`http://127.0.0.1:8091`:

```bash
npm install
cp config/config.example.json config/config.json   # y poner "https": false y "sesiones": { "carpeta": "sesiones" }
npm start                                          # http://127.0.0.1:8092
```

En local, la propia web sirve también los archivos de `publico/assets`.

## Páginas

| Dirección | Página |
|---|---|
| `/` | Portada: buscar mesa; con sesión, avisos del restaurante y próximas reservas |
| `/entrar`, `/registro`, `/salir` | Acceso de clientes |
| `/recuperar`, `/restablecer` | Cambiar la contraseña con un enlace por correo |
| `/reservar`, `/reservar/confirmar` | Día, comensales y hora; menú, nota y consentimiento |
| `/reservas`, `/reservas/{id}` | Mis reservas y solicitudes de grupo; detalle con QR y señal |
| `/reservas/{id}/modificar`, `…/cancelar`, `…/pagar` | Cambiar, cancelar y pagar la señal con PayPal |
| `/vincular` | Añadir una reserva hecha en el local (código del ticket y teléfono) |
| `/grupos` | Solicitud de mesa para grupos grandes |
| `/cuenta` | Nombre, teléfono, cerrar sesión y eliminar la cuenta |

### Panel del restaurante

Las páginas del panel se recargan solas cuando cambian los datos (la web pregunta
cada 2 segundos por `/ajax/panel/version`), salvo si hay un formulario a medias.

| Dirección | Página |
|---|---|
| `/panel/entrar`, `/panel/salir` | Acceso del personal y de administración |
| `/panel` | Sala: estado de cada mesa, por mesa o sobre el plano; terminar, comensales, cerrar local |
| `/panel/agenda` | Reservas de un día, búsqueda, llegada, cancelar (con o sin devolver la señal) y CSV |
| `/panel/reservas/{id}/mesas` | Mover la reserva a otra mesa, unir mesas o separarlas |
| `/panel/escanear` | Llegada con el QR: cámara (jsQR) o lector USB |
| `/panel/nueva`, `/panel/reservas/{id}/ticket` | Reserva en el local y su ticket para imprimir |
| `/panel/sin-reserva` | Sentar a clientes sin reserva en una mesa o en varias unidas |
| `/panel/grupos` | Aceptar (eligiendo mesas) o rechazar solicitudes de grupo |
| `/panel/bloqueos` | Bloquear mesas o franjas enteras |

### Administración (solo cuentas de administración)

| Dirección | Página |
|---|---|
| `/panel/admin/mesas` | Mesas (alta, cambios, desactivar, eliminar) y editor del plano de cada zona |
| `/panel/admin/clientes` | Clientes registrados con búsqueda y sus reservas |
| `/panel/admin/estadisticas` | Reservas, comensales, no presentadas, cancelaciones, gráficos y ocupación |
| `/panel/admin/horario` | Franjas de servicio de cada día y días cerrados |
| `/panel/admin/parametros` | Parámetros del servicio, PIN de «Cerrar local» y opciones de menú |
| `/panel/admin/personal` | Cuentas del personal: crear, rol, activar o desactivar y contraseña |
