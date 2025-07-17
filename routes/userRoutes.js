const express = require('express');
const router = express.Router();
const mysql = require('mysql2');
const connection = require('../db');

const dbName = process.env.DB_NAME;

connection.changeUser({ database: dbName }, (err) => {
  if (err) throw err;
});

// POST /users
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  const query = 'INSERT INTO users (name, email) VALUES (?, ?)';

  connection.query(query, [name, email], (err, results) => {
    if (err) return res.status(500).send('DB insert error');
    res.status(201).json({ id: results.insertId, name, email });
  });
});

module.exports = router;
