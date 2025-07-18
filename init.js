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
    const createOrderTableQuery = `
      CREATE TABLE IF NOT EXISTS Orders (
        tid bigint AUTO_INCREMENT PRIMARY KEY,
        id VARCHAR(255),
        branch_id VARCHAR(255),
        branch_name VARCHAR(255),
        customer_id VARCHAR(255),
        customer_name VARCHAR(255),
        discount_type VARCHAR(255),
        reference_x VARCHAR(255),
        number int,
        type int,
        source int,
        status int,
        delivery_status int,
        kitchen_notes VARCHAR(255),
        business_date VARCHAR(255),
        subtotal_price double(18,2),
        total_price double(18,2),
        discount_amount double(18,2),
        rounding_amount double(18,2),
        tax_exclusive_discount_amount double(18,2),
        opened_at VARCHAR(255),
        closed_at VARCHAR(255),
        reference VARCHAR(255),
        check_number VARCHAR(255)
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
    connection.query(createOrderTableQuery, (err) => {
      if (err) throw err;
      console.log('Order table ensured');
    });
    connection.query(createLoyaltyTransactionQuery, (err) => {
      if (err) throw err;
      console.log('Loyalty transaction table ensured');
      process.exit();
    });


    
  });
});
