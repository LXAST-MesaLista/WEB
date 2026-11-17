# Instalar la web de MesaLista en Azure

La web va en la **misma máquina virtual** que el servidor de MesaLista y con el
**mismo dominio**. nginx atiende el dominio por HTTPS y reparte las peticiones:

| Dirección | Qué es | Quién la atiende |
|---|---|---|
| `https://<dominio>/api/v1/` | API del servidor | nginx → `mesalista-api` (Node.js, 127.0.0.1:8091), proyecto [Servidor](https://github.com/LXPT-UIB/Servidor) |
| `https://<dominio>/` | Web de clientes | nginx → `mesalista-web` (Node.js, 127.0.0.1:8092), este proyecto |
| `https://<dominio>/panel/` | Panel del restaurante y administración | nginx → `mesalista-web` |
| `https://<dominio>/assets/` | CSS, JS e imágenes | nginx, directamente desde `/opt/mesalista-web/publico` |

`<dominio>` es la etiqueta DNS de la IP pública de Azure (por ejemplo
`mesalista.spaincentral.cloudapp.azure.com`).

## 1. Antes de empezar

1. El servidor ya está instalado en la máquina con `sudo bash despliegue/install.sh`
   (proyecto Servidor): PostgreSQL, la API como servicio `mesalista-api` en
   `127.0.0.1:8091`, la cuenta de administración y el dominio guardado en
   `/etc/mesalista/install.env`.
2. En Azure (Redes > reglas de entrada) están abiertos los puertos **80** y
   **443**: el 80 hace falta para el certificado de Let's Encrypt.

## 2. Copiar la web a la máquina

Entra en la máquina (cambia la ruta de tu clave, el usuario y la IP pública):

```powershell
ssh -i <ruta-de-tu-clave.pem> <usuario>@<IP-pública>
```

Y allí, descarga el proyecto de GitHub junto al del servidor:

```bash
git clone https://github.com/LXPT-UIB/WEB.git ~/MesaLista-web
```

Si el repositorio es privado, GitHub pide tu usuario y, como contraseña, un
token de acceso personal.

> La copia no lleva `config/config.json` (está en `.gitignore`): la
> instalación crea uno propio para el servidor. Puede estar en la carpeta
> personal: el instalador, como root, copia los archivos a `/opt/mesalista-web`.

## 3. Instalar

```bash
cd ~/MesaLista-web && sudo bash despliegue/instalar.sh
```

El instalador:

1. Lee el dominio que guardó el servidor en `/etc/mesalista/install.env`. La web
   y la API comparten el dominio, así que siempre es el mismo. Si no lo
   encuentra, lo pregunta (o se le da con `--dominio <dominio>`).
2. Instala nginx, certbot y, si falta, Node.js 24 (el mismo que la API).
3. Comprueba que la API responde por dentro en `http://127.0.0.1:8091/api/v1/`.
4. Copia el proyecto a `/opt/mesalista-web`, instala las dependencias con
   `npm ci` y crea `config/config.json` la primera vez (las siguientes lo conserva).
5. Instala y arranca el servicio `mesalista-web` (usuario propio sin
   privilegios; sesiones en `/var/lib/mesalista-web/sesiones`).
6. Configura nginx con `despliegue/nginx-mesalista.conf`. Si Apache ocupaba los
   puertos 80 y 443, lo detiene y lo desactiva: nginx hace ahora su trabajo
   (HTTPS, `/api/v1` hacia la API y el desafío de Let's Encrypt).
7. Usa el certificado de Let's Encrypt del dominio si ya existe; si no, lo pide
   (con un autofirmado provisional mientras tanto). La renovación automática
   recarga nginx.
8. Abre la portada y comprueba que muestra el buscador de mesas, es decir, que
   la web llega a la API, y que `https://<dominio>/api/v1/` responde a través de nginx.

## 4. Comprobar

- `https://<dominio>/`: portada con el buscador de mesas.
- `https://<dominio>/registro`: crear una cuenta de cliente y hacer una reserva.
- `https://<dominio>/panel/entrar`: entrar con la cuenta de administración que
  creó la instalación del servidor. En el menú, **Administración → Parámetros**:
  fija el PIN de «Cerrar local». En **Administración → Personal** se crean las
  cuentas del resto del personal.
- `https://<dominio>/api/v1/config`: la API responde a través de nginx (la usa la app Android).

## 5. Actualizar

Cada vez que haya una versión nueva en `main`:

```bash
cd ~/MesaLista-web && git pull && sudo bash despliegue/instalar.sh
```

Las reservas y las cuentas están en el servidor, no en la web: actualizar la web
no las toca, y las sesiones abiertas se conservan.

**Si cambia el dominio:** primero el servidor
(`sudo bash despliegue/install.sh --dominio <nuevo>` en Servidor) y después
vuelve a ejecutar `instalar.sh` de la web, que rehace el sitio de nginx.

> **Ojo al reinstalar el servidor:** su `install.sh` configura y arranca Apache.
> Con nginx en los puertos 80 y 443, Apache no puede arrancar. Después de
> ejecutar el `install.sh` del servidor, vuelve a ejecutar `instalar.sh` de la
> web para que nginx recupere el dominio.

## 6. Dónde está cada cosa

| Ruta en el servidor | Qué hay |
|---|---|
| `/opt/mesalista-web` | La web: `src/`, `vistas/`, `publico/` y `node_modules/` |
| `/opt/mesalista-web/config/config.json` | Dirección de la API (`api`), puerto (`listen`), `https` y sesiones |
| `/var/lib/mesalista-web/sesiones` | Sesiones de la web (un archivo por sesión; caducan a las 2 horas sin uso) |
| `/etc/systemd/system/mesalista-web.service` | Servicio de la web |
| `/etc/nginx/sites-available/mesalista` | Sitio de nginx: HTTPS, `/assets`, `/api/v1` y la web |
| `journalctl -u mesalista-web` | Mensajes y errores de la web |
| `/var/log/nginx/mesalista-*.log` | Accesos (sin la cadena de consulta) y errores de nginx |

## 7. Si algo falla

| Lo que se ve | Causa probable | Qué hacer |
|---|---|---|
| «No se puede conectar con el servidor de reservas» | La web no llega a la API: `mesalista-api` parado o `config.json` mal | `systemctl status mesalista-api`; revisa `api` en `config.json` y `journalctl -u mesalista-web` |
| `502 Bad Gateway` en todas las páginas | El servicio de la web está parado | `systemctl status mesalista-web` y `journalctl -u mesalista-web -n 50` |
| `502 Bad Gateway` solo en `/api/v1/` | La API está parada | `systemctl restart mesalista-api` |
| El navegador avisa del certificado | Sigue el autofirmado provisional | Abre el puerto 80 en Azure y vuelve a ejecutar `instalar.sh` |
| `nginx: [emerg] bind() to 0.0.0.0:443 failed` | Apache sigue ocupando el puerto | `sudo systemctl disable --now apache2` y vuelve a ejecutar `instalar.sh` |
| `fatal: could not read Username` o `Authentication failed` con `git clone` | El repositorio es privado | Usa tu usuario de GitHub y un token de acceso personal como contraseña |
| «La página ha caducado» al enviar un formulario | La sesión caducó o se abrió la página hace mucho | Recarga la página y vuelve a enviarlo |
| El panel vuelve a «Entrar» solo | La sesión del panel se cierra tras 30 minutos sin actividad (y a las 8 horas) | Es lo esperado (RS-05) |
| «Escanear QR» no abre la cámara | La cámara solo funciona con HTTPS y con permiso del navegador | Usa el certificado de Let's Encrypt y acepta el permiso; también vale un lector USB |
