// Sala (RF-25, RF-26, RF-34): estado de cada mesa ahora mismo, por mesa o
// sobre el plano, con terminar, añadir comensales y cambiar o unir mesas.
// La vista y la zona elegidas se recuerdan en la sesión.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';
import { siguiente } from '../../lib/html.js';

export default async function () {
  Panel.exigir();
  const ctx = peticion();
  const { get } = ctx;
  const pref = { vista: 'mesas', zona: '', ...(Sesion.leer('sala') ?? {}) };
  if (get.vista === 'mesas' || get.vista === 'mapa') {
    pref.vista = get.vista;
  }
  if (get.zona !== undefined) {
    pref.zona = get.zona === 'todas' ? '' : texto(get.zona);
  }
  Sesion.poner('sala', pref);

  const sala = (await Api.panel('GET', '/panel/room')).datos();
  const mesas = sala.tables;
  const zonas = [...new Set(mesas.map((t) => t.zone))];
  const zona = zonas.includes(pref.zona) ? pref.zona : '';
  const vistas = mesas.filter((t) => zona === '' || t.zone === zona);

  const cuentas = { free: 0, occupied: 0, blocked: 0, out_of_service: 0 };
  for (const t of vistas) {
    cuentas[t.state] = (cuentas[t.state] ?? 0) + 1;
  }
  const elegida = vistas.find((t) => String(t.id) === texto(get.mesa)) ?? null;

  Panel.mostrar('panel/sala', {
    mesas: vistas,
    zonas,
    zona,
    vista: pref.vista,
    ahora: sala.now,
    cuentas,
    elegida,
    hoy: (await Api.config()).today,
    volver: siguiente(ctx.uri),
  }, 'Sala', 'sala', { recargar: true });
}
