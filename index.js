"use strict";

document.addEventListener("DOMContentLoaded", (event) => {
  const newTask = document.getElementById("newTask");
  document.onkeyup = (event) => {
    if (event.key == "i") {
      newTask.style.display = "block";
      newTask.focus();
    }
  };

  newTask.onkeypress = (event) => {
    if (event.key == "Enter") {
      console.log("New task: " + newTask.value);
      newTask.style.display = "none";
      newTask.value = "";
    }
  };

  const task = document.getElementById("task");
  let grabbing = false;
  let initialX, initialY;
  let xOffset = 0,
    yOffset = 0;
  task.onmousedown = (event) => {
    grabbing = true;
    //const bb = task.getBoundingClientRect();
    //const offsetX = (initialX = event.clientX - xOffset);
    initialX = event.clientX - xOffset;
    initialY = event.clientY - yOffset;
  };
  document.onmouseup = () => {
    grabbing = false;
  };
  document.onmousemove = (event) => {
    if (!grabbing) return;
    event.preventDefault();
    const x = event.clientX - initialX;
    const y = event.clientY - initialY;
    console.log(task.xOffset);
    xOffset = x;
    yOffset = y;
    task.style.transform = `translate(${x}px, ${y}px)`;
    console.log(`moving to ${x} ${y}`);
  };
});
