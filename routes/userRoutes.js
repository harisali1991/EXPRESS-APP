const express = require("express");
const router = express.Router();
const mysql = require("mysql2");
const connection = require("../db");
const passkit_service = require("../services/passkit");
const customer_service = require("../services/customerservice");
const order_service = require("../services/orderservice.js");

// const dbName = process.env.DB_NAME;

// connection.changeUser({ database: dbName }, (err) => {
//   if (err) throw err;
// });

router.post("/order/callback", async (req, res) => {
  const body = req.body;

  if (!body.order.customer.is_loyalty_enabled) {
    console.log(`order# ${body.order.reference}, customer# ${body.order.customer.name}, loyalty not enabled`);
    return res.status(200).json({ message: "loyalty not enabled" });
  }
  if (body.order.status != 4 && body.order.status != 5) {
    return res.status(200).json({ message: "order is not done yet" });
  }

  const response = await order_service.upsertOrders(body);
  const customer = body.order.customer.name.split("-");
  const membership = customer[1]?.trim();
  const loyaltyBalance = Math.floor(body.order.total_price) / 20;
  if (response.inserted > 0) {
    await order_service.AwardPointsForOrder(body.order, false);

    
    await passkit_service.UpdateMemberByExternalID(membership, loyaltyBalance);
    await customer_service.UpdateCustomer(body.order.customer, loyaltyBalance);
  } else {
    if (body.order.status == 5) {

      await order_service.AwardPointsForOrder(body.order, true);
      await passkit_service.RevertUpdateMemberByExternalID(membership, loyaltyBalance);
      await customer_service.RevertCustomerLoyaltyBalance(body.order.customer, loyaltyBalance);
    }
  }
  res.status(200).json(response);
});

router.post("/adapter/v1/reward", async (req, res) => {
  const {
    customer_mobile_number,
    mobile_country_code,
    reward_code,
    business_reference,
    branch_id,
  } = req.body;
  const body = req.body;
  // console.log("reward request body: ", req.body);
  const access_token = req.headers["authorization"]; // header keys are lowercase
  if (
    access_token ==
    "Bearer lHJ9VTXKc48flDAvcm+gGHi37mIPzZGcEDwJ2OPtcacYyaUDsZu+Or7UQJr8QRe+AKzrZc6EZjR+bg4YK8Fq7g=="
  ) {
    if (req.body.reward_code) {
      try {
        const member = await passkit_service.GetMemberByExternalID(req.body);
        // console.log("MEMBER: ", member);
        // console.log("reward response body: ", member);
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
  const body = req.body;
  console.log("redeem request body: ", req.body);

  const access_token = req.headers["authorization"]; // header keys are lowercase
  if (
    access_token ==
    "Bearer lHJ9VTXKc48flDAvcm+gGHi37mIPzZGcEDwJ2OPtcacYyaUDsZu+Or7UQJr8QRe+AKzrZc6EZjR+bg4YK8Fq7g=="
  ) {
    if (req.body.reward_code) {
      // console.log(`inside if check with reward code ${body.reward_code}`);
      try {
        const passKitResponse =
          await passkit_service.GetMemberByExternalIDForRedeem(body);
        if (body.discount_amount > passKitResponse.discount_amount) {
          return res.status(400).json({ message: "insufficient points" });
        }
        const customer = await customer_service.GetByCustomerPhone(
          body.customer_mobile_number
        );
        // console.log("customer respose: ", customer);

        const reward_code = await customer_service.RedeemPointsForCustomer(
          customer[0].id,
          body.order_id,
          customer[0].loyalty_balance,
          body.discount_amount
        );
        const newBalance =
          passKitResponse.discount_amount - body.discount_amount;
        // console.log("NEW BALANCE: ", newBalance);
        const setPoint = {
          externalId: passKitResponse.externalId,
          points: newBalance || 0,
          programId: passKitResponse.programId,
          resetPoints: newBalance == 0 ? true : false,
        };
        // console.log("set point request:", setPoint);
        await passkit_service.SetPoints(setPoint);
        res.status(200).json(customer);
      } catch (error) {
        // res.write(JSON.stringify({ error }));
        res.status(500).json({
          message: error?.message,
          // response: error?.response?.data,
          // status: error?.response?.status,
        });
      }
    }
  } else {
    res.status(401).json({ status: false, message: "invalid access_token" });
  }
});

module.exports = router;
