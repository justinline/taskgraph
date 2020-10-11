import { HTMLDependencyElement } from "graph.js";

const template = document.createElement("template");
template.innerHTML = `
<style>
:host {
  display: block;

  -webkit-tap-highlight-color: transparent;
  user-select: none;
  border-radius: 3px;
  background-color: #ddd;
  padding: 0.2em 0.4em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
  transition: box-shadow 0.2s ease;

  position: absolute;
  font-family: "PermanentMarker";
  font-size: 2em;
  line-height: 1em; /* ensure that the bounding box is not too high */
  cursor: pointer;
  white-space: nowrap;
}

:host:hover {
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23);
}

:host([status="completed"])::before {
  content: "";
  position: absolute;
  --thickness: 0.2em;
  height: var(--thickness);
  top: calc(50% + var(--thickness) / 2);
  left: 0;
  right: 0;
  background-color: black;
  animation: 1s ease-in-out strikethrough;
  border-radius: calc(var(--thickness) / 2);
}

@keyframes strikethrough {
  from {
    right: 100%;
  }
  to {
    right: 0%;
  }
}
</style>
<span id="name"></span>`;

export class Task extends HTMLElement {
  static get observedAttributes() {
    return ["name", "status"];
  }

  from: HTMLDependencyElement[];
  to: HTMLDependencyElement[];

  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.from = [];
    this.to = [];
  }

  get name() {
    return this.getAttribute("name");
  }

  attributeChangedCallback(
    attrName: string,
    oldValue: string | null,
    newValue: string | null
  ) {
    if (attrName === "name" && newValue)
      this.shadowRoot!.getElementById("name")!.textContent = newValue;
  }
}
