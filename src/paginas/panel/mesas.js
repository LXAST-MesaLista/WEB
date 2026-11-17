// Mesas de una reserva: moverla a otra mesa, unirle mesas libres o separar
// las unidas. Solo se ofrecen mesas libres durante toda la reserva (y ahora
// mismo, si ya está en curso).

import { peticion, texto, entero } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { esFecha } from '../../lib/formato.js';
import { Panel } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function (p) {
  Panel.exigir();
  const { get, post, metodo } = peticion();
  const id = p.id;
  const cfg = await Api.config();
  let fecha = texto(get.fecha, cfg.today);
  if (!esFecha(fecha)) {
    fecha = cfg.today;
  }
  const volver = Panel.volver(url('/panel/agenda', { fecha }));
  const aqui = url(`/panel/reservas/${id}/mesas`, { fecha, volver });

  if (metodo === 'POST') {
    const accion = texto(post.accion);
    const ids = Panel.idsMesas();
    const [cuerpo, mensaje] = {
      move: [{ table_id: ids[0] ?? 0 }, 'Reserva movida de mesa.'],
      join: [{ table_ids: ids }, 'Mesas unidas.'],
      separate: [{ table_id: entero(post.table_id) }, 'Mesa separada.'],
    }[accion] ?? [null, ''];
    if (cuerpo === null) {
      Vista.redirigir(aqui);
    }
    if (accion === 'move' && ids.length !== 1) {
      Sesion.aviso('warning', 'Para mover la reserva, marca una sola mesa.');
      Vista.redirigir(aqui);
    }
    if (accion === 'join' && ids.length === 0) {
      Sesion.aviso('warning', 'Marca las mesas que quieres unir.');
      Vista.redirigir(aqui);
    }
    const r = await Api.panel('POST', `/panel/reservations/${id}/${accion}`, cuerpo);
    Panel.resultado(r, mensaje, r.ok() ? volver : aqui);
  }

  const reservas = (await Api.panel('GET', url('/panel/reservations', { date: fecha }))).datos().reservations;
  const reserva = reservas.find((r) => r.id === id) ?? null;
  if (reserva === null) {
    Vista.error(404, 'Reserva no encontrada', 'No está en la agenda de ese día.');
  }
  const libres = (await Api.panel('GET', `/panel/reservations/${id}/free-tables`)).datos().tables;
  const codigos = Object.fromEntries((await Api.panel('GET', '/panel/room')).datos().tables.map((t) => [t.code, t.id]));

  Panel.mostrar('panel/mesas', { r: reserva, libres, codigos, aqui, volver }, 'Mesas de la reserva', 'agenda');
}
