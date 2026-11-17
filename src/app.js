// MesaLista · web: atiende cada petición HTTP.
//
//   1. Archivos de /assets (en producción los sirve nginx antes de llegar aquí).
//   2. Cabeceras de seguridad, sesión y, en los POST, el token CSRF.
//   3. La página de src/paginas/… que corresponde a la dirección (src/rutas.js).
//   4. La página termina con un «Fin» (plantilla, redirección, JSON, archivo
//      o error) y aquí se escribe la respuesta.

import { createReadStream, statSync } from 'node:fs';
import { join, normalize, extname, sep } from 'node:path';
import { config, RAIZ } from './config.js';
import { TABLA } from './rutas.js';
import { conPeticion, peticion, Fin, interpretarFormulario } from './lib/peticion.js';
import { Sesion, idDeCookie, abrir, guardar, enCola } from './lib/sesion.js';
import { Csrf } from './lib/csrf.js';
import { fragmento, registrarAyudas } from './lib/vista.js';
import { Panel, Admin } from './lib/zonas.js';

registrarAyudas({ Panel, Admin });

const PUBLICO = join(RAIZ, 'publico');
const MAX_CUERPO = 1024 * 1024;
const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

// ---------------------------------------------------------------------------
// Cabeceras de seguridad. CSP: solo se cargan scripts, estilos e imágenes de
// esta web (ni scripts ni estilos en línea), y los formularios solo se envían
// aquí o a PayPal (pago de la señal; la vuelta pasa por la API, que está en
// este mismo dominio).
// ---------------------------------------------------------------------------
const CSP = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; "
  + "connect-src 'self'; form-action 'self' https://www.paypal.com https://www.sandbox.paypal.com; "
  + "frame-ancestors 'none'; base-uri 'none'; object-src 'none'";

const SEGURIDAD = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  // Las páginas llevan datos personales: el navegador no las guarda.
  'Cache-Control': 'no-store',
};

// ---------------------------------------------------------------------------
// Archivos estáticos (desarrollo; en producción, nginx)
// ---------------------------------------------------------------------------
const TIPOS = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function servirArchivo(req, res, ruta) {
  const archivo = normalize(join(PUBLICO, ruta));
  let st = null;
  if (archivo.startsWith(PUBLICO + sep)) {
    try {
      st = statSync(archivo);
    } catch {
      // no existe
    }
  }
  if (!st?.isFile() || !TIPOS[extname(archivo)]) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    res.end('No encontrado\n');
    return;
  }
  res.writeHead(200, {
    'Content-Type': TIPOS[extname(archivo)],
    'Content-Length': st.size,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': /^\/assets\/(bootstrap|vendor)\//.test(ruta)
      ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(archivo).pipe(res);
}

// ---------------------------------------------------------------------------
// Cuerpo de la petición
// ---------------------------------------------------------------------------
function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    const trozos = [];
    let total = 0;
    req.on('data', (t) => {
      total += t.length;
      if (total > MAX_CUERPO) {
        reject(Object.assign(new Error('cuerpo demasiado grande'), { status: 413 }));
        req.destroy();
        return;
      }
      trozos.push(t);
    });
    req.on('end', () => resolve(Buffer.concat(trozos).toString('utf8')));
    req.on('error', reject);
  });
}

async function formulario(req) {
  const tipo = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  const cuerpo = await leerCuerpo(req);
  if (tipo === 'application/x-www-form-urlencoded') {
    return interpretarFormulario(cuerpo);
  }
  if (tipo === 'application/json' && cuerpo !== '') {
    try {
      const json = JSON.parse(cuerpo);
      return json !== null && typeof json === 'object' && !Array.isArray(json) ? json : {};
    } catch {
      return {};
    }
  }
  return {};
}

// ---------------------------------------------------------------------------
// Páginas
// ---------------------------------------------------------------------------
const modulos = new Map();

async function pagina(nombre) {
  if (!modulos.has(nombre)) {
    modulos.set(nombre, (await import(`./paginas/${nombre}.js`)).default);
  }
  return modulos.get(nombre);
}

async function despachar() {
  const ctx = peticion();
  if (!['GET', 'HEAD', 'POST'].includes(ctx.metodo)) {
    ctx.cabeceras.Allow = 'GET, HEAD, POST';
    throw new Fin('error', { status: 405, titulo: 'Método no permitido', texto: 'Esta dirección no admite esa petición.' });
  }
  // Todo lo que cambia algo llega por POST y lleva el token CSRF.
  if (ctx.metodo === 'POST') {
    ctx.post = await formulario(ctx.req);
    Csrf.comprobar();
  }
  for (const [re, nombre] of TABLA) {
    const m = re.exec(ctx.ruta);
    if (m) {
      const p = Object.fromEntries(Object.entries(m.groups ?? {}).map(([k, v]) => [k, Number(v)]));
      await (await pagina(nombre))(p);
      throw new Error(`La página ${nombre} no ha terminado con una respuesta`);
    }
  }
  throw new Fin('error', { status: 404, titulo: 'Página no encontrada', texto: 'La dirección no existe o ya no está disponible.' });
}

/** HTML completo: la plantilla dentro del diseño común (vistas/base.ejs). */
async function paginaCompleta(nombre, datos, opc) {
  const contenido = fragmento(nombre, datos);
  const zona = opc.zona ?? 'cliente';
  const usuario = Sesion.usuario(zona === 'cliente' ? 'cliente' : 'panel');
  const grupos = zona === 'panel' && usuario !== null ? await Panel.gruposPendientes() : 0;
  // Los errores destacados («alerta») van en una ventana que hay que cerrar a mano.
  const todos = Sesion.avisos();
  return fragmento('base', {
    titulo: opc.titulo ?? 'MesaLista',
    contenido,
    zona,
    ancho: opc.ancho ?? 'normal',
    usuario,
    activa: opc.activa ?? '',
    scripts: opc.scripts ?? [],
    recargar: opc.recargar === true,
    grupos,
    avisos: todos.filter((a) => a[0] !== 'alerta'),
    alertas: todos.filter((a) => a[0] === 'alerta'),
  });
}

function paginaError(status, titulo, texto) {
  const panel = peticion().ruta.startsWith('/panel');
  return {
    status,
    nombre: 'error',
    datos: { titulo, texto, inicio: panel ? '/panel' : '/' },
    opc: { titulo, ancho: 'estrecho', zona: panel ? 'panel' : 'cliente' },
  };
}

/** Convierte el Fin de una página en { status, cabeceras, cuerpo }. */
async function respuesta(fin) {
  const ctx = peticion();
  switch (fin.tipo) {
    case 'redirigir':
      return { status: 303, cabeceras: { Location: fin.destino }, cuerpo: '' };
    case 'json':
      return {
        status: fin.status,
        cabeceras: { 'Content-Type': 'application/json; charset=utf-8' },
        cuerpo: JSON.stringify(fin.datos),
      };
    case 'archivo':
      return {
        status: 200,
        cabeceras: { 'Content-Type': fin.tipoArchivo,
          'Content-Disposition': `attachment; filename="${fin.nombreArchivo}"` },
        cuerpo: fin.cuerpo,
      };
    case 'error':
    case 'pagina': {
      const p = fin.tipo === 'error' ? paginaError(fin.status, fin.titulo, fin.texto) : fin;
      try {
        const html = await paginaCompleta(p.nombre, p.datos, p.opc);
        return { status: p.status, cabeceras: { 'Content-Type': 'text/html; charset=utf-8' }, cuerpo: html };
      } catch (err) {
        if (err instanceof Fin) {
          return respuesta(err);   // p. ej. la sesión ha caducado al contar los grupos
        }
        throw err;
      }
    }
    default:
      throw new Error(`Fin desconocido: ${fin.tipo} (${ctx.ruta})`);
  }
}

/** IP del navegador y protocolo: los envía nginx, y solo se creen si la conexión es local. */
function origen(req) {
  const remota = req.socket.remoteAddress ?? '127.0.0.1';
  if (!LOCAL.has(remota)) {
    return { ip: remota.replace(/^::ffff:/, ''), proto: req.socket.encrypted ? 'https' : 'http' };
  }
  const real = String(req.headers['x-real-ip'] ?? '').trim();
  const proto = String(req.headers['x-forwarded-proto'] ?? '').trim();
  return {
    ip: /^[0-9a-fA-F:.]{2,45}$/.test(real) ? real : remota.replace(/^::ffff:/, ''),
    proto: proto === 'https' || proto === 'http' ? proto : (config('https', true) === true ? 'https' : 'http'),
  };
}

export async function atender(req, res) {
  let dir;
  try {
    dir = new URL(req.url ?? '/', 'http://web.invalid');
  } catch {
    res.writeHead(400).end();
    return;
  }
  let ruta;
  try {
    ruta = decodeURIComponent(dir.pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && (ruta.startsWith('/assets/') || ruta === '/favicon.ico')) {
    servirArchivo(req, res, ruta === '/favicon.ico' ? '/assets/icono.svg' : ruta);
    return;
  }

  const id = idDeCookie(req);
  await enCola(id, async () => {
    const sesion = await abrir(id);
    const ctx = {
      req,
      res,
      metodo: req.method ?? 'GET',
      ruta: ruta === '/' ? '/' : ruta.replace(/\/+$/, ''),
      uri: dir.pathname + dir.search,   // dirección actual con su consulta, para volver a ella
      get: interpretarFormulario(dir.search.slice(1)),
      post: {},
      cabeceras: {},
      ...origen(req),
      sesion,
      cfg: null,
    };
    await conPeticion(ctx, async () => {
      let r;
      try {
        await despachar();
      } catch (err) {
        if (err instanceof Fin) {
          r = err;
        } else {
          if (err?.status !== 413) {
            console.error(`MesaLista web: error en ${ctx.metodo} ${ctx.ruta}:`, err);
          }
          r = new Fin('error', err?.status === 413
            ? { status: 413, titulo: 'Datos demasiado grandes', texto: 'El formulario enviado es demasiado grande.' }
            : { status: 500, titulo: 'Error en la web', texto: 'Ha habido un problema al preparar la página. Inténtalo de nuevo.' });
        }
      }
      let salida;
      try {
        salida = await respuesta(r);
      } catch (err) {
        console.error(`MesaLista web: error al mostrar ${ctx.ruta}:`, err);
        salida = { status: 500, cabeceras: { 'Content-Type': 'text/plain; charset=utf-8' }, cuerpo: 'Error en la web.\n' };
      }
      try {
        await guardar(sesion, res);
      } catch (err) {
        console.error('MesaLista web: no se ha podido guardar la sesión:', err);
      }
      const cuerpo = Buffer.from(salida.cuerpo, 'utf8');
      res.writeHead(salida.status, {
        ...SEGURIDAD,
        ...ctx.cabeceras,
        ...salida.cabeceras,
        'Content-Length': cuerpo.length,
      });
      res.end(ctx.metodo === 'HEAD' ? undefined : cuerpo);
    });
  });
}
