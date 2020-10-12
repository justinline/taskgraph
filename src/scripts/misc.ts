export function querySelector(selectors: string): Element {
  const element = document.querySelector(selectors);
  if (!element) throw Error(`No matching Element for "${selectors}"`);
  return element;
}

export function getElementById(id: string, dom = document): HTMLElement {
  const element = dom.getElementById(id);
  if (!element) throw Error(`HTML Element ${id} was not found!`);
  return element;
}

export function removeFromArray<T>(array: T[], element: T) {
  array.splice(array.indexOf(element), 1);
}

/**
 * Snaps *value* to *target* if close to *target* by less than *offset*
 */
export const snap = (target: number) => (offset: number) => (value: number) =>
  value > target - offset && value < target + offset ? target : value;
