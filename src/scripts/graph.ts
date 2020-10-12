import {
  squaredDistance,
  getBoxCenter,
  getExpandedBox,
  getOffsetBox,
  intersectLineBox,
  Point,
} from "./geometry.js";

import { removeFromArray, snap, querySelector } from "./misc.js";

import { Task as TaskComponent } from "./task.js";

export interface HTMLDependencyElement extends HTMLElement {
  from: TaskComponent;
  to: TaskComponent;
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

interface GraphData {
  tasks: Task[];
  dependencies: Dependency[];
}

// The graph element
// Has the correct size
// Used to initially capture mouse events

// The itemsContainer
// Contains the tasks and dependencies
// Will get translated around

// const arrows = getElementById("arrows");

const isTask = (e: HTMLElement) => e.tagName === "TG-TASK";

interface AddTask extends Partial<Task> {
  name: string;
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

function moveTask(task: TaskComponent, pos: Point) {
  task.style.left = pos.x + "px";
  task.style.top = pos.y + "px";
  for (const path of [...task.from, ...task.to]) updatePath(path);
}

const template = document.createElement("template");
template.innerHTML = `
<style>
:host {
  display: block;
  height: 100%;
  background-color: #ccc;
  overflow: hidden;
}

#zoomIndicator {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
}

tg-task.selected {
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
  background-color: aquamarine;
}

tg-task.dragged {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23);
  z-index: 1;
}

#arrows {
  position: absolute;
  left: 0;
  top: 0;
  overflow: visible;
}

#arrows > path {
  stroke: black;
  stroke-width: 6px;
  stroke-linecap: round;
  marker-end: url(#Triangle);
}
</style>
<p id="zoomIndicator"></p>
<div id="itemsContainer">
  <svg id="arrows">
    <defs>
      <marker
        id="Triangle"
        viewBox="0 0 5 5"
        refX="2"
        refY="2.5"
        markerWidth="2"
        markerHeight="2"
        orient="auto"
      >
        <path
          d="M 0 0 L 5 2.5 L 0 5 z"
          class="link-arrow-triangle-path"
        />
      </marker>
    </defs>
  </svg>
</div>`;

export class Graph extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.itemsContainer = this.shadowRoot!.getElementById("itemsContainer")!;
    this.arrows = this.shadowRoot!.getElementById("arrows")!;
    this.arrows.style.setProperty("display", "none");
  }

  private panzoom = {
    pan: { x: 0, y: 0 },
    zoom: 1,
  };

  private itemsContainer: HTMLElement;
  private arrows: HTMLElement;

  updatePanzoom() {
    this.itemsContainer.style.transform = `translate(${this.panzoom.pan.x}px, ${this.panzoom.pan.y}px) scale(${this.panzoom.zoom})`;
  }

  updateZoomIndicator() {
    const zoomIndicator = this.shadowRoot!.getElementById("zoomIndicator")!;
    zoomIndicator.textContent =
      this.panzoom.zoom === 1
        ? ""
        : Math.floor(this.panzoom.zoom * 100) + "% zoom";
  }

  setupZoom() {
    this.onwheel = (event) => {
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      this.panzoom.zoom = snap(1)(0.1)(this.panzoom.zoom * factor);
      this.updatePanzoom();
      this.updateZoomIndicator();
    };
  }

  onGraphDragStart(event: PointerEvent) {
    this.itemsContainer.setPointerCapture(event.pointerId);
    let previousPosition = { x: event.clientX, y: event.clientY };
    const onPointerMove = (event: PointerEvent) => {
      this.panzoom.pan.x += event.clientX - previousPosition.x;
      this.panzoom.pan.y += event.clientY - previousPosition.y;
      previousPosition = { x: event.clientX, y: event.clientY };
      this.updatePanzoom();
    };
    const onPointerEnd = (event: PointerEvent) => {
      this.itemsContainer.removeEventListener("pointermove", onPointerMove);
      this.itemsContainer.removeEventListener("pointerup", onPointerEnd);
    };
    this.itemsContainer.addEventListener("pointermove", onPointerMove);
    this.itemsContainer.addEventListener("pointerup", onPointerEnd);
  }

  connectedCallback() {
    this.setupZoom();
    this.onpointerdown = (event) => {
      event.preventDefault();
      let moved = false;
      const target = this.shadowRoot!.elementFromPoint(
        event.clientX,
        event.clientY
      );
      //const target = event.target;
      console.log(target);
      if (!target || !isTask(target as HTMLElement)) {
        this.resetSelected();
        this.sendSelectionChanged([]);
        this.onGraphDragStart(event);
        return;
      }
      const task = target as TaskComponent;
      const pointerId = event.pointerId;
      this.itemsContainer.setPointerCapture(pointerId);
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
        this.arrows.appendChild(path);
        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerId !== pointerId) return;
          moved = true;
          updatePath(path, { x: event.offsetX, y: event.offsetY });
        };
        const onPointerEnd = (event: PointerEvent) => {
          if (event.pointerId !== pointerId) return;
          if (!moved) this.onTaskClicked(task, event);
          this.itemsContainer.removeEventListener("pointermove", onPointerMove);
          this.itemsContainer.removeEventListener("pointerup", onPointerEnd);
          this.itemsContainer.removeEventListener(
            "pointercancel",
            onPointerEnd
          );
          const target = document.elementFromPoint(event.pageX, event.pageY);
          // TODO Prevent a link to itself
          // TODO Prevent a link to a dependency
          // TODO Prevent a link to a target from which it's a dependency
          if (!target || !target.classList.contains("task")) {
            this.arrows.removeChild(path);
            return;
          }
          const targetTask = target as TaskComponent;
          path.to = targetTask;
          task.from.push(path);
          targetTask.to.push(path);
          updatePath(path);
          this.dispatchEvent(new CustomEvent("newdependency"));
        };
        this.itemsContainer.addEventListener("pointermove", onPointerMove);
        this.itemsContainer.addEventListener("pointerup", onPointerEnd);
        this.itemsContainer.addEventListener("pointercancel", onPointerEnd);
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
        const onPointerEnd = (event: PointerEvent) => {
          if (event.pointerId !== pointerId) return;
          this.itemsContainer.removeEventListener("pointermove", onPointerMove);
          this.itemsContainer.removeEventListener("pointerup", onPointerEnd);
          this.itemsContainer.removeEventListener(
            "pointercancel",
            onPointerEnd
          );
          task.classList.remove("dragged");
          if (moved) {
            this.dispatchEvent(
              new CustomEvent("taskmoved", { detail: { task } })
            );
          } else this.onTaskClicked(task, event);
        };
        this.itemsContainer.addEventListener("pointermove", onPointerMove);
        this.itemsContainer.addEventListener("pointerup", onPointerEnd);
        this.itemsContainer.addEventListener("pointercancel", onPointerEnd);
      }
    };
    this.sendSelectionChanged([]);
    this.updateZoomIndicator();
  }

  getTasks(): TaskComponent[] {
    const elements = Array.from(this.itemsContainer.children) as HTMLElement[];
    return elements.filter(isTask) as TaskComponent[];
  }

  getDependencies(): HTMLDependencyElement[] {
    const arrows = this.shadowRoot!.getElementById("arrows")!;
    const isDependency = (e: HTMLElement) => e.tagName == "path";
    const elements = Array.from(arrows.children) as HTMLElement[];
    return elements.filter(isDependency) as HTMLDependencyElement[];
  }

  getGraph() {
    const tasksHtml = this.getTasks();
    const tasks = tasksHtml.map((e) => {
      const bb = getOffsetBox(e);
      return {
        name: e.name,
        pos: { x: bb.left, y: bb.top },
        status: e.getAttribute("status") === "completed" ? "completed" : "todo",
      };
    });
    const dependenciesHtml = this.getDependencies();
    const dependencies = dependenciesHtml.map((e) => ({
      predecessor: e.from.name,
      successor: e.to.name,
    }));
    return { tasks, dependencies };
  }

  clearGraph() {
    const removeElement = (e: HTMLElement) => {
      if (e.parentNode) e.parentNode.removeChild(e);
    };
    const tasks = this.getTasks();
    tasks.forEach(removeElement);
    const dependencies = this.getDependencies();
    dependencies.forEach(removeElement);
  }

  getViewCenter(): Point {
    const box = getOffsetBox(this);
    const viewCenter = getBoxCenter(box);
    return {
      x: viewCenter.x - this.panzoom.pan.x,
      y: viewCenter.y - this.panzoom.pan.y,
    };
  }

  computeCenteredPos(element: HTMLElement): Point {
    const viewCenter = this.getViewCenter();
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    return {
      x: viewCenter.x - width / 2,
      y: viewCenter.y - height / 2,
    };
  }

  addTask(task: AddTask) {
    const htmlTask = document.createElement("tg-task") as TaskComponent;
    htmlTask.setAttribute("name", task.name);
    if (task.status) htmlTask.setAttribute("status", task.status);

    this.itemsContainer.appendChild(htmlTask);
    const pos = task.pos ? task.pos : this.computeCenteredPos(htmlTask);
    htmlTask.style.left = pos.x + "px";
    htmlTask.style.top = pos.y + "px";
    return htmlTask;
  }

  addDependency(dependency: Dependency) {
    const dependencyHtml = (document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path"
    ) as unknown) as HTMLDependencyElement;
    const tasks = this.getTasks();
    const predecessor = tasks.find(
      (task) => task.name == dependency.predecessor
    );
    if (!predecessor) {
      console.error(
        "Could not add dependency: predecessor not found",
        dependency
      );
      return;
    }
    const successor = tasks.find((task) => task.name == dependency.successor);
    if (!successor) {
      console.error(
        "Could not add dependency: successor not found.",
        dependency
      );
      return;
    }
    dependencyHtml.from = predecessor;
    dependencyHtml.to = successor;

    predecessor.from.push(dependencyHtml);
    successor.to.push(dependencyHtml);

    this.arrows.appendChild(dependencyHtml);

    updatePath(dependencyHtml);
  }

  deleteTask(task: TaskComponent) {
    const from = task.from.slice();
    from.forEach(this.deleteDependency);
    const to = task.to.slice();
    to.forEach(this.deleteDependency);
    this.itemsContainer.removeChild(task);
  }

  deleteDependency(dependency: HTMLDependencyElement) {
    removeFromArray(dependency.from.from, dependency);
    removeFromArray(dependency.to.to, dependency);
    this.arrows.removeChild(dependency);
  }

  selectAll() {
    const tasks = this.getTasks();
    tasks.forEach((t) => t.classList.add("selected"));
    this.sendSelectionChanged(tasks);
  }

  deleteSelected() {
    const selected = this.getSelected();
    selected.forEach((t: TaskComponent) => this.deleteTask(t));
    this.sendSelectionChanged([]);
  }

  completeSelected() {
    const selected = this.getSelected();
    selected.forEach((task: TaskComponent) => {
      const status = task.getAttribute("status");
      task.setAttribute(
        "status",
        status === "completed" ? "todo" : "completed"
      );
    });
  }

  getSelected() {
    const isSelected = (e: TaskComponent) => e.classList.contains("selected");
    return this.getTasks().filter(isSelected);
  }

  onTaskClicked(task: TaskComponent, event: MouseEvent) {
    if (event.shiftKey) {
      task.classList.toggle("selected");
      this.sendSelectionChanged();
    } else {
      this.resetSelected();
      task.classList.add("selected");
      this.sendSelectionChanged([task]);
    }
  }

  /**
   * sends out a "selectionchanged" event
   * @param {[HTMLElement]} selection if known by the caller, passthrough
   */
  sendSelectionChanged(selection?: TaskComponent[]) {
    this.dispatchEvent(
      new CustomEvent("selectionchanged", {
        detail: selection ? selection : this.getSelected(),
      })
    );
  }

  resetSelected() {
    const selectedTasks = this.getSelected();
    selectedTasks.forEach((task: TaskComponent) =>
      task.classList.remove("selected")
    );
  }

  loadGraph(graph: GraphData) {
    this.clearGraph();
    graph.tasks.forEach((task) => this.addTask(task));
    graph.dependencies.forEach((dep) => this.addDependency(dep));
  }
}
