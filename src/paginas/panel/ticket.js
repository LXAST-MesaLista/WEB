// Ticket de una reserva hecha en el local (RF-29, RP-07): fecha, hora,
// comensales, QR y código. Deja de existir cuando el cliente la vincula a su cuenta.

import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigir();
  const t = (await Api.panel('GET', `/panel/reservations/${p.id}/ticket`)).datos().ticket;
  Panel.mostrar('panel/ticket', { t }, 'Ticket de la reserva', 'nueva',
    { scripts: ['/assets/vendor/qrcode-generator-1.4.4.js'] });
}
