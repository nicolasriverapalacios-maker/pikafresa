(() => {
  "use strict";
  const preferencia = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!("IntersectionObserver" in window) || !Element.prototype.animate) return;
  const vistos = new WeakSet();
  const enMovimiento = new Set();
  function animar(elemento, pasos, opciones) {
    if (preferencia.matches) return;
    const movimiento = elemento.animate(pasos, opciones);
    enMovimiento.add(movimiento);
    movimiento.finished.then(
      () => enMovimiento.delete(movimiento),
      () => enMovimiento.delete(movimiento),
    );
  }
  const observador = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((entrada) => {
        if (!entrada.isIntersecting) return;
        const elemento = entrada.target;
        observador.unobserve(elemento);
        const indice = elemento.classList.contains("producto")
          ? [...elemento.parentElement.children].indexOf(elemento) % 4
          : 0;
        animar(
          elemento,
          [
            { opacity: 0, transform: "translateY(18px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 480,
            delay: indice * 55,
            fill: "backwards",
            easing: "cubic-bezier(.2,.7,.3,1)",
          },
        );
      });
    },
    { threshold: 0.08 },
  );
  function observar(elemento) {
    if (vistos.has(elemento)) return;
    vistos.add(elemento);
    observador.observe(elemento);
  }
  document
    .querySelectorAll(
      ".hero-contenido,.hero-arte,.titulo-seccion,.como-pedir,.sucursal,.footer-marca,.producto",
    )
    .forEach(observar);
  const menu = document.getElementById("productos");
  if (menu)
    new MutationObserver((cambios) => {
      cambios.forEach((cambio) => {
        cambio.removedNodes.forEach((nodo) => {
          if (nodo.nodeType === 1) observador.unobserve(nodo);
        });
        cambio.addedNodes.forEach((nodo) => {
          if (nodo.nodeType === 1 && nodo.matches(".producto")) observar(nodo);
        });
      });
    }).observe(menu, { childList: true });
  const contador = document.getElementById("contador-carrito");
  if (contador)
    new MutationObserver(() => {
      animar(
        contador,
        [{ transform: "scale(1)" }, { transform: "scale(1.2)" }, { transform: "scale(1)" }],
        { duration: 280, easing: "ease-out" },
      );
    }).observe(contador, { childList: true, characterData: true, subtree: true });
  preferencia.addEventListener("change", () => {
    if (preferencia.matches) enMovimiento.forEach((movimiento) => movimiento.cancel());
  });
})();
