// Bloqueos de mesas y franjas (RF-45): una mesa bloqueada no se ofrece a los
// clientes ni para sentar a nadie durante ese horario.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  Panel.exigir();
  const { post, metodo } = peticion();
  const hoy = (await Api.config()).today;
  let datos = { date: hoy, from: '20:00', to: '00:00', todo_dia: false, reason: '', all: false, table_ids: [] };
  let errores = {};
  let r = null;
  if (metodo === 'POST') {
    datos = {
      date: texto(post.date, hoy),
      from: texto(post.from),
      to: texto(post.to),
      todo_dia: post.todo_dia === '1',
      reason: texto(post.reason).trim(),
      all: post.all === '1',
      table_ids: Panel.idsMesas(),
    };
    if (datos.todo_dia) {
      datos.from = '00:00';
      datos.to = '00:00';
    }
    const cuerpo = {
      date: datos.date, from: datos.from, to: datos.to, reason: datos.reason,
      ...(datos.all ? { all: true } : { table_ids: datos.table_ids }),
    };
    r = await Api.panel('POST', '/panel/holds', cuerpo);
    if (r.ok()) {
      Sesion.aviso('success', 'Bloqueo creado: esas mesas ya no se ofrecen.');
      Vista.redirigir('/panel/bloqueos');
    }
    if (r.code() === 'reservations_in_hold') {
      Sesion.aviso('alerta', r.message());
    }
    errores = r.code() === 'reservations_in_hold' ? {} : Vista.errores(r, {}, {
      from: 'Desde', to: 'Hasta', reason: 'Motivo', table_ids: 'Mesas',
    });
  }

  const mesas = (await Api.panel('GET', '/panel/room')).datos().tables.filter((t) => t.state !== 'out_of_service');
  const bloqueos = (await Api.panel('GET', '/panel/holds')).datos().holds;
  Panel.mostrar('panel/bloqueos', { hoy, datos, errores, mesas, bloqueos }, 'Bloqueos', 'bloqueos', {},
    Object.keys(errores).length || (r !== null && !r.ok()) ? 400 : 200);
}
