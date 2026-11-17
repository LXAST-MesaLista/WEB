// MesaLista · comportamiento común de la web (sin scripts en línea: CSP).
'use strict';

const ML = {
  /** Token CSRF de la página, para las llamadas a /ajax/…. */
  csrf() {
    const meta = document.querySelector('meta[name="csrf"]');
    return meta ? meta.content : '';
  },

  /** Llamada JSON a la propia web; devuelve los datos o lanza un Error con .code. */
  async ajax(method, url, body) {
    const opciones = { method, headers: { Accept: 'application/json' }, credentials: 'same-origin' };
    if (method !== 'GET') {
      opciones.headers['X-CSRF-Token'] = ML.csrf();
    }
    if (body !== undefined) {
      opciones.headers['Content-Type'] = 'application/json';
      opciones.body = JSON.stringify(body);
    }
    const res = await fetch(url, opciones);
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) {
      const error = new Error((datos.error && datos.error.message) || 'Ha habido un problema. Inténtalo de nuevo.');
      error.code = datos.error && datos.error.code;
      error.status = res.status;
      throw error;
    }
    return datos;
  },
};

document.addEventListener('DOMContentLoaded', () => {
  // «Repite la contraseña»: el navegador avisa si no coincide.
  document.querySelectorAll('input[data-igual-a]').forEach((repetida) => {
    const original = document.getElementById(repetida.dataset.igualA);
    const comprobar = () => repetida.setCustomValidity(
      repetida.value !== '' && original && repetida.value !== original.value ? 'Las contraseñas no coinciden.' : '');
    repetida.addEventListener('input', comprobar);
    if (original) original.addEventListener('input', comprobar);
  });

  // Avisos destacados (p. ej. «no queda mesa libre»): ventana que hay que cerrar a mano.
  document.querySelectorAll('.modal[data-abrir-al-cargar]').forEach((m) => {
    if (window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(m).show();
  });

  // Día y comensales: al cambiarlos se piden las horas libres (sin JavaScript, con el botón).
  document.querySelectorAll('form[data-auto-enviar]').forEach((form) => {
    form.addEventListener('change', (ev) => {
      if (ev.target.hasAttribute('data-no-auto')) return;
      if (ev.target.matches('input[type="date"]') && !ev.target.value) return;
      form.requestSubmit();
    });
  });

  // Contador de caracteres de las notas («12/200»).
  document.querySelectorAll('textarea[data-contador]').forEach((area) => {
    const contador = document.getElementById(area.dataset.contador);
    const max = area.getAttribute('maxlength');
    area.addEventListener('input', () => { contador.textContent = `${area.value.length}/${max}`; });
  });

  // Opciones de menú o nota sin consentimiento: se avisa de que no se guardarán.
  document.querySelectorAll('[data-extras]').forEach((caja) => {
    const aviso = caja.querySelector('[data-aviso-consentimiento]');
    const consentimiento = caja.querySelector('input[name="consent"]');
    const revisar = () => {
      const hayDatos = caja.querySelector('input[name="menu_options[]"]:checked') !== null
        || caja.querySelector('textarea[name="note"]').value.trim() !== '';
      aviso.classList.toggle('d-none', !hayDatos || consentimiento.checked);
    };
    caja.addEventListener('input', revisar);
    caja.addEventListener('change', revisar);
    revisar();
  });

  // QR de la reserva, dibujado en SVG con qrcode-generator.
  document.querySelectorAll('[data-qr]').forEach((caja) => {
    if (typeof qrcode !== 'function') return;
    const qr = qrcode(0, 'M');
    qr.addData(caja.dataset.qr);
    qr.make();
    const n = qr.getModuleCount();
    const margen = 4;
    const lado = n + margen * 2;
    let d = '';
    for (let fila = 0; fila < n; fila++) {
      for (let col = 0; col < n; col++) {
        if (qr.isDark(fila, col)) d += `M${col + margen} ${fila + margen}h1v1h-1z`;
      }
    }
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${lado} ${lado}`);
    svg.setAttribute('shape-rendering', 'crispEdges');
    svg.setAttribute('aria-hidden', 'true');
    const fondo = document.createElementNS(ns, 'rect');
    fondo.setAttribute('width', lado);
    fondo.setAttribute('height', lado);
    fondo.setAttribute('fill', '#fff');
    const modulos = document.createElementNS(ns, 'path');
    modulos.setAttribute('d', d);
    modulos.setAttribute('fill', '#000');
    svg.append(fondo, modulos);
    caja.replaceChildren(svg);
  });

  // Cuenta atrás para pagar la señal; al llegar a cero se recarga la página.
  document.querySelectorAll('[data-cuenta-atras]').forEach((reloj) => {
    const fin = Date.now() + Number(reloj.dataset.cuentaAtras) * 1000;
    const tic = () => {
      const quedan = Math.max(0, Math.round((fin - Date.now()) / 1000));
      reloj.textContent = `${Math.floor(quedan / 60)}:${String(quedan % 60).padStart(2, '0')}`;
      if (quedan === 0) {
        clearInterval(temporizador);
        window.setTimeout(() => window.location.reload(), 1500);
      }
    };
    const temporizador = setInterval(tic, 1000);
    tic();
  });

  // Al enviar un formulario, su botón se desactiva (evita reservas dobles por doble clic).
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      if (form.dataset.enviando === '1') {
        ev.preventDefault();
        return;
      }
      form.dataset.enviando = '1';
      const boton = ev.submitter || form.querySelector('button[type="submit"]');
      if (boton && boton.classList.contains('btn')) {
        boton.insertAdjacentHTML('afterbegin', '<span class="spinner-border me-2" aria-hidden="true"></span>');
        // Se desactiva después del envío: un botón desactivado no envía su
        // name=value («Sentar aquí», «Mover» o «Unir»…). El doble clic ya lo
        // impide data-enviando.
        window.setTimeout(() => { boton.disabled = true; }, 0);
      }
    });
  });

  // Confirmación antes de acciones que no se pueden deshacer (data-confirmar="¿Seguro…?").
  document.querySelectorAll('form[data-confirmar]').forEach((form) => {
    form.addEventListener('submit', (ev) => {
      if (!window.confirm(form.dataset.confirmar)) {
        ev.preventDefault();
        ev.stopImmediatePropagation();
      }
    }, true);
  });
});

// Si el usuario vuelve atrás a una página con un formulario ya enviado, se reactiva.
window.addEventListener('pageshow', (ev) => {
  if (!ev.persisted) return;
  document.querySelectorAll('form[data-enviando="1"]').forEach((form) => {
    delete form.dataset.enviando;
    form.querySelectorAll('button[disabled]').forEach((b) => {
      b.disabled = false;
      const s = b.querySelector('.spinner-border');
      if (s) s.remove();
    });
  });
});
