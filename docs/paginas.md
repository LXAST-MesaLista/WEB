# Cambiar el aspecto de la web: qué archivo toca cada página

La web separa **cómo se ve** de **lo que hace**. Para cambiar el diseño casi
siempre basta con tocar las plantillas (`vistas/*.ejs`) y el CSS. La instalación
(nginx, HTTPS, servicio de systemd) la hace `despliegue/instalar.sh` y no
depende de cómo sean las páginas.

## Las tres partes de una página

Ejemplo: la pantalla de inicio, `https://<dominio>/`.

| Parte | Archivo | Qué cambiar ahí |
|---|---|---|
| Dirección | `src/rutas.js`: `'/': 'publico/portada'` | Qué archivo atiende cada dirección |
| Lo que hace | `src/paginas/publico/portada.js` | Qué datos pide a la API y qué variables pasa a la plantilla (`Vista.mostrar('publico/portada', { … })`) |
| **Cómo se ve** | **`vistas/publico/portada.ejs`** | **El HTML de la página: textos, secciones, botones, clases de Bootstrap** |

Además, en todas las páginas:

| Qué | Archivo |
|---|---|
| Diseño común: `<head>`, menú, avisos y pie | `vistas/base.ejs` |
| Menú de los clientes | `vistas/menu-cliente.ejs` |
| Menú del personal (panel) | `vistas/menu-panel.ejs` |
| Página de error (404, 500…) | `vistas/error.ejs` |
| Colores y estilos de toda la web | `publico/assets/css/mesalista.css` |
| Estilos solo del panel | `publico/assets/css/panel.css` |
| JavaScript común (formularios, QR, cuenta atrás…) | `publico/assets/js/mesalista.js` |
| JavaScript del panel (recarga sola, plano de mesas…) | `publico/assets/js/panel.js` |
| Tema claro u oscuro | `publico/assets/js/tema.js` |
| Icono | `publico/assets/icono.svg` |

Los archivos que empiezan por `_` (por ejemplo `vistas/cliente/_tarjeta-reserva.ejs`)
son trozos que se repiten en varias páginas. Si cambias uno, cambia en todas
las páginas que lo usan (con `fragmento('…')`).

## Todas las páginas

Las direcciones con `{id}` llevan un número (`/reservas/15`). «—» quiere decir
que esa dirección no tiene pantalla propia: recibe un formulario, hace la acción
y redirige a otra página.

### Público y acceso de clientes

| Dirección | Lo que hace (`src/paginas/…`) | Cómo se ve (`vistas/…`) |
|---|---|---|
| `/` (inicio) | `publico/portada.js` | `publico/portada.ejs` (+ `cliente/_tarjeta-reserva.ejs`) |
| `/entrar` | `publico/entrar.js` | `publico/entrar.ejs` |
| `/registro` | `publico/registro.js` | `publico/registro.ejs` |
| `/recuperar` | `publico/recuperar.js` | `publico/recuperar.ejs` y, tras enviar, `publico/recuperar-enviado.ejs` |
| `/restablecer` | `publico/restablecer.js` | `publico/restablecer.ejs` |
| `/salir` | `publico/salir.js` | — |

### Zona del cliente

| Dirección | Lo que hace | Cómo se ve |
|---|---|---|
| `/reservar` | `cliente/reservar.js` | `cliente/reservar.ejs` |
| `/reservar/confirmar` | `cliente/confirmar.js` | `cliente/confirmar.ejs` (sin sesión: `cliente/confirmar-sin-sesion.ejs`); trozos `cliente/_resumen.ejs` y `cliente/_extras.ejs` |
| `/reservas` | `cliente/reservas.js` | `cliente/reservas.ejs` (+ `cliente/_tarjeta-reserva.ejs`) |
| `/reservas/{id}` | `cliente/reserva.js` | `cliente/reserva.ejs` |
| `/reservas/{id}/modificar` | `cliente/modificar.js` | `cliente/modificar.ejs` (+ `cliente/_extras.ejs`) |
| `/reservas/{id}/cancelar` | `cliente/cancelar.js` | — |
| `/reservas/{id}/pagar` | `cliente/pagar.js` | — (lleva a PayPal) |
| `/vincular` | `cliente/vincular.js` | `cliente/vincular.ejs` |
| `/grupos` | `cliente/grupos.js` | `cliente/grupos.ejs` |
| `/grupos/{id}/cancelar` | `cliente/grupo-cancelar.js` | — |
| `/cuenta` | `cliente/cuenta.js` | `cliente/cuenta.ejs` |
| `/cuenta/eliminar` | `cliente/cuenta-eliminar.js` | — |
| `/avisos/leidos` | `cliente/avisos-leidos.js` | — |

### Panel del personal

| Dirección | Lo que hace | Cómo se ve |
|---|---|---|
| `/panel/entrar` | `panel/entrar.js` | `panel/entrar.ejs` |
| `/panel` (sala) | `panel/sala.js` | `panel/sala.ejs` (+ `panel/_mapa.ejs`, `panel/_mesa.ejs`) |
| `/panel/agenda` | `panel/agenda.js` | `panel/agenda.ejs` |
| `/panel/agenda.csv` | `panel/agenda-csv.js` | — (descarga) |
| `/panel/escanear` | `panel/escanear.js` | `panel/escanear.ejs` |
| `/panel/reservas/{id}/llegada` | `panel/llegada.js` | `panel/llegada-anticipada.ejs` (solo si llegan antes de hora) |
| `/panel/reservas/{id}/mesas` | `panel/mesas.js` | `panel/mesas.ejs` |
| `/panel/reservas/{id}/ticket` | `panel/ticket.js` | `panel/ticket.ejs` |
| `/panel/reservas/{id}/terminar`, `…/comensales`, `…/cancelar` | `panel/terminar.js`, `panel/comensales.js`, `panel/cancelar.js` | — |
| `/panel/nueva` | `panel/nueva.js` | `panel/nueva.ejs` (+ `cliente/_extras.ejs`) |
| `/panel/sin-reserva` | `panel/sin-reserva.js` | `panel/sin-reserva.ejs` |
| `/panel/grupos` | `panel/grupos.js` | `panel/grupos.ejs` |
| `/panel/grupos/{id}/aceptar` | `panel/grupo-aceptar.js` | `panel/grupo-aceptar.ejs` |
| `/panel/grupos/{id}/rechazar` | `panel/grupo-rechazar.js` | — |
| `/panel/bloqueos` | `panel/bloqueos.js` | `panel/bloqueos.ejs` |
| `/panel/bloqueos/{id}/quitar` | `panel/bloqueo-quitar.js` | — |
| `/panel/cerrar-local` | `panel/cerrar-local.js` | — |
| `/panel/salir` | `panel/salir.js` | — |
| `/ajax/panel/version` | `panel/ajax-version.js` | — (JSON para `panel.js`) |

### Administración

| Dirección | Lo que hace | Cómo se ve |
|---|---|---|
| `/panel/admin/mesas` | `admin/mesas.js` | `admin/mesas.ejs` (+ `admin/_fila-mesa.ejs`, `panel/_mapa.ejs`) |
| `/panel/admin/mesas/{id}`, `…/eliminar` | `admin/mesa.js`, `admin/mesa-eliminar.js` | — (el formulario está en `admin/_fila-mesa.ejs`) |
| `/panel/admin/plano` | `admin/plano.js` | — (el editor está en `admin/mesas.ejs` y `panel.js`) |
| `/panel/admin/clientes` | `admin/clientes.js` | `admin/clientes.ejs` |
| `/panel/admin/estadisticas` | `admin/estadisticas.js` | `admin/estadisticas.ejs` (+ `admin/_barras.ejs`) |
| `/panel/admin/horario` | `admin/horario.js` | `admin/horario.ejs` |
| `/panel/admin/horario/cerrar`, `…/abrir` | `admin/dia-cerrar.js`, `admin/dia-abrir.js` | — (el formulario está en `admin/horario.ejs`) |
| `/panel/admin/parametros` | `admin/parametros.js` | `admin/parametros.ejs` |
| `/panel/admin/pin` | `admin/pin.js` | — (el formulario está en `admin/parametros.ejs`) |
| `/panel/admin/menu`, `/panel/admin/menu/{id}` | `admin/menu-nueva.js`, `admin/menu-opcion.js` | — (en `admin/parametros.ejs`) |
| `/panel/admin/personal` | `admin/personal.js` | `admin/personal.ejs` |
| `/panel/admin/personal/{id}` | `admin/personal-cuenta.js` | — (el formulario está en `admin/personal.ejs`) |

## Cambiar una página

1. Abre su plantilla en `vistas/` (tabla de arriba) y cambia el HTML. Al principio
   de cada plantilla, un comentario `<%# … %>` dice qué variables recibe.
   - `<%= x %>` escribe un valor escapado (siempre para datos).
   - `<%- … %>` escribe HTML tal cual (solo para `fragmento(…)`, `campo(…)` o `Csrf.campo()`).
2. Los estilos van en `publico/assets/css/mesalista.css`, con clases propias.
3. No quites de los formularios `<%- Csrf.campo() %>` ni los `name="…"` de los
   campos: el `.js` de la página los lee.

**Ojo con la CSP:** la web no permite `<script>` ni `style="…"` dentro del HTML.
El JavaScript va en `publico/assets/js/` y los estilos, en `publico/assets/css/`.
Si pones algo dentro del HTML, el navegador lo bloquea sin avisar (sale en la consola).

## Añadir una página nueva

Ejemplo: `/contacto`.

1. `src/rutas.js`: añade `'/contacto': 'publico/contacto',`.
2. `src/paginas/publico/contacto.js`:

   ```js
   import { Vista } from '../../lib/vista.js';

   export default async function () {
     Vista.mostrar('publico/contacto', {}, { titulo: 'Contacto', activa: 'contacto' });
   }
   ```

3. `vistas/publico/contacto.ejs`: el HTML (solo el contenido; la cabecera, el
   menú y el pie los pone `base.ejs`).
4. Si quieres que salga en el menú, añádela en `vistas/menu-cliente.ejs`.

## Ver los cambios

- **En tu ordenador** (README, «Probar en local»): `npm start` y abre
  `http://127.0.0.1:8092`. Los cambios en `vistas/` y en `publico/` se ven
  recargando el navegador. Los de `src/` necesitan parar y volver a hacer `npm start`.
- **En el servidor**: `git pull` en la copia del proyecto y
  `sudo bash despliegue/instalar.sh` (copia el código a `/opt/mesalista-web` y
  reinicia la web). No edites `/opt/mesalista-web` directamente: la próxima
  instalación lo sobrescribe.
- Si cambias `mesalista.css` o un `.js` de `publico/assets/` y no ves el cambio,
  recarga sin caché (Ctrl+F5). nginx deja que el navegador los guarde una hora.
