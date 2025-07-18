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

    const createCustomerQuery = `
      CREATE TABLE IF NOT EXISTS Customers (
        tid INT AUTO_INCREMENT PRIMARY KEY,
        id VARCHAR(255),
        membership VARCHAR(255),
        name VARCHAR(255),
        phone VARCHAR(255),
        email VARCHAR(255),
        gender VARCHAR(255),
        birth_date VARCHAR(255),
        is_blacklisted Boolean,
        is_house_account_enabled Boolean,
        house_account_limit int,
        is_loyalty_enabled Boolean,
        order_count int,
        last_order_at varchar(255),
        notes nvarchar(255),
        created_at nvarchar(255),
        updated_at nvarchar(255),
        deleted_at nvarchar(255),
        dial_code nvarchar(255),
        house_account_balance double(18,2),
        loyalty_balance double(18,2)
      )
    `;
    const createLoyaltyTransactionQuery = `
      CREATE TABLE IF NOT EXISTS LoyaltyTransactions (
        tid INT AUTO_INCREMENT PRIMARY KEY,
        customer_id VARCHAR(255),
        order_id VARCHAR(255),
        points double(18,2),
        type VARCHAR(255),
        description VARCHAR(255),
        created_at DATETIME,
        expire_at DATETIME,
        status VARCHAR(255),
        expired Boolean,
        redeem_amount double(18,2)
      )
    `;

    connection.query(createTableQuery, (err) => {
      if (err) throw err;
      console.log('Users table ensured');
      // process.exit();
    });

    connection.query(createCustomerQuery, (err) => {
      if (err) throw err;
      console.log('Customer table ensured');
    });
    connection.query(createLoyaltyTransactionQuery, (err) => {
      if (err) throw err;
      console.log('Loyalty transaction table ensured');
      process.exit();
    });


    
  });
});
