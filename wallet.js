
const express = require("express");
const router = express.Router();
const passkit_service = require("../services/passkit");
const customer_service = require("../services/customerservice");
const order_service = require("../services/orderservice.js");




console.log("SET BALANCE OF CUSTOMER REFERENCE >> ", new Date());
(async () => {
  const customers = await customer_service.GetAllCustomer("tem");
  if (customers) {
    for (const element of customers) {
      await customer_service.ResetAmount(element, tierDailyBalance);
      if (element.wallet_id) {
        console.log("wallet updated for", element.name);
        await passkit_service.UpdateMemberByExternalID(element.membership, tierDailyBalance);
      }
    }
  }
  console.log("service completed!");
  
})();
