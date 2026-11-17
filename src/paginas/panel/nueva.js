// Reserva hecha en el local o por teléfono (RF-28, RF-29): el personal la
// registra con nombre y teléfono y se imprime un ticket con QR y código.

import { peticion, texto, entero } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato, esFecha, esHora } from '../../lib/formato.js';
import { Cliente, Panel } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function () {
  Panel.exigir();
  const { get, post, metodo } = peticion();
  const cfg = await Api.config();
  const hoy = cfg.today;
  const maxDia = Formato.sumarDias(hoy, Number(cfg.max_advance_days));
  let fecha = texto(get.fecha, hoy);
  if (!esFecha(fecha) || fecha < hoy || fecha > maxDia) {
    fecha = hoy;
  }
  const personas = Math.max(1, Math.min(255, entero(get.personas, 2)));
  const aqui = url('/panel/nueva', { fecha, personas });

  let datos = { name: '', phone: '', hora: '' };
  let extras = { menu_options: [], note: '', consent: false };
  let errores = {};
  if (metodo === 'POST') {
    datos = { name: texto(post.name).trim(), phone: texto(post.phone).trim(), hora: texto(post.hora) };
    extras = Cliente.extras();
    if (!esHora(datos.hora)) {
      errores = { _: 'Elige una hora.' };
    } else {
      const r = await Api.panel('POST', '/panel/reservations', {
        name: datos.name, phone: datos.phone, date: fecha, time: datos.hora, party: personas,
        ...Cliente.extrasApi(extras),
      });
      if (r.ok()) {
        Sesion.aviso('success', `Reserva registrada en la mesa ${r.body.reservation.table}. Imprime el ticket para el cliente.`);
        Vista.redirigir(`/panel/reservas/${Number(r.body.reservation.id)}/ticket`);
      }
      errores = Vista.errores(r);
      if (r.code() === 'conflict') {
        datos.hora = '';
      }
    }
  }

  const disp = await Api.panel('GET', url('/panel/availability', { date: fecha, party: personas }));
  Panel.mostrar('panel/nueva', {
    cfg, hoy, maxDia, fecha, personas, aqui,
    horas: disp.ok() ? disp.body.times : [], errorHoras: disp.ok() ? null : disp.message(),
    datos, extras, errores,
  }, 'Reserva en el local', 'nueva', {}, Object.keys(errores).length ? 400 : 200);
}
