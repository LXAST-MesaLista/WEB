// Confirmar la reserva (RF-07 a RF-13, RP-04). El formulario lleva un
// request_id: si el envío se repite (doble clic, recarga, corte de red), el
// servidor devuelve la misma reserva en lugar de crear otra (RF-10).

import { peticion, texto, enteroValido } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato, esFecha, esHora } from '../../lib/formato.js';
import { Cliente } from '../../lib/zonas.js';
import { url, siguiente } from '../../lib/html.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export default async function () {
  const ctx = peticion();
  const { get, post, metodo } = ctx;
  const cfg = await Api.config();
  const fecha = texto(get.fecha);
  const hora = texto(get.hora);
  const personas = enteroValido(get.personas);
  if (!esFecha(fecha) || !esHora(hora) || personas === null) {
    Vista.redirigir('/reservar');
  }
  const volver = url('/reservar', { fecha, personas });
  const datos = { cfg, fecha, hora, personas, volver };

  if (Sesion.usuario('cliente') === null) {
    if (metodo === 'POST') {
      Cliente.exigir();
    }
    Vista.mostrar('cliente/confirmar-sin-sesion', { ...datos, next: siguiente(ctx.uri) },
      { titulo: 'Confirmar reserva', activa: 'reservar', ancho: 'estrecho' });
  }

  let extras = { menu_options: [], note: '', consent: false };
  let requestId = Formato.uuid();
  let errores = {};
  if (metodo === 'POST') {
    extras = Cliente.extras();
    const enviado = texto(post.request_id);
    requestId = UUID.test(enviado) ? enviado : requestId;
    const r = await Api.cliente('POST', '/reservations', {
      request_id: requestId, date: fecha, time: hora, party: personas, ...Cliente.extrasApi(extras),
    });
    if (r.ok()) {
      Sesion.aviso('success', r.body.replayed
        ? 'Tu reserva ya estaba registrada.'
        : '¡Reserva confirmada! Tienes el QR en «Mis reservas».');
      Vista.redirigir(`/reservas/${Number(r.body.reservation.id)}`);
    }
    if (r.code() === 'conflict') {
      // Otra persona se ha adelantado: a elegir otra hora.
      Sesion.aviso('warning', r.message());
      Vista.redirigir(volver);
    }
    errores = Vista.errores(r);
  }

  Vista.mostrar('cliente/confirmar', { ...datos, extras, requestId, errores },
    { titulo: 'Confirmar reserva', activa: 'reservar' }, Object.keys(errores).length ? 400 : 200);
}
