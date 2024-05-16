const express = require('express');
const app = express();
const path = require("path");
const { title } = require('process');
const PORT = 3000;
const fs = require('fs');
const pg = require('pg');


//----------------- Parse the user submission into json -------------------//
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));
//----------------- Parse the user submission into json -------------------//




app.set("view engine", "ejs");
app.use(express.static('public'));

// Confirm database connection
const config = {
    user: "avnadmin",
    password: "AVNS_q8L5Bn1DU4v5Scy8Tyo",
    host: "pg-studyplanner-studyplanner.d.aivencloud.com",
    port: "24821",
    database: "defaultdb",
    ssl: {
      rejectUnauthorized: true,
      ca: fs.readFileSync("./ca.pem").toString(),
    },
};
   
const client = new pg.Client(config);
client.connect(function (err) {
    if (err) throw err;
    client.query("SELECT VERSION()", [], function (err, result) {
        if (err) throw err;

        console.log(result.rows[0]);
    });
});

// Post new task to the database
app.use(bodyParser.json());
app.post('/tasks', async (req, res) => {
    try {
        let vals = req.body
        let task_name = vals["task-name"];
        let taskCourse = vals["course"];
        let dueDate = vals["due-date"];
        let note = vals["note"];
        let todos = vals["toDos"].reduce((acc, curr) => {
            acc[curr] = false;
            return acc;
        }, {});
        const insertTask = {
            text: "INSERT INTO tasks(task_name, userid, courseid, due_date, description, status, todo_items) VALUES($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING taskid",
            values: [task_name, 1, taskCourse, dueDate, note, "Pending", JSON.stringify(todos)]
        }

        const taskResult = await client.query(insertTask);
        const taskId = taskResult.rows[0].taskid;
        console.log(`Task stored with ID: ${taskId}`);
    } catch (error) {
        console.error("Error storing task:", error);
    }
}) 

// Receive Post request for an update and calls updateTodoItemStatus
app.post('/update-task', async (req, res) => {
    try {
      const { userid, taskid, todoId, todoItemStatus } = req.body;
  
      // Update the todo item status in the database
      await updateTodoItemStatus(userid, taskid, todoId, todoItemStatus);
  
      res.status(200).json({ message: 'Task updated successfully' });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// switches todo item status value in the database
async function updateTodoItemStatus(userid, taskid, todoId, todoItemStatus) {
    // Determine the new value based on the todoItemStatus
    const newValue = todoItemStatus ? true : false;
  
    // Execute the SQL query to update the todo item status
    const updateTask = `
      UPDATE tasks 
      SET todo_items = jsonb_set(
        todo_items, 
        '{${todoId}}', 
        to_jsonb(${newValue}), 
        true
      )
      WHERE userid = $1 AND taskid = $2;
    `;
    await client.query(updateTask, [userid, taskid]);
} 
  
// Deletes a task from the table
app.post('/delete-task', async (req, res) => {
    let userid = req.query.userid;
    let taskid = req.query.taskid;

    const deleteTask = {
        text: "DELETE FROM tasks WHERE taskid = $1 AND userid = $2;",
        values: [taskid, userid]
    }

    await client.query(deleteTask)
    .then((result) => {
        console.log("Successfully deleted: ", result)
        res.json(result);
    })
})

// Retrieve course id and course names of user from the course table
app.get("/select-course", async (req, res) =>{
    let userid = req.query.userid;

    const retrieveCourse = {
        text: "SELECT DISTINCT courses.courseid, coursename FROM courses, userprofileinfo WHERE userprofileinfo.userid = $1",
        values: [userid]
    }

    let result = await client.query(retrieveCourse);
    res.json(result.rows)

});  

// Retrieves task from table associated to the user
app.get("/task", async (req, res) => {
    let userid = req.query.userid;

    const retrieveTask = {
        text: "SELECT * FROM tasks WHERE userid = $1",
        values: [userid]
    }

    let result = await client.query(retrieveTask);
    res.json(result.rows)
})


// Renders the task page;
app.get("/", (req, res)=> {
    res.render("task");
});

app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`)
});

