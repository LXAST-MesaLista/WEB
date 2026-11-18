// Mis reservas (RF-14) y solicitudes de grupo (RF-43).

import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato } from '../../lib/formato.js';
import { Cliente } from '../../lib/zonas.js';

const fechaHora = (x) => `${x.date} ${x.time}`;

/**
 * Reparte las reservas y las solicitudes de grupo entre las tres secciones,
 * sin que nada salga dos veces:
 *   - Solicitudes de grupo: las que esperan respuesta del local y las
 *     aceptadas que falta pagar (su reserva no sale también en «Próximas»).
 *   - No aceptadas: las que el local ha rechazado, con su motivo.
 *   - Próximas: las demás reservas pendientes.
 *   - Anteriores: las reservas terminadas y las solicitudes caducadas o
 *     canceladas antes de aceptarse. De una caducada solo sale la solicitud,
 *     no la reserva que se liberó. Las aceptadas ya confirmadas, o canceladas
 *     después, se ven por su reserva.
 */
export function repartir(reservas, solicitudes) {
  const porId = new Map(reservas.map((r) => [r.id, r]));
  const reservaDe = (g) => (g.reservation_id == null ? null : porId.get(g.reservation_id) ?? null);

  const esperando = solicitudes
    .filter((g) => g.status === 'pending' || (g.status === 'accepted' && reservaDe(g)?.status === 'pending_payment'))
    .map((g) => ({ ...g, reserva: reservaDe(g) }));
  const enSolicitudes = new Set(esperando.map((g) => g.reservation_id).filter((id) => id != null));

  const terminadas = solicitudes.filter((g) => g.status === 'expired'
    || (g.status === 'cancelled' && g.reservation_id == null));
  const tapadas = new Set(terminadas.map((g) => g.reservation_id).filter((id) => id != null));

  return {
    solicitudes: esperando,
    noAceptadas: solicitudes.filter((g) => g.status === 'rejected')
      .sort((a, b) => fechaHora(b).localeCompare(fechaHora(a))),
    proximas: reservas.filter((r) => Formato.pendiente(r) && !enSolicitudes.has(r.id)),
    anteriores: [
      ...reservas.filter((r) => !Formato.pendiente(r) && !tapadas.has(r.id)).map((r) => ({ r })),
      ...terminadas.map((g) => ({ g })),
    ].sort((a, b) => fechaHora(b.r ?? b.g).localeCompare(fechaHora(a.r ?? a.g))),
  };
}

export default async function () {
  Cliente.exigir();
  Cliente.resultadoPago('/reservas');

  const reservas = (await Api.cliente('GET', '/reservations')).datos().reservations;
  const solicitudes = (await Api.cliente('GET', '/group-requests')).datos().requests;

  Vista.mostrar('cliente/reservas', repartir(reservas, solicitudes), { titulo: 'Mis reservas', activa: 'reservas' });
}
