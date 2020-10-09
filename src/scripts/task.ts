const template = document.createElement("template");
template.innerHTML = `
<link rel="stylesheet" href="./task.css" />
<span id="name"></span>`;

export class Task extends HTMLElement {
  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback() {
    const name = this.getAttribute("name");
    if (name) this.shadowRoot!.getElementById("name")!.textContent = name;
  }
}
