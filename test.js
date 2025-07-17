require('dotenv').config();
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

connection.query('SELECT 1 + 1 AS result', (err, results) => {
  if (err) throw err;
  console.log('Result:', results);
});
