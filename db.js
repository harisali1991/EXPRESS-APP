require('dotenv').config();
const mysql = require('mysql2');


// const connection = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD
// });

// connection.connect((err) => {
//   if (err) {
//     console.error('DB connection failed:', err.stack);
//     return;
//   }
//   console.log('Connected to MySQL server');
// });

// module.exports = connection;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0
});


module.exports = pool.promise(); // async/await support