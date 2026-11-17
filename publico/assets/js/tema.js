// MesaLista · tema claro u oscuro según el sistema. Se carga en <head>,
// antes de pintar la página, para que no parpadee. También marca <html> con
// la clase «js»: los botones que solo hacen falta sin JavaScript se ocultan.
(function () {
  var raiz = document.documentElement;
  raiz.classList.add('js');
  var consulta = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function aplicar() {
    raiz.setAttribute('data-bs-theme', consulta && consulta.matches ? 'dark' : 'light');
  }
  aplicar();
  if (consulta && consulta.addEventListener) {
    consulta.addEventListener('change', aplicar);
  }
})();
