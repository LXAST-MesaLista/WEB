# Manual: cambiar el estilo, la apariencia, la distribución y los textos de la web

Este manual explica **cómo** cambiar el aspecto de la web. Para saber **qué
archivo** corresponde a cada página, mira [paginas.md](paginas.md).

La web usa **Bootstrap 5.3** (clases como `btn`, `card`, `row`, `col-md-6`) y,
encima, los estilos propios de MesaLista. Casi todo se cambia en tres sitios:

| Quieres cambiar… | Archivo |
|---|---|
| Colores, tamaños, bordes, sombras | `publico/assets/css/mesalista.css` (y `panel.css` para el panel) |
| Distribución y textos de una página | `vistas/…/xxx.ejs` (HTML de la página) |
| Cabecera, menú y pie de todas las páginas | `vistas/base.ejs`, `vistas/menu-cliente.ejs`, `vistas/menu-panel.ejs` |

---

## 1. Antes de empezar

1. Arranca la web en tu ordenador (README, «Probar en local»):
   `npm start` y abre `http://127.0.0.1:8092`.
2. Cambia un archivo y **recarga el navegador**:
   - `vistas/*.ejs` y `publico/assets/*`: se ve al recargar. Si no ves un cambio
     de CSS, recarga sin caché (Ctrl+F5).
   - `src/*.js`: para `npm start` (Ctrl+C) y vuelve a arrancarlo.
3. Mira la página también **en móvil**: herramientas del navegador (F12) >
   icono de móvil. Y en **modo oscuro**: la web lo sigue del sistema.

**Dos reglas de seguridad de la web (CSP):**

- Nada de `<script>…</script>` ni `style="…"` dentro del HTML: el navegador
  los bloquea. Los estilos van en `publico/assets/css/`, y el JavaScript en
  `publico/assets/js/`.
- Todo (imágenes, fuentes, CSS) se sirve desde la propia web. No se pueden
  enlazar archivos de otros sitios (Google Fonts, CDN, imágenes externas):
  hay que descargarlos y guardarlos en `publico/assets/`.

---

## 2. Colores

Los colores están en variables al principio de `publico/assets/css/mesalista.css`.

### Cambiar el color de la marca (botones, enlaces, barra superior)

En el bloque `:root, [data-bs-theme="light"]`:

```css
--ml-marca: #a8432a;          /* color principal */
--ml-marca-rgb: 168, 67, 42;  /* el mismo color en números R, G, B */
--ml-marca-hover: #8f3923;    /* al pasar el ratón: un poco más oscuro */
--ml-marca-activa: #86351f;   /* al pulsar: más oscuro aún */
--ml-marca-suave: #f6e7e2;    /* fondos claros con el color de la marca */
```

Para cambiar a otro color (por ejemplo, verde `#2e7d5b`):

1. Cambia `--ml-marca` y `--ml-marca-rgb` (`46, 125, 91`).
2. Pon en `--ml-marca-hover` y `--ml-marca-activa` el mismo color, algo más oscuro.
3. Cambia también `--bs-link-color`, `--bs-link-color-rgb`,
   `--bs-link-hover-color` y `--bs-focus-ring-color` del mismo bloque, que
   llevan el color escrito en números.
4. En el bloque `[data-bs-theme="dark"]`, pon versiones **más claras** del color
   para los enlaces (`--bs-link-color`…): sobre fondo oscuro, el color de la
   marca tal cual se lee mal.
5. Busca el color antiguo (`a8432a` y `168, 67, 42`) en el archivo y cámbialo
   donde aparezca escrito a mano (bordes de los campos, sombra de los botones).

Mantén el mismo color en la app (`ui/tema/Tema.kt` del repositorio APP) para que
las dos se vean iguales.

### Otros colores

| Qué | Variable o regla |
|---|---|
| Fondo de las páginas | `--bs-body-bg` (claro) y el mismo en el bloque oscuro |
| Barra superior de la web de clientes | `.barra-marca` (usa `--ml-marca`) |
| Barra superior del panel | `--ml-panel` |
| Pie de página | `.pie` |
| Cabecera de la portada (el degradado) | `.portada-cabecera` |
| Colores de las mesas en el panel (libre, ocupada…) | variables `--ml-libre`, `--ml-ocupada`… al principio de `panel.css` |

Comprueba que el texto se lee bien sobre el color nuevo: el contraste mínimo
recomendado es 4,5:1. Hay comprobadores gratuitos en internet
(«contrast checker»).

---

## 3. Letra (tipografía)

Bootstrap usa la letra del sistema (Segoe UI en Windows, Roboto en Android…).

### Cambiar el tamaño o el grosor

Añade al final de `mesalista.css`:

```css
:root {
  --bs-body-font-size: 1.05rem;      /* tamaño del texto normal (1rem = 16 px) */
}
h1, .h1 { font-weight: 700; }        /* títulos más gruesos */
```

En una página concreta, usa las clases de Bootstrap: `fs-5` (más grande),
`small`, `fw-semibold`, `fw-bold`, `text-uppercase`.

### Usar otra fuente

1. Descarga la fuente en formato `.woff2` (por ejemplo, de Google Fonts con
   «google-webfonts-helper») y guárdala en `publico/assets/fuentes/`.
2. Añade al principio de `mesalista.css`:

   ```css
   @font-face {
     font-family: "Inter";
     src: url("/assets/fuentes/inter-v13-latin-regular.woff2") format("woff2");
     font-weight: 400;
     font-display: swap;
   }
   @font-face {
     font-family: "Inter";
     src: url("/assets/fuentes/inter-v13-latin-700.woff2") format("woff2");
     font-weight: 700;
     font-display: swap;
   }
   :root {
     --bs-body-font-family: "Inter", system-ui, sans-serif;
   }
   ```

No se puede enlazar `fonts.googleapis.com` directamente: la CSP lo bloquea.

---

## 4. Distribución (dónde va cada cosa)

### El esqueleto de todas las páginas

`vistas/base.ejs` dibuja, en este orden:

1. el **menú** (`menu-cliente.ejs` en la web de clientes, `menu-panel.ejs` en el panel),
2. los **avisos** verdes, amarillos o rojos (`alert`),
3. el **contenido** de la página (la plantilla `.ejs` de cada página),
4. el **pie** (`<footer class="pie">`).

Para añadir algo a todas las páginas (por ejemplo, el teléfono del restaurante
en el pie), se cambia `base.ejs`.

### Ancho de la página

Cada página elige su ancho en su `.js`, en `Vista.mostrar(…, { ancho: … })`:

| `ancho` | Cómo queda | Ejemplos |
|---|---|---|
| `'estrecho'` | Columna de 30rem centrada (`.ancho-estrecho`) | Entrar, Crear cuenta, Mi cuenta |
| sin poner | Ancho normal de Bootstrap (`container`) | Portada, Reservar |
| `'ancho'` | Toda la pantalla | Todo el panel del restaurante |

### Columnas (la rejilla de Bootstrap)

Dentro de una plantilla, las columnas se hacen con `row` y `col-…`. Ejemplo de la
portada (`vistas/publico/portada.ejs`):

```html
<div class="row g-4 align-items-center">
  <div class="col-lg-6"> texto de bienvenida </div>
  <div class="col-lg-6"> buscador de mesa </div>
</div>
```

- `col-lg-6`: media pantalla en ordenadores (≥ 992 px); en móvil, una debajo de otra.
- Para tres columnas: `col-md-4` en cada una. Para que ocupe todo: `col-12`.
- `g-4`: separación entre columnas. `align-items-center`: centradas en vertical.
- **Cambiar el orden:** mueve el bloque `<div class="col-…">…</div>` entero
  arriba o abajo. Para cambiar el orden solo en móvil: `order-first` /
  `order-lg-last`.

### Separaciones y alineación

Clases de Bootstrap, sin tocar el CSS:

| Clase | Efecto |
|---|---|
| `mb-3`, `mt-4`, `my-5` | Margen abajo, arriba o arriba y abajo (de 0 a 5) |
| `p-3`, `px-4`, `py-2` | Relleno interior |
| `text-center`, `text-end` | Alinear el texto |
| `d-none d-md-block` | Ocultar en móvil, mostrar en pantallas medianas o más grandes |
| `d-flex gap-2` | Poner elementos en fila con separación |
| `rounded-4`, `shadow-sm`, `border` | Esquinas redondeadas, sombra suave, borde |

### Menú

- Web de clientes: `vistas/menu-cliente.ejs`. Cada opción es una línea
  `opcion('id', '/direccion', 'Texto')`. Cambia el texto, el orden o bórrala.
  Para que una opción salga marcada, el `id` debe coincidir con `activa` en el
  `.js` de su página.
- Panel: `vistas/menu-panel.ejs`, de la misma forma.

---

## 5. Textos

| Texto | Dónde se cambia |
|---|---|
| Títulos, párrafos, botones y etiquetas de una página | Su plantilla `vistas/…/xxx.ejs` (tabla en [paginas.md](paginas.md)) |
| Título de la pestaña del navegador | El `.js` de la página: `{ titulo: 'Mi cuenta' }` en `Vista.mostrar` o `Panel.mostrar` |
| Mensajes verdes o rojos tras una acción («Parámetros guardados.»…) | El `.js` de la página: `Sesion.aviso('success', 'texto')`. En el panel, el 2.º texto de `Panel.resultado(r, 'texto', …)` |
| Etiqueta de un campo de formulario | En la plantilla: `campo('email', 'Correo electrónico', …)`; el 2.º texto es la etiqueta |
| Nombres de los estados («Confirmada», «Pendiente de pago»…) | `src/lib/formato.js` |
| Mensajes de error de la API («No hay mesa libre a esa hora»…) | Los escribe el servidor (repositorio Servidor), no la web |
| Menú y pie | `menu-cliente.ejs`, `menu-panel.ejs` y `base.ejs` |

Al cambiar textos en una plantilla:

- Escribe el texto tal cual, con tildes y eñes: los archivos están en UTF-8.
- No borres lo que va entre `<%` y `%>`: son los datos (nombre, fecha…).
  Por ejemplo, en `Hola, <%= usuario.name %>` solo se cambia «Hola,».
- Para buscar dónde está un texto que ves en pantalla, búscalo en todo el
  proyecto (en VS Code: Ctrl+Mayús+F).

---

## 6. Imágenes, logotipo e icono

| Qué | Cómo |
|---|---|
| Icono de la pestaña y logotipo del menú | Sustituye `publico/assets/icono.svg` (mismo nombre, formato SVG) |
| Una imagen nueva (foto del restaurante…) | Guárdala en `publico/assets/img/` y ponla en la plantilla: `<img src="/assets/img/sala.jpg" class="img-fluid rounded-4" alt="Sala del restaurante">` |

- `img-fluid` hace que no se salga de la pantalla en móvil.
- Pon siempre un `alt` que describa la imagen (lectores de pantalla).
- Usa imágenes ligeras: JPG o WebP de menos de 300 KB.

---

## 7. Recetas rápidas

**Cambiar el título grande de la portada.** En `vistas/publico/portada.ejs`,
cambia `<h1 class="display-6 mb-3">Reserva tu mesa</h1>` y el párrafo
`<p class="lead …">` de debajo.

**Poner una foto en la portada.** En `portada.ejs`, dentro de la primera
`col-lg-6`, debajo del párrafo:
`<img src="/assets/img/sala.jpg" class="img-fluid rounded-4 mt-3" alt="Nuestra sala">`.

**Botones más redondeados en toda la web.** Al final de `mesalista.css`:

```css
.btn { --bs-btn-border-radius: 2rem; }
```

**Tarjetas con sombra.** En la plantilla, añade `shadow-sm` a la clase de la
tarjeta: `<div class="card shadow-sm">`.

**Añadir el teléfono en el pie.** En `vistas/base.ejs`, dentro de
`<footer class="pie">`, junto a «MesaLista · Reserva de mesas»:
`<span>Tel. 971 000 000</span>`.

**Ocultar una opción del menú.** En `menu-cliente.ejs`, borra su línea
`<%- opcion(…) %>` (la página sigue existiendo, solo deja de estar en el menú).

---

## 8. Qué no tocar

- En los formularios, `<%- Csrf.campo() %>` y los `name="…"` de los campos:
  la página los necesita para funcionar.
- Los atributos `data-…` (`data-confirmar`, `data-auto-enviar`, `data-qr`…):
  `mesalista.js` y `panel.js` los usan para su comportamiento.
- Las carpetas `publico/assets/bootstrap/` y `publico/assets/vendor/`: son las
  librerías originales. Los cambios de estilo van en `mesalista.css`, que se
  carga después y manda sobre Bootstrap.

---

## 9. Publicar los cambios

1. Comprueba en local las páginas que has tocado, en móvil y en modo oscuro.
2. Sube los cambios a GitHub (`git add`, `git commit`, `git push`).
3. En la máquina de Azure:

   ```bash
   cd ~/MesaLista-web && git pull && sudo bash despliegue/instalar.sh
   ```

Los cambios de CSS e imágenes se ven al momento; si alguien no los ve, que
recargue sin caché (el navegador guarda los archivos de `/assets` una hora).
