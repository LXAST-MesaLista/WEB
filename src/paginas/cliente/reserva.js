// Detalle de una reserva con su QR (RF-18), la señal de los grupos (RF-44)
// y las acciones que permite (modificar, cancelar, pagar).

import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato } from '../../lib/formato.js';
import { Cliente, Panel } from '../../lib/zonas.js';

export default async function (p) {
  Cliente.exigir();
  const id = p.id;
  Cliente.resultadoPago(`/reservas/${id}`);

  await Api.config();
  const r = (await Api.cliente('GET', `/reservations/${id}`)).datos().reservation;

  Vista.mostrar('cliente/reserva', {
    r,
    opciones: Panel.opciones(r.menu_options),
    pagada: r.deposit?.payment === 'captured',
  }, {
    titulo: `Reserva del ${Formato.fechaCorta(r.date)}`,
    activa: 'reservas',
    scripts: r.qr !== null ? ['/assets/vendor/qrcode-generator-1.4.4.js'] : [],
  });
}
