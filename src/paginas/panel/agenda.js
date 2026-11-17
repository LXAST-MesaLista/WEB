// Agenda de un día (RF-22, RF-23, RF-27, RF-31, RF-47): reservas con
// búsqueda por nombre o teléfono, bloqueos del día y acciones.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Api } from '../../lib/api.js';
import { esFecha } from '../../lib/formato.js';
import { Panel } from '../../lib/zonas.js';
import { url, siguiente, recortar } from '../../lib/html.js';

export default async function () {
  Panel.exigir();
  const ctx = peticion();
  const cfg = await Api.config();
  let fecha = texto(ctx.get.fecha, Sesion.leer('agenda') ?? cfg.today);
  if (!esFecha(fecha)) {
    fecha = cfg.today;
  }
  Sesion.poner('agenda', fecha);
  const q = texto(ctx.get.q).trim();

  const reservas = (await Api.panel('GET', url('/panel/reservations', { date: fecha, q: recortar(q, 80) }))).datos().reservations;
  const bloqueos = (await Api.panel('GET', url('/panel/holds', { date: fecha }))).datos().holds;
  const activas = reservas.filter((r) => ['confirmed', 'seated', 'pending_payment'].includes(r.status));

  Panel.mostrar('panel/agenda', {
    fecha,
    hoy: cfg.today,
    q,
    reservas,
    bloqueos,
    comensales: activas.reduce((n, r) => n + Number(r.party), 0),
    volver: siguiente(ctx.uri),
  }, 'Agenda', 'agenda', { recargar: true });
}
