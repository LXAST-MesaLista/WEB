// Reservar (RF-06): día y comensales → horas libres. Sin sesión también se
// pueden ver; para confirmar hace falta entrar.

import { peticion, texto, enteroValido } from '../../lib/peticion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato, esFecha } from '../../lib/formato.js';
import { url } from '../../lib/html.js';

export default async function () {
  const { get } = peticion();
  const cfg = await Api.config();
  const hoy = cfg.today;
  const maxDia = Formato.sumarDias(hoy, Number(cfg.max_advance_days));

  let fecha = texto(get.fecha, hoy);
  if (!esFecha(fecha) || fecha < hoy || fecha > maxDia) {
    fecha = hoy;
  }
  let personas = enteroValido(get.personas ?? 2) || 2;
  personas = Math.max(Number(cfg.min_party), Math.min(Number(cfg.max_party), personas));

  const r = await Api.call('cliente', 'GET', url('/availability', { date: fecha, party: personas }));
  const horas = r.ok() ? r.body.times : [];

  Vista.mostrar('cliente/reservar', {
    cfg,
    hoy,
    maxDia,
    fecha,
    personas,
    comidas: horas.filter((t) => t < '17:00'),
    cenas: horas.filter((t) => t >= '17:00'),
    error: r.ok() ? null : r.message(),
  }, { titulo: 'Reservar mesa', activa: 'reservar' });
}
