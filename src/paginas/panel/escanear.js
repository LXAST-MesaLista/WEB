// Escanear el QR al llegar (RF-19 a RF-21, RF-23, RS-07). La cámara la
// maneja JavaScript (jsQR); también vale un lector de QR USB, que escribe
// el contenido en el campo y pulsa Intro. El resultado se guarda en la
// sesión y la página se vuelve a pedir con GET (así recargar no lo repite).

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato } from '../../lib/formato.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigir();
  const { post, metodo } = peticion();
  if (metodo === 'POST') {
    const qr = texto(post.qr).trim();
    const r = await Api.panel('POST', '/panel/arrive-qr', { qr, early: post.early === '1' });
    if (r.ok()) {
      await Api.config();
      const res = r.body.reservation;
      const lineas = [
        `${res.tables.length > 1 ? 'Mesas ' : 'Mesa '}${Panel.mesas(res)} (${res.zone}) · ${Formato.personas(res.party)}`,
        res.name ?? '',
        res.note !== null && res.note !== undefined ? `Nota: ${res.note}` : '',
        Panel.opciones(res.menu_options).join(', '),
      ];
      Sesion.poner('_escaneo', { tipo: 'ok', titulo: 'Llegada registrada', lineas: lineas.filter((l) => l !== '') });
    } else {
      Sesion.poner('_escaneo', {
        tipo: r.alerta() ? 'alerta' : 'error',
        titulo: 'QR rechazado',
        lineas: [r.message()],
        anticipar: r.code() === 'too_early' && r.extra('early_possible') === true ? qr : null,
      });
    }
    Vista.redirigir('/panel/escanear');
  }

  const resultado = Sesion.leer('_escaneo');
  Sesion.quitar('_escaneo');
  Panel.mostrar('panel/escanear', { resultado }, 'Escanear QR', 'escanear',
    { scripts: ['/assets/vendor/jsQR-1.4.0.js'] });
}
