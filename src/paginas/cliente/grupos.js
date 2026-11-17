// Solicitud de mesa para un grupo (RF-43): más de max_party personas. El
// restaurante la acepta o la rechaza; si la acepta y hay pasarela de pago,
// el cliente paga una señal (RF-44).

import { peticion, texto, entero } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Formato, esFecha, esHora } from '../../lib/formato.js';
import { Cliente } from '../../lib/zonas.js';
import { url } from '../../lib/html.js';

export default async function () {
  Cliente.exigir();
  const { get, post, metodo } = peticion();
  const cfg = await Api.config();
  const hoy = cfg.today;
  const maxDia = Formato.sumarDias(hoy, Number(cfg.max_advance_days));
  const minGrupo = Number(cfg.max_party) + 1;
  const maxGrupo = Math.max(minGrupo, Number(cfg.max_group_party));

  let fecha = texto(get.fecha, hoy);
  if (!esFecha(fecha) || fecha < hoy || fecha > maxDia) {
    fecha = hoy;
  }
  let datos = { personas: minGrupo, hora: '', note: '', consent: false };
  let errores = {};
  if (metodo === 'POST') {
    datos = {
      personas: entero(post.personas, minGrupo),
      hora: texto(post.hora),
      note: texto(post.note).trim(),
      consent: post.consent === '1',
    };
    if (!esHora(datos.hora)) {
      errores = { _: 'Elige una hora.' };
    } else {
      const r = await Api.cliente('POST', '/group-requests', {
        date: fecha, time: datos.hora, party: datos.personas,
        note: datos.note === '' ? null : datos.note, consent: datos.consent,
      });
      if (r.ok()) {
        Sesion.aviso('success', 'Solicitud enviada. El restaurante te responderá por correo y la verás en «Mis reservas».');
        Vista.redirigir('/reservas');
      }
      errores = Vista.errores(r, { party: 'personas', time: 'hora' });
    }
  }

  const t = await Api.cliente('GET', url('/group-requests/times', { date: fecha }));
  Vista.mostrar('cliente/grupos', {
    cfg, hoy, maxDia, fecha, minGrupo, maxGrupo,
    horas: t.ok() ? t.body.times : [], errorHoras: t.ok() ? null : t.message(),
    datos, errores,
  }, { titulo: 'Solicitud de grupo', activa: 'grupos' }, Object.keys(errores).length ? 400 : 200);
}
