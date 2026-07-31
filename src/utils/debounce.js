/**
 * Debounce utility
 *
 * IMPORTANT: The debounce delay is explicitly 1200 ms (1.2 s) as required.
 * Documentación en código: cualquier persona leyendo este archivo debe ver
 * el valor por defecto y el razonamiento resumido aquí.
 *
 * Why 1.2s? (short note)
 * - Reduce ruido en peticiones/filtrado al teclear rápido.
 * - Evita llamadas superfluas al backend / re-render costosos en UI.
 * - 1.2s es el valor acordado para mantener UX reactiva pero limitar tráfico.
 *
 * Usage:
 *   import debounce from 'src/utils/debounce';
 *   const debouncedFn = debounce(fn); // uses default 1200 ms
 *   const debouncedCustom = debounce(fn, 500); // override if required
 *
 * The returned function has a .cancel() method to abort pending invocation.
 */

function debounce(func, wait = 1200, options = { leading: false, trailing: true }) {
  let timeout = null;
  let lastArgs = null;
  let lastThis = null;
  let result = undefined;
  let lastCallTime = null;

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
    lastArgs = args;
    lastThis = this;
    lastCallTime = Date.now();

    if (!timeout) {
      if (options.leading) {
        invokeFunc();
      }
      startTimer();
    }

    return result;
  }

  wrapper.cancel = cancel;
  return wrapper;
}

export default debounce;