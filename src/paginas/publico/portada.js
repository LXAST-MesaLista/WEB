// Portada: buscar mesa (día y personas) y accesos a lo demás. Con sesión,
// también los avisos del restaurante (RF-32) y las próximas reservas.

import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato } from '../../lib/formato.js';

export default async function () {
  const r = await Api.call('cliente', 'GET', '/config');
  const cfg = r.ok() ? r.body : null;
  const usuario = Sesion.usuario('cliente');

  let avisos = [];
  let proximas = [];
  if (usuario !== null) {
    const n = await Api.cliente('GET', '/me/notifications');
    avisos = n.ok() ? n.body.notifications : [];
    const l = await Api.cliente('GET', '/reservations');
    proximas = l.ok() ? l.body.reservations.filter(Formato.pendiente) : [];
  }

  Vista.mostrar('publico/portada', {
    cfg,
    error: r.ok() ? null : r.message(),
    hoy: cfg?.today ?? Formato.hoy(),
    maxDia: cfg ? Formato.sumarDias(cfg.today, Number(cfg.max_advance_days)) : null,
    usuario,
    avisos,
    proximas,
  }, { titulo: 'MesaLista', activa: 'inicio' });
}
