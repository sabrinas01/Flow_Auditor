/**
 * Debounce utility (vanilla JS, sin bundler — se carga con <script>).
 *
 * IMPORTANT: The debounce delay is explicitly 1200 ms (1.2 s) as required.
 *
 * Why 1.2s? (short note)
 * - Reduce ruido en peticiones/filtrado al teclear rápido.
 * - Evita llamadas superfluas al backend / re-render costosos en UI.
 * - 1.2s es el valor acordado para mantener UX reactiva pero limitar tráfico.
 *
 * Usage (navegador):
 *   <script src="./src/utils/debounce.js"></script>
 *   const debouncedFn = debounce(fn); // usa el default de 1200 ms
 *   const debouncedCustom = debounce(fn, 500); // override si hace falta
 *
 * La función devuelta tiene un método .cancel() para abortar una invocación pendiente.
 */

function debounce(func, wait = 1200, options = { leading: false, trailing: true }) {
  let timeout = null;
  let lastArgs = null;
  let lastThis = null;
  let result = undefined;

  function invokeFunc() {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = lastThis = null;
    result = func.apply(context, args);
  }

  function startTimer() {
    timeout = setTimeout(() => {
      timeout = null;
      if (options.trailing && lastArgs) {
        invokeFunc();
      }
    }, wait);
  }

  function cancel() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    lastArgs = lastThis = null;
  }

  function wrapper(...args) {
    const esPrimeraLlamadaDelCiclo = !timeout;
    lastArgs = args;
    lastThis = this;

    // Debounce real: cada llamada reinicia el temporizador, en vez de dejar
    // correr el primero y solo aprovechar los args más recientes al final
    // (eso permitía que llamadas separadas por más de `wait` se ejecutaran
    // dos veces en vez de colapsar en una sola).
    if (timeout) {
      clearTimeout(timeout);
    }

    if (options.leading && esPrimeraLlamadaDelCiclo) {
      invokeFunc();
    }

    startTimer();

    return result;
  }

  wrapper.cancel = cancel;
  return wrapper;
}

// CommonJS opcional (para tests con Jest/Node) sin afectar el uso como <script> global.
if (typeof module !== "undefined" && module.exports) {
  module.exports = debounce;
}
