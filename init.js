const connection = require('./db');
const dbName = process.env.DB_NAME;

connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (err) => {
  if (err) throw err;

  console.log('Database ensured');

  // Switch to new DB
  connection.changeUser({ database: dbName }, (err) => {
    if (err) throw err;

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        email VARCHAR(255)
      )
    `;

    connection.query(createTableQuery, (err) => {
      if (err) throw err;
      console.log('Users table ensured');
      process.exit();
    });
  });
});
