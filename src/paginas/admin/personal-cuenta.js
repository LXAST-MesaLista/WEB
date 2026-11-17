// Cambios en una cuenta del personal: rol, activar o desactivar, o
// contraseña nueva (el formulario indica qué cambia en «cambio»).

import { peticion, texto } from '../../lib/peticion.js';
import { Sesion } from '../../lib/sesion.js';
import { Vista } from '../../lib/vista.js';
import { Api } from '../../lib/api.js';
import { Panel } from '../../lib/zonas.js';

export default async function (p) {
  Panel.exigirAdmin();
  const { post, metodo } = peticion();
  if (metodo !== 'POST') {
    Vista.redirigir('/panel/admin/personal');
  }
  const activa = post.active === '1';
  const [cuerpo, mensaje] = {
    rol: [{ role: post.role === 'admin' ? 'admin' : 'staff' }, 'Rol actualizado.'],
    activa: [{ active: activa }, activa ? 'Cuenta activada.' : 'Cuenta desactivada: ya no puede iniciar sesión.'],
    contrasena: [{ password: texto(post.password) }, 'Contraseña cambiada.'],
  }[texto(post.cambio)] ?? [null, ''];
  if (cuerpo === null) {
    Vista.redirigir('/panel/admin/personal');
  }
  const r = await Api.panel('PATCH', `/admin/staff/${p.id}`, cuerpo);
  if (!r.ok() && r.field() === 'password') {
    Sesion.aviso('danger', r.message().replaceAll('«password»', '«Contraseña nueva»'));
    Vista.redirigir('/panel/admin/personal');
  }
  Panel.resultado(r, mensaje, '/panel/admin/personal');
}
