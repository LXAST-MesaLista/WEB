// MesaLista · web: direcciones y la página (src/paginas/…) que atiende cada una.
// {id} es un número: llega a la página en p.id.

export const RUTAS = {
  // Público y acceso de clientes
  '/': 'publico/portada',
  '/entrar': 'publico/entrar',
  '/registro': 'publico/registro',
  '/salir': 'publico/salir',
  '/recuperar': 'publico/recuperar',
  '/restablecer': 'publico/restablecer',

  // Zona del cliente
  '/reservar': 'cliente/reservar',
  '/reservar/confirmar': 'cliente/confirmar',
  '/reservas': 'cliente/reservas',
  '/reservas/{id}': 'cliente/reserva',
  '/reservas/{id}/modificar': 'cliente/modificar',
  '/reservas/{id}/cancelar': 'cliente/cancelar',
  '/reservas/{id}/pagar': 'cliente/pagar',
  '/vincular': 'cliente/vincular',
  '/grupos': 'cliente/grupos',
  '/grupos/{id}/cancelar': 'cliente/grupo-cancelar',
  '/cuenta': 'cliente/cuenta',
  '/cuenta/eliminar': 'cliente/cuenta-eliminar',
  '/avisos/leidos': 'cliente/avisos-leidos',

  // Panel del personal
  '/panel/entrar': 'panel/entrar',
  '/panel/salir': 'panel/salir',
  '/panel': 'panel/sala',
  '/panel/cerrar-local': 'panel/cerrar-local',
  '/panel/agenda': 'panel/agenda',
  '/panel/agenda.csv': 'panel/agenda-csv',
  '/panel/reservas/{id}/llegada': 'panel/llegada',
  '/panel/reservas/{id}/terminar': 'panel/terminar',
  '/panel/reservas/{id}/comensales': 'panel/comensales',
  '/panel/reservas/{id}/cancelar': 'panel/cancelar',
  '/panel/reservas/{id}/mesas': 'panel/mesas',
  '/panel/reservas/{id}/ticket': 'panel/ticket',
  '/panel/escanear': 'panel/escanear',
  '/panel/nueva': 'panel/nueva',
  '/panel/sin-reserva': 'panel/sin-reserva',
  '/panel/grupos': 'panel/grupos',
  '/panel/grupos/{id}/aceptar': 'panel/grupo-aceptar',
  '/panel/grupos/{id}/rechazar': 'panel/grupo-rechazar',
  '/panel/bloqueos': 'panel/bloqueos',
  '/panel/bloqueos/{id}/quitar': 'panel/bloqueo-quitar',
  '/ajax/panel/version': 'panel/ajax-version',

  // Administración (solo cuentas de administración)
  '/panel/admin/mesas': 'admin/mesas',
  '/panel/admin/mesas/{id}': 'admin/mesa',
  '/panel/admin/mesas/{id}/eliminar': 'admin/mesa-eliminar',
  '/panel/admin/plano': 'admin/plano',
  '/panel/admin/clientes': 'admin/clientes',
  '/panel/admin/estadisticas': 'admin/estadisticas',
  '/panel/admin/horario': 'admin/horario',
  '/panel/admin/horario/cerrar': 'admin/dia-cerrar',
  '/panel/admin/horario/abrir': 'admin/dia-abrir',
  '/panel/admin/parametros': 'admin/parametros',
  '/panel/admin/pin': 'admin/pin',
  '/panel/admin/menu': 'admin/menu-nueva',
  '/panel/admin/menu/{id}': 'admin/menu-opcion',
  '/panel/admin/personal': 'admin/personal',
  '/panel/admin/personal/{id}': 'admin/personal-cuenta',
};

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tabla compilada: [expresión regular, página]. */
export const TABLA = Object.entries(RUTAS).map(([patron, pagina]) => [
  new RegExp(`^${patron.split(/(\{\w+\})/).map((t) => {
    const m = /^\{(\w+)\}$/.exec(t);
    return m ? `(?<${m[1]}>[0-9]{1,18})` : escapar(t);
  }).join('')}$`),
  pagina,
]);
