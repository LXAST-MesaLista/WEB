// Mis reservas (RF-14) y solicitudes de grupo (RF-43).

import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato } from '../../lib/formato.js';
import { Cliente } from '../../lib/zonas.js';

export default async function () {
  Cliente.exigir();
  Cliente.resultadoPago('/reservas');

  const reservas = (await Api.cliente('GET', '/reservations')).datos().reservations;
  const solicitudes = (await Api.cliente('GET', '/group-requests')).datos().requests;

  Vista.mostrar('cliente/reservas', {
    proximas: reservas.filter(Formato.pendiente),
    anteriores: reservas.filter((r) => !Formato.pendiente(r)),
    solicitudes,
  }, { titulo: 'Mis reservas', activa: 'reservas' });
}
