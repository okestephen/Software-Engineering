// ------------------------ Modal Box --------------------------- //


// Reference to Elements & initialisation of variables;
var modal = document.getElementById("form-modal");
var btn = document.getElementById("openFormBtn");
var span = document.getElementById("close-form");
const toDoInput = document.getElementById('to-do');
const form = document.getElementById('task-form');
const submitButton = document.getElementById('submit-form');
var cardContainer = document.getElementById("card-container");
let toDos = [];
let courseName;

// Function to open the modal
function openModal() {
  modal.style.display = "block";
}

// Function to close the modal
function closeModal() {
  modal.style.display = "none";
  form.reset();
}

// Modal interaction
btn.addEventListener("click", openModal);
span.addEventListener("click", closeModal);
window.addEventListener("click", function(event) {
  if (event.target == modal) {
    closeModal();
  }
});
// ------------------------ /Modal Box -------------------------- //
// ---------------------- Form Handling ------------------------- //
// Returns array of todo items to the form object
function createTodos(){
  var inputText = toDoInput.value; 
  toDos = inputText.split('\n').map(function(item){
    return item.trim();
  });
  return toDos;
}

// Form posts an object to populate the databse
form.addEventListener('submit', function(event) { 
    event.preventDefault();
    const formData = new FormData(form);
    const formValues = {};
    for (const [key, value] of formData.entries()) {
        formValues[key] = value;
    }
    
    const selectElement = form.querySelector('select');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    formValues["course"] = selectedOption.id;
    formValues['toDos'] = createTodos();
    console.log(formValues);

    const dueDate = new Date(formValues["due-date"]);
    if  (dueDate < new Date()) {
        window.alert("Enter a valid future date for the due date");
        return;
    }

    const details = JSON.stringify(formValues);

    fetch('/tasks', {
      method:'POST',
      headers: {
        'Content-type': 'application/json'
      },
      body: details
    })

    closeModal();
    window.location.reload();
});

// Populates the select element in the form with options
function populateSelect(selectOptions){
  const selectElement = document.getElementById('select-course');
  
  selectOptions.forEach(selectOption => {
    const option = document.createElement('option');
      option.value = selectOption["coursename"];
      option.textContent = selectOption["coursename"];
      option.id = selectOption.courseid;
      selectElement.appendChild(option);
  })
      
}
// ---------------------- /Form Handling ------------------------ //
// ----------------------- Task Display ------------------------- //
// Creates the html elements that constitutes a card with a preview of the task
function createTaskCard(taskData) {
  var taskCard = document.createElement("div");
  taskCard.setAttribute("id", taskData["taskid"])
  var cardHeader = document.createElement("div");
  var cardContent = document.createElement("div");
  taskCard.classList.add("card");
  cardHeader.classList.add("card-header");
  cardContent.classList.add("card-content");
  cardContainer.appendChild(taskCard);
  taskCard.appendChild(cardHeader);
  taskCard.appendChild(cardContent);
  let date = new Date(taskData["due_date"]).toLocaleDateString()
  cardHeader.innerHTML = `<h3>${taskData["task_name"]}</h3><h3>${date}</h3>`;

  cardContent.innerHTML = `
  <h3>Description</h3> <p>${taskData["description"]}</p>`;

  taskCard.onclick = function (event) {
    displayTaskView(taskData);
  };
}

// Displays a Modal with all task information, 
// delete button to delete the task and a progress bar
function displayTaskView(taskData) {
  var taskModal = document.createElement("div");
  var taskHeader = document.createElement("div");
  var taskContent = document.createElement("div");
  var toDoList = document.createElement("div");
  var note = document.createElement("div");
  var progressContainer = document.createElement("div");

  taskModal.classList.add("modal");
  taskModal.setAttribute("id", taskData["taskid"])
  taskHeader.classList.add("modal-header");
  taskContent.classList.add("modal-content");
  toDoList.classList.add("todos")
  note.classList.add("note");
  progressContainer.classList.add("progress-container");

  cardContainer.appendChild(taskModal);
  taskModal.appendChild(taskContent);
  taskContent.appendChild(taskHeader);
  taskContent.appendChild(toDoList);
  taskContent.appendChild(progressContainer);
  taskContent.appendChild(note);

  var endingDate = new Date(taskData["due_date"]).getTime();
  

  taskHeader.innerHTML = `<h1>${taskData["task_name"]}</h1>
  <h1>${getCourseName(taskData["courseid"])}</h1>
  <h2 id="countdown">${showcountdown(endingDate)}</h2>
  <img class="delete" src="./images/trash-can.svg" alt="trash-can" height="27" onclick="deleteTask(${taskData["taskid"]}, ${taskData["userid"]})">
  <span id="close-task" class="close"></span>`;

  var todoItems = taskData["todo_items"];
  for (let key in todoItems) {
    if (todoItems.hasOwnProperty(key)) {
      var checkboxId = `${key}`;
      var checkbox = `
      <input type="checkbox" id="${checkboxId}" ${todoItems[key] ? 'checked' : ''}>
      <label for="${checkboxId}">${key}</label><br>`;
      toDoList.innerHTML += `${checkbox}\n`;
    }
  }

  taskContent.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      updateProgressBar();
      const todoId = this.id; 
      const taskid = taskModal.getAttribute("id"); 
      const userid = 1; 
      const todoItemStatus = this.checked;
      updateTask(taskid, userid, todoId, todoItemStatus);
      
    });
    checkbox.addEventListener("load", function() {
      updateProgressBar();
    });
  });


  progressContainer.innerHTML = 
  `<div id="progress" onload="updateProgressBar()">
  <h1 id="progress-value"></h1>
  </div>
  `;
  note.innerHTML = `<h3>Description</h3> <p>${taskData["description"]}</p>`;

  // Show Modal
  taskModal.style.display = "block";
  updateProgressBar();

  var closeTask = document.getElementById("close-task");
  closeTask.onclick = function () {
    taskModal.parentNode.removeChild(taskModal);
  };

  window.onclick = function (event) {
    if (event.target == taskModal) {
      taskModal.parentNode.removeChild(taskModal);
    }
  };
}

// Retrieves all tasks related to the user from the database
async function loadTasks(userid){ 
  const url = (`/task?` +
  new URLSearchParams({ userid: userid }).toString());
  const result = await fetch(url)
  .then(response => response.json())

  displayTasks(result);

  console.log("Fetched from: " + url)
}

//Loops through the task from loadTask and calls creatTaskCard
function displayTasks(tasks){
  tasks.forEach(task => {
    createTaskCard(task);
  })
}
// ---------------------- /Task Display ------------------------- //
// ---------------------- Task Utilities ------------------------ //
// Delete Task from the database
function deleteTask(taskid, userid){
  const url = (`/delete-task?` +
  new URLSearchParams({ userid: userid, taskid: taskid }).toString());
  const result = fetch(url, {
    method: 'POST'
  })
  .then(response => response.json())
  window.location.reload();
}

// Echoes the changes of the checkbox into the database
function updateTask(taskid, userid, todoId, todoItemStatus) {
  // Get the current todo items from the server or wherever it's stored
  const url = `/update-task`;
  const requestBody = {
    userid: userid,
    taskid: taskid,
    todoId: todoId,
    todoItemStatus: todoItemStatus
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to update task');
    }
    console.log('Task updated successfully');
  })
  .catch(error => {
    console.error('Error updating task:', error);
  });
}

// 
function getCourseName(courseid){
  let coursename;
  courseName.forEach(course => {
    if (courseid == course.courseid){
     coursename = course.coursename;
    }
  });
  return coursename;
}

async function getCourses(userid){
    const url = (`/select-course?` +
    new URLSearchParams({ userid: userid }).toString());
    const result = await fetch(url)
    .then(response => response.json())
  
    console.log("Fetched from: " + url)
    populateSelect(result)
    courseName = result;
}

function updateProgressBar() {
  var todos = document.querySelectorAll('.todos input[type="checkbox"]');
  var checkedCount = 0;

  // Count the number of checked checkboxes
  todos.forEach(function(todo) {
      if (todo.checked) {
          checkedCount++;
      }
  });

  // Calculate the progress percentage
  var progressPercentage = Math.floor((checkedCount / todos.length) * 100);

  var progressDegree = (progressPercentage/100) * 360;
  var progressVal = document.getElementById("progress-value");
  progressVal.innerHTML = progressPercentage +"%";

  // Update the custom property value for the progress angle
  document.getElementById('progress').style.setProperty('--a', progressDegree + 'deg');
}

// Displays the countdown
function showcountdown(endingDate) {
  var x = setInterval(function() {
    var todayDate = new Date().getTime();
    var difference = endingDate - todayDate;
    var days = Math.floor(difference / (1000 * 60 * 60 * 24));
    var hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((difference % (1000 * 60)) / 1000);
    var countdownElement = document.getElementById("countdown");
    if (countdownElement) {
      countdownElement.innerHTML = days + "d" + " " + hours + "h" + " " + minutes + "m" + " " + seconds + "s";
      if (difference < 0) {
        clearInterval(x);
        countdownElement.innerHTML = "EXPIRED";
      }
    } else {
      clearInterval(x); // Clear interval if countdown element is not found
    }
  }, 1000);
}

// --------------------- /Task Utilities ----------------------- //

document.addEventListener("DOMContentLoaded", function() { 
  loadTasks(1);
  getCourses(1);
});