const mysql = require("mysql");

// Create database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "fos",
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to database:", err);
    return;
  }
  console.log("Connected to the database");
});

// Export the database connection object
module.exports = db;
