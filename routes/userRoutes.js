const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const connection = require("../db");
const passkit_service = require("../services/passkit");

const dbName = process.env.DB_NAME;

connection.changeUser({ database: dbName }, (err) => {
  if (err) throw err;
});

// POST /users
router.post("/users", (req, res) => {
  const { name, email } = req.body;
  const query = "INSERT INTO users (name, email) VALUES (?, ?)";

  connection.query(query, [name, email], (err, results) => {
    if (err) return res.status(500).send("DB insert error");
    res.status(201).json({ id: results.insertId, name, email });
  });
});

// // GET /users/list
// router.get("/list", (req, res) => {
//   const query = "SELECT * FROM users"; // make sure table name is lowercase if that's how it's created

//   connection.query(query, (err, results) => {
//     if (err) return res.status(500).send("DB query error");

//     res.status(200).json(results); // ✅ Return results as JSON
//   });
// });

router.post("/adapter/v1/reward", async (req, res) => {
  const {
    customer_mobile_number,
    mobile_country_code,
    reward_code,
    business_reference,
    branch_id,
  } = req.body;
  const body = req.body;
  const access_token = req.headers["authorization"]; // header keys are lowercase
  if (
    access_token ==
    "Bearer lHJ9VTXKc48flDAvcm+gGHi37mIPzZGcEDwJ2OPtcacYyaUDsZu+Or7UQJr8QRe+AKzrZc6EZjR+bg4YK8Fq7g=="
  ) {
    if (req.body.reward_code) {
      // console.log(`inside if check with reward code ${body.reward_code}`);
      try {
        const member = await passkit_service.GetMemberByExternalID(req.body);
        // console.log("MEMBER: ", member);
        res.status(200).json(member);
      } catch (error) {
        // res.write(JSON.stringify({ error }));
        res.status(500).json({
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });
      }
    }
  } else {
    res.status(401).json({ status: false, message: "invalid access_token" });
  }
});


router.post("/adapter/v1/redeem", async (req, res) => {
  const {
    branch_id,
    business_reference,
    discount_amount,
    mobile_country_code,
    customer_mobile_number,
    date,
    user_id,
    order_id,
    reward_code
  } = req.body;   
  const body = req.body;
  console.log("request body: ", req.body);

  const access_token = req.headers["authorization"]; // header keys are lowercase
  if (
    access_token ==
    "Bearer lHJ9VTXKc48flDAvcm+gGHi37mIPzZGcEDwJ2OPtcacYyaUDsZu+Or7UQJr8QRe+AKzrZc6EZjR+bg4YK8Fq7g=="
  ) {
    if (req.body.reward_code) {
      // console.log(`inside if check with reward code ${body.reward_code}`);
      try {
        // const member = await passkit_service.GetMemberByExternalID(req.body);
        console.log("MEMBER: ", req.body);
        res.status(200).json(req.body);

      } catch (error) {
        // res.write(JSON.stringify({ error }));
        res.status(500).json({
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });
      }
    }
  } else {
    res.status(401).json({ status: false, message: "invalid access_token" });
  }
});



module.exports = router;
