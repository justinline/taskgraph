import {
  squaredDistance,
  getBoxCenter,
  getExpandedBox,
  getOffsetBox,
  intersectLineBox,
  Point,
} from "./geometry.js";

import {
  getElementById,
  removeFromArray,
  snap,
  querySelector,
} from "./misc.js";

interface HTMLTaskElement extends HTMLElement {
  from: HTMLDependencyElement[];
  to: HTMLDependencyElement[];
}

interface HTMLDependencyElement extends HTMLElement {
  from: HTMLTaskElement;
  to: HTMLTaskElement;
}

interface Task {
  name: string;
  status: "todo" | "completed";
  pos: Point;
}

interface Dependency {
  predecessor: string;
  successor: string;
}

interface Graph {
  tasks: Task[];
  dependencies: Dependency[];
}

// Has the correct size
// Used to initially capture mouse events
const graphContainer = getElementById("graph");

// Contains the tasks and dependencies
// Will get translated around
const itemsContainer = getElementById("itemsContainer");

const arrows = getElementById("arrows");

const isTask = (e: HTMLElement) => e.tagName === "TG-TASK";

function getTasks(): HTMLTaskElement[] {
  const elements = Array.from(itemsContainer.children) as HTMLElement[];
  return elements.filter(isTask) as HTMLTaskElement[];
}

function getDependencies(): HTMLDependencyElement[] {
  const isDependency = (e: HTMLElement) => e.tagName == "path";
  const elements = Array.from(arrows.children) as HTMLElement[];
  return elements.filter(isDependency) as HTMLDependencyElement[];
}

export function clearGraph() {
  const removeElement = (e: HTMLElement) => {
    if (e.parentNode) e.parentNode.removeChild(e);
  };
  const tasks = getTasks();
  tasks.forEach(removeElement);
  const dependencies = getDependencies();
  dependencies.forEach(removeElement);
}

function getViewCenter(): Point {
  const box = getOffsetBox(graphContainer);
  const viewCenter = getBoxCenter(box);
  return {
    x: viewCenter.x - panzoom.pan.x,
    y: viewCenter.y - panzoom.pan.y,
  };
}

function computeCenteredPos(element: HTMLElement): Point {
  const viewCenter = getViewCenter();
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  return {
    x: viewCenter.x - width / 2,
    y: viewCenter.y - height / 2,
  };
}

interface AddTask extends Partial<Task> {
  name: string;
}

export function addTask(task: AddTask) {
  const htmlTask = (document.createElement(
    "tg-task"
  ) as unknown) as HTMLTaskElement;
  htmlTask.setAttribute("name", task.name);
  if (task.status) htmlTask.setAttribute("status", task.status);

  htmlTask.textContent = task.name;
  htmlTask.from = [];
  htmlTask.to = [];
  itemsContainer.appendChild(htmlTask);
  const pos = task.pos ? task.pos : computeCenteredPos(htmlTask);
  htmlTask.style.left = pos.x + "px";
  htmlTask.style.top = pos.y + "px";
  return htmlTask;
}

function addDependency(dependency: Dependency) {
  const dependencyHtml = (document.createElementNS(
    "http://www.w3.org/2000/svg",
    "path"
  ) as unknown) as HTMLDependencyElement;
  const tasks = getTasks();
  const predecessor = tasks.find(
    (task) => task.textContent == dependency.predecessor
  );
  if (!predecessor) {
    console.error(
      "Could not add dependency: predecessor not found",
      dependency
    );
    return;
  }
  const successor = tasks.find(
    (task) => task.textContent == dependency.successor
  );
  if (!successor) {
    console.error("Could not add dependency: successor not found.", dependency);
    return;
  }
  dependencyHtml.from = predecessor;
  dependencyHtml.to = successor;

  predecessor.from.push(dependencyHtml);
  successor.to.push(dependencyHtml);

  arrows.appendChild(dependencyHtml);

  updatePath(dependencyHtml);
}

function deleteTask(task: HTMLTaskElement) {
  const from = task.from.slice();
  from.forEach(deleteDependency);
  const to = task.to.slice();
  to.forEach(deleteDependency);
  itemsContainer.removeChild(task);
}

function deleteDependency(dependency: HTMLDependencyElement) {
  removeFromArray(dependency.from.from, dependency);
  removeFromArray(dependency.to.to, dependency);
  arrows.removeChild(dependency);
}

export function selectAll() {
  const tasks = getTasks();
  tasks.forEach((t) => t.classList.add("selected"));
  sendSelectionChanged(tasks);
}

export function deleteSelected() {
  const selected = getSelected();
  selected.forEach(deleteTask);
  sendSelectionChanged([]);
}

export function completeSelected() {
  const selected = getSelected();
  selected.forEach((task) => {
    const status = task.getAttribute("status");
    task.setAttribute("status", status === "completed" ? "todo" : "completed");
  });
}

function onTaskClicked(task: HTMLTaskElement, event: MouseEvent) {
  if (event.shiftKey) {
    task.classList.toggle("selected");
    sendSelectionChanged();
  } else {
    resetSelected();
    task.classList.add("selected");
    sendSelectionChanged([task]);
  }
}

/**
 * sends out a "selectionchanged" event
 * @param {[HTMLElement]} selection if known by the caller, passthrough
 */
function sendSelectionChanged(selection?: HTMLTaskElement[]) {
  graphContainer.dispatchEvent(
    new CustomEvent("selectionchanged", {
      detail: selection ? selection : getSelected(),
    })
  );
}

function getSelected() {
  const isSelected = (e: HTMLTaskElement) => e.classList.contains("selected");
  return getTasks().filter(isSelected);
}

function resetSelected() {
  const selectedTasks = getSelected();
  selectedTasks.forEach((task) => task.classList.remove("selected"));
}

export function loadGraph(graph: Graph) {
  clearGraph();
  graph.tasks.forEach(addTask);
  graph.dependencies.forEach(addDependency);
}

export function getGraph() {
  const tasksHtml = getTasks();
  const tasks = tasksHtml.map((e) => {
    const bb = getOffsetBox(e);
    return {
      name: e.textContent,
      pos: { x: bb.left, y: bb.top },
      status: e.getAttribute("status") === "completed" ? "completed" : "todo",
    };
  });
  const dependenciesHtml = getDependencies();
  const dependencies = dependenciesHtml.map((e) => ({
    predecessor: e.from.textContent,
    successor: e.to.textContent,
  }));
  return { tasks, dependencies };
}

// updates the visual representation of path
// if dest if specified, use instead of path.to
function updatePath(path: HTMLDependencyElement, dest?: Point) {
  const nodeABox = getOffsetBox(path.from);
  const nodeBBox = dest ? null : getOffsetBox(path.to);

  const centerA = getBoxCenter(nodeABox);
  const centerB = dest ? dest : getBoxCenter(nodeBBox!);

  const offset = 8;

  const pathPointA = intersectLineBox(
    centerA,
    centerB,
    getExpandedBox(nodeABox, offset)
  );
  const pathPointB = dest
    ? dest
    : intersectLineBox(centerA, centerB, getExpandedBox(nodeBBox!, offset));

  if (pathPointA && pathPointB) {
    path.setAttributeNS(
      null,
      "d",
      `M${pathPointA.x},${pathPointA.y} L${pathPointB.x},${pathPointB.y}`
    );
  } else {
    path.setAttributeNS(null, "d", "");
  }
}

const panzoom = {
  pan: { x: 0, y: 0 },
  zoom: 1,
};

function updatePanzoom() {
  itemsContainer.style.transform = `translate(${panzoom.pan.x}px, ${panzoom.pan.y}px) scale(${panzoom.zoom})`;
}

function onGraphDragStart(event: PointerEvent) {
  itemsContainer.setPointerCapture(event.pointerId);
  let previousPosition = { x: event.clientX, y: event.clientY };
  const onPointerMove = (event: PointerEvent) => {
    panzoom.pan.x += event.clientX - previousPosition.x;
    panzoom.pan.y += event.clientY - previousPosition.y;
    previousPosition = { x: event.clientX, y: event.clientY };
    updatePanzoom();
  };
  const onPointerEnd = (event: PointerEvent) => {
    itemsContainer.removeEventListener("pointermove", onPointerMove);
    itemsContainer.removeEventListener("pointerup", onPointerEnd);
  };
  itemsContainer.addEventListener("pointermove", onPointerMove);
  itemsContainer.addEventListener("pointerup", onPointerEnd);
}

function updateZoomIndicator() {
  const zoomIndicator = getElementById("zoomIndicator");
  zoomIndicator.textContent =
    panzoom.zoom === 1 ? "" : Math.floor(panzoom.zoom * 100) + "% zoom";
}

function setupZoom() {
  graphContainer.onwheel = (event) => {
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    panzoom.zoom = snap(1)(0.1)(panzoom.zoom * factor);
    updatePanzoom();
    updateZoomIndicator();
  };
}

function moveTask(task: HTMLTaskElement, pos: Point) {
  task.style.left = pos.x + "px";
  task.style.top = pos.y + "px";
  for (const path of [...task.from, ...task.to]) updatePath(path);
}

export function initGraph() {
  setupZoom();
  graphContainer.onpointerdown = (event) => {
    event.preventDefault();
    let moved = false;
    const target = event.target;
    if (!target || !isTask(target as HTMLElement)) {
      resetSelected();
      sendSelectionChanged([]);
      onGraphDragStart(event);
      return;
    }
    const task = target as HTMLTaskElement;
    const pointerId = event.pointerId;
    itemsContainer.setPointerCapture(pointerId);
    const initialPosition = { x: event.clientX, y: event.clientY };
    const linkModeCheckbox = querySelector(
      "#linkModeCheckbox input"
    ) as HTMLInputElement;
    if (event.shiftKey || linkModeCheckbox.checked) {
      // Initiate link creation
      const path = (document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      ) as unknown) as HTMLDependencyElement;
      path.from = task;
      arrows.appendChild(path);
      function onPointerMove(event: PointerEvent) {
        if (event.pointerId !== pointerId) return;
        moved = true;
        updatePath(path, { x: event.offsetX, y: event.offsetY });
      }
      function onPointerEnd(event: PointerEvent) {
        if (event.pointerId !== pointerId) return;
        if (!moved) onTaskClicked(task, event);
        itemsContainer.removeEventListener("pointermove", onPointerMove);
        itemsContainer.removeEventListener("pointerup", onPointerEnd);
        itemsContainer.removeEventListener("pointercancel", onPointerEnd);
        const target = document.elementFromPoint(event.pageX, event.pageY);
        // TODO Prevent a link to itself
        // TODO Prevent a link to a dependency
        // TODO Prevent a link to a target from which it's a dependency
        if (!target || !target.classList.contains("task")) {
          arrows.removeChild(path);
          return;
        }
        const targetTask = target as HTMLTaskElement;
        path.to = targetTask;
        task.from.push(path);
        targetTask.to.push(path);
        updatePath(path);
        graphContainer.dispatchEvent(new CustomEvent("newdependency"));
      }
      itemsContainer.addEventListener("pointermove", onPointerMove);
      itemsContainer.addEventListener("pointerup", onPointerEnd);
      itemsContainer.addEventListener("pointercancel", onPointerEnd);
    } else {
      // Initiate Drag
      const offsetX = event.offsetX;
      const offsetY = event.offsetY;
      task.classList.add("dragged");
      function onPointerMove(event: PointerEvent) {
        if (event.pointerId !== pointerId) return;
        const currentPosition = { x: event.clientX, y: event.clientY };
        const movedThreshold = 5; // px
        const squaredMovedThreshold = movedThreshold * movedThreshold;
        if (
          squaredDistance(initialPosition, currentPosition) >
          squaredMovedThreshold
        )
          moved = true;
        moveTask(task, {
          x: event.offsetX - offsetX,
          y: event.offsetY - offsetY,
        });
      }
      function onPointerEnd(event: PointerEvent) {
        if (event.pointerId !== pointerId) return;
        itemsContainer.removeEventListener("pointermove", onPointerMove);
        itemsContainer.removeEventListener("pointerup", onPointerEnd);
        itemsContainer.removeEventListener("pointercancel", onPointerEnd);
        task.classList.remove("dragged");
        if (moved) {
          graphContainer.dispatchEvent(
            new CustomEvent("taskmoved", { detail: { task } })
          );
        } else onTaskClicked(task, event);
      }
      itemsContainer.addEventListener("pointermove", onPointerMove);
      itemsContainer.addEventListener("pointerup", onPointerEnd);
      itemsContainer.addEventListener("pointercancel", onPointerEnd);
    }
  };
  sendSelectionChanged([]);
  updateZoomIndicator();
}
