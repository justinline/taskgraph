const template = document.createElement("template");
template.innerHTML = `
<link rel="stylesheet" href="./task.css" />
<span id="name"></span>`;

export class Task extends HTMLElement {
  static get observedAttributes() {
    return ["name", "status"];
  }

  constructor() {
    super();

    this.attachShadow({ mode: "open" });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
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
