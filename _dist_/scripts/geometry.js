export function squaredDistance(p1, p2) {
  return (p1.x - p2.x) * (p1.x - p2.x) + (p1.y - p2.y) * (p1.y - p2.y);
}
export function getBoxCenter(box) {
  return {
    x: box.left + box.width / 2,
    y: box.top + box.height / 2
  };
}
export function getExpandedBox(box, offset) {
  return {
    left: box.left - offset,
    top: box.top - offset,
    right: box.right + offset,
    bottom: box.bottom + offset,
    width: box.width + offset * 2,
    height: box.height + offset * 2
  };
}
export function getOffsetBox(element) {
  return {
    left: element.offsetLeft,
    top: element.offsetTop,
    right: element.offsetLeft + element.offsetWidth,
    bottom: element.offsetTop + element.offsetHeight,
    width: element.offsetWidth,
    height: element.offsetHeight
  };
}
export function intersectLineBox(p1, p2, box) {
  const left = {
    p1: {x: box.left, y: box.top},
    p2: {x: box.left, y: box.bottom}
  };
  const top = {
    p1: {x: box.left, y: box.top},
    p2: {x: box.right, y: box.top}
  };
  const right = {
    p1: {x: box.right, y: box.top},
    p2: {x: box.right, y: box.bottom}
  };
  const bottom = {
    p1: {x: box.left, y: box.bottom},
    p2: {x: box.right, y: box.bottom}
  };
  return intersectLines(p1, p2, left.p1, left.p2) || intersectLines(p1, p2, top.p1, top.p2) || intersectLines(p1, p2, right.p1, right.p2) || intersectLines(p1, p2, bottom.p1, bottom.p2);
}
function intersectLines(p1, p2, p3, p4) {
  if (p1.x === p2.x && p1.y === p2.y || p3.x === p4.x && p3.y === p4.y) {
    return null;
  }
  const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (denominator === 0) {
    return null;
  }
  let ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
  let ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
  if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
    return null;
  }
  let x = p1.x + ua * (p2.x - p1.x);
  let y = p1.y + ua * (p2.y - p1.y);
  return {x, y};
}
