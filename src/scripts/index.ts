"use strict";

import { Graph } from "./graph.js";
customElements.define("tg-graph", Graph);

import { Task } from "./task.js";
customElements.define("tg-task", Task);

import { getElementById } from "./misc.js";

function downloadFile(
  filename: string,
  text: string,
  type = "data:text/plain;charset=utf-8"
) {
  var element = document.createElement("a");
  element.setAttribute("href", `${type}, ${encodeURIComponent(text)}`);
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

const graph = document.querySelector("tg-graph") as Graph;

function saveToLocalStorage() {
  const graphData = graph.getGraph();
  window.localStorage.setItem("graph", JSON.stringify(graph));
}

function saveToFile() {
  const graphData = graph.getGraph();
  downloadFile(
    "graph.json",
    JSON.stringify(graph, null, 2),
    "data:text/json;charset=utf-8"
  );
}

function loadFromLocalStorage() {
  const graphItem = window.localStorage.getItem("graph");
  if (!graphItem) return;
  const graphData = JSON.parse(graphItem);
  graph.loadGraph(graphData);
}

function loadFromFile() {
  const fileInput = getElementById("fileInput");
  fileInput.click();
}

function setupMenubar() {
  const menubar = getElementById("menubar");

  const closeMenubar = () => {
    menubar.classList.remove("active");
  };

  const menubarButton = getElementById("menubarOpenButton");
  menubarButton.addEventListener("click", () => {
    menubar.classList.add("active");
  });

  const menubarCloseButton = getElementById("menubarCloseButton");
  menubarCloseButton.addEventListener("click", closeMenubar);

  const fileInput = getElementById("fileInput") as HTMLInputElement;
  fileInput.onchange = () => {
    const files = fileInput.files;
    if (!files || files.length == 0) return;
    const file = files[0];
    if (file.type != "application/json") return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const result = reader.result as string;
      graph.loadGraph(JSON.parse(result));
      saveToLocalStorage();
    });
    reader.readAsText(file);
    closeMenubar();
  };

  const menubarLoadButton = getElementById("menubarLoadButton");
  menubarLoadButton.addEventListener("click", loadFromFile);

  const menubarSaveButton = getElementById("menubarSaveButton");
  menubarSaveButton.addEventListener("click", () => {
    saveToFile();
    closeMenubar();
  });

  const menubarNewGraphButton = getElementById("menubarNewGraphButton");
  menubarNewGraphButton.addEventListener("click", () => {
    graph.clearGraph();
    closeMenubar();
  });
}

function setupToolbar() {
  const newTask = getElementById("newTask");
  getElementById("createTaskButton").onclick = () => {
    newTask.style.display = "block";
    newTask.focus();
  };

  getElementById("deleteTaskButton").addEventListener("click", () => {
    graph.deleteSelected();
    saveToLocalStorage();
  });

  getElementById("completeTaskButton").addEventListener("click", () => {
    graph.completeSelected();
    saveToLocalStorage();
  });
}

function updateToolbar(selection: boolean) {
  const createTaskButton = getElementById("createTaskButton");
  const deleteTaskButton = getElementById("deleteTaskButton");
  const completeTaskButton = getElementById("completeTaskButton");
  const linkModeCheckbox = getElementById("linkModeCheckbox");
  createTaskButton.style.display = !selection ? "block" : "none";
  deleteTaskButton.style.display = selection ? "block" : "none";
  completeTaskButton.style.display = selection ? "block" : "none";
  linkModeCheckbox.style.display = !selection ? "block" : "none";
}

function setupNewTask() {
  const newTask = getElementById("newTask") as HTMLInputElement;
  const stopNewTask = () => {
    newTask.style.display = "none";
    newTask.value = "";
  };

  newTask.onblur = stopNewTask;

  newTask.onkeypress = (event) => {
    if (event.key == "Enter") {
      if (newTask.value) {
        graph.addTask({ name: newTask.value });
        saveToLocalStorage();
      }
      stopNewTask();
    }
  };
}

document.addEventListener("DOMContentLoaded", (event) => {
  setupMenubar();
  setupToolbar();
  setupNewTask();

  graph.addEventListener("taskmoved", saveToLocalStorage);
  graph.addEventListener("newdependency", saveToLocalStorage);
  graph.addEventListener("selectionchanged", function (event) {
    updateToolbar((event as CustomEvent<HTMLElement[]>).detail.length > 0);
  });

  const newTask = getElementById("newTask");
  document.onkeyup = (event) => {
    // Do not register commands when adding new task
    if (newTask.style.display === "block") return;
    switch (event.key) {
      case "a":
        if (event.ctrlKey) graph.selectAll();
        break;
      case "i":
        newTask.style.display = "block";
        newTask.focus();
        break;
      case "d":
      case "Delete":
        graph.deleteSelected();
        saveToLocalStorage();
        break;
      case "o":
        if (event.ctrlKey) loadFromFile();
        break;
      case "s":
        if (event.ctrlKey) saveToFile();
        break;
    }
  };

  loadFromLocalStorage();
});
