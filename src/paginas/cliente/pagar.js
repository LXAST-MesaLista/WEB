// Pagar la señal de un grupo (RF-44): el servidor crea el pedido en PayPal y
// devuelve su página; al terminar, PayPal vuelve al servidor y este a
// /reservas/{id}?pago=… (dirección configurada en el servidor).

import { peticion } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Cliente } from '../../lib/zonas.js';

export default async function (p) {
  Cliente.exigir();
  const id = p.id;
  if (peticion().metodo !== 'POST') {
    Vista.redirigir(`/reservas/${id}`);
  }
  const r = await Api.cliente('POST', `/reservations/${id}/pay`, { from: 'web' });
  const destino = r.body.approve_url ?? null;
  if (r.ok() && typeof destino === 'string' && /^https?:\/\//.test(destino)) {
    Vista.redirigir(destino);
  }
  Sesion.aviso('danger', r.message());
  Vista.redirigir(`/reservas/${id}`);
}
