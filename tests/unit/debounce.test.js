/**
 * Tests de src/utils/debounce.js con fake timers de Jest.
 */
const debounce = require('../../src/utils/debounce.js');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

test('no llama a la función antes de que pase el delay', () => {
  const fn = jest.fn();
  const debounced = debounce(fn, 1200);

  debounced();
  expect(fn).not.toHaveBeenCalled();

  jest.advanceTimersByTime(1199);
  expect(fn).not.toHaveBeenCalled();
});

test('llama a la función una vez pasado el delay (default 1200ms, el usado en el dashboard)', () => {
  const fn = jest.fn();
  const debounced = debounce(fn);

  debounced();
  jest.advanceTimersByTime(1200);
  expect(fn).toHaveBeenCalledTimes(1);
});

test('múltiples llamadas rápidas colapsan en una sola ejecución (trailing)', () => {
  const fn = jest.fn();
  const debounced = debounce(fn, 1200);

  debounced('a');
  jest.advanceTimersByTime(600);
  debounced('b');
  jest.advanceTimersByTime(600);
  debounced('c');
  jest.advanceTimersByTime(1200);

  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenCalledWith('c');
});

test('cancel() aborta la invocación pendiente', () => {
  const fn = jest.fn();
  const debounced = debounce(fn, 1200);

  debounced();
  debounced.cancel();
  jest.advanceTimersByTime(2000);

  expect(fn).not.toHaveBeenCalled();
});

test('respeta un wait custom distinto al default', () => {
  const fn = jest.fn();
  const debounced = debounce(fn, 300);

  debounced();
  jest.advanceTimersByTime(300);
  expect(fn).toHaveBeenCalledTimes(1);
});
