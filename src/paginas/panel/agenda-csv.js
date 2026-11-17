// Reservas de un día en CSV (RF-47): el servidor genera el archivo y la web lo entrega.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { esFecha } from '../../lib/formato.js';
import { Panel } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function () {
  Panel.exigir();
  let fecha = texto(peticion().get.fecha);
  if (!esFecha(fecha)) {
    fecha = (await Api.config()).today;
  }
  const r = await Api.panel('GET', url('/panel/reservations.csv', { date: fecha }));
  if (!r.ok()) {
    Sesion.aviso('danger', r.message());
    Vista.redirigir(url('/panel/agenda', { fecha }));
  }
  Vista.archivo('text/csv; charset=utf-8', `reservas-${fecha}.csv`, r.raw);
}
