export function querySelector(selectors) {
  const element = document.querySelector(selectors);
  if (!element)
    throw Error(`No matching Element for "${selectors}"`);
  return element;
}
export function getElementById(id) {
  const element = document.getElementById(id);
  if (!element)
    throw Error(`HTML Element ${id} was not found!`);
  return element;
}
export function removeFromArray(array, element) {
  array.splice(array.indexOf(element), 1);
}
export const snap = (target) => (offset) => (value) => value > target - offset && value < target + offset ? target : value;
