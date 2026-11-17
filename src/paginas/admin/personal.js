// Cuentas del personal (RF-38): crear, cambiar el rol, activar o desactivar
// y poner una contraseña nueva. POST aquí = cuenta nueva.

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function () {
  const yo = Panel.exigirAdmin();
  const { post, metodo } = peticion();
  let datos = { name: '', email: '', role: 'staff' };
  let errores = {};
  if (metodo === 'POST') {
    datos = {
      name: texto(post.name).trim(),
      email: texto(post.email).trim(),
      role: post.role === 'admin' ? 'admin' : 'staff',
    };
    const r = await Api.panel('POST', '/admin/staff', { ...datos, password: texto(post.password) });
    if (r.ok()) {
      Sesion.aviso('success', 'Cuenta creada. Comunica la contraseña inicial a la persona por un medio seguro.');
      Vista.redirigir('/panel/admin/personal');
    }
    errores = Vista.errores(r);
  }

  const cuentas = (await Api.panel('GET', '/admin/staff')).datos().staff;
  Panel.mostrar('admin/personal', { cuentas, yo, datos, errores },
    'Personal', 'admin-personal', {}, Object.keys(errores).length ? 400 : 200);
}
