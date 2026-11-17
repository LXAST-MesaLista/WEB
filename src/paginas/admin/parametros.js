// Parámetros del servicio (RF-37), PIN de «Cerrar local» y opciones de menú.
// Los cambios de parámetros solo afectan a las reservas creadas después.

import { peticion, entero } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel, Admin } from '../../lib/zonas.js';

export default async function () {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  const datos = (await Api.panel('GET', '/admin/settings')).datos();
  let valores = datos.settings;
  let errores = {};
  if (metodo === 'POST') {
    const nuevos = {};
    for (const k of Object.keys(Admin.PARAMETROS)) {
      nuevos[k] = post[k] !== undefined ? entero(post[k]) : Number(valores[k]);
    }
    const r = await Api.panel('PUT', '/admin/settings', nuevos);
    if (r.ok()) {
      Sesion.aviso('success', 'Parámetros guardados.');
      Vista.redirigir('/panel/admin/parametros');
    }
    valores = { ...valores, ...nuevos };
    errores = Vista.errores(r, {}, Admin.PARAMETROS);
  }

  Panel.mostrar('admin/parametros', {
    valores,
    rangos: datos.ranges,
    opciones: datos.menu_options,
    pin: datos.close_pin_set,
    errores,
  }, 'Parámetros', 'admin-parametros', {}, Object.keys(errores).length ? 400 : 200);
}
