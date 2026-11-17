// Modificar una reserva (RF-13, RF-15): día, comensales, hora y extras.
// En las de grupo solo se cambian el menú y la nota (lo demás, por teléfono).

import { peticion, texto, enteroValido } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato, esFecha, esHora } from '../../lib/formato.js';
import { Cliente } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function (p) {
  Cliente.exigir();
  const { get, post, metodo } = peticion();
  const id = p.id;
  const cfg = await Api.config();
  const r = (await Api.cliente('GET', `/reservations/${id}`)).datos().reservation;
  if (!r.modifiable) {
    Sesion.aviso('warning', 'Esta reserva ya no se puede modificar.');
    Vista.redirigir(`/reservas/${id}`);
  }

  const hoy = cfg.today;
  const maxDia = Formato.sumarDias(hoy, Number(cfg.max_advance_days));
  let fecha = texto(get.fecha, r.date);
  if (!esFecha(fecha) || fecha < hoy || fecha > maxDia) {
    fecha = r.date;
  }
  let personas = enteroValido(get.personas ?? r.party) || Number(r.party);
  personas = Math.max(Number(cfg.min_party), Math.min(Number(cfg.max_party), personas));
  let hora = r.time;
  let extras = {
    menu_options: r.menu_options,
    note: String(r.note ?? ''),
    consent: r.menu_options.length > 0 || r.note !== null,
  };

  let errores = {};
  if (metodo === 'POST') {
    extras = Cliente.extras();
    let cambios = Cliente.extrasApi(extras);
    if (!r.group) {
      hora = texto(post.hora);
      cambios = { ...cambios, date: fecha, time: hora, party: personas };
    }
    if (!r.group && !esHora(hora)) {
      errores = { _: 'Elige una hora.' };
    } else {
      const res = await Api.cliente('PATCH', `/reservations/${id}`, cambios);
      if (res.ok()) {
        const nueva = res.body.reservation;
        const cambiaQr = nueva.qr !== r.qr;
        Sesion.aviso('success', `Reserva modificada.${cambiaQr ? ' Usa el QR nuevo: el anterior ya no vale.' : ''}`);
        Vista.redirigir(`/reservas/${id}`);
      }
      errores = Vista.errores(res);
    }
  }

  let horas = [];
  let errorHoras = null;
  if (!r.group) {
    const disp = await Api.call('cliente', 'GET', url('/availability', { date: fecha, party: personas }));
    horas = disp.ok() ? [...disp.body.times] : [];
    errorHoras = disp.ok() ? null : disp.message();
    if (fecha === r.date) {
      horas.push(r.time);   // su propia hora sigue siendo una opción
    }
    horas = [...new Set(horas)].sort();
  }

  Vista.mostrar('cliente/modificar', { cfg, r, hoy, maxDia, fecha, personas, hora, horas, errorHoras, extras, errores },
    { titulo: 'Modificar reserva', activa: 'reservas' }, Object.keys(errores).length ? 400 : 200);
}
