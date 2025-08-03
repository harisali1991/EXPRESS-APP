const express = require("express");
const router = express.Router();
const passkit_service = require("../services/passkit");
const customer_service = require("../services/customerservice");
const order_service = require("../services/orderservice.js");

router.post("/order/callback", async (req, res) => {
  const body = req.body;
  const order = body.order;
  const orderCustomer = order.customer;
  const dbCustomer = await customer_service.GetByCustomer(orderCustomer.phone);
  const customer = orderCustomer.name.split("-");
  const membership = customer[1]?.trim();
  const loyaltyBalance = Math.floor(order.total_price) / 20;
  let passkit_wallet_id = "";
  if (dbCustomer != null) {
    // check if wallet is created or not for brand wallet customers
    if (!dbCustomer.wallet_id && dbCustomer.is_brandwallet) {
      const wallet_id = await passkit_service.CreateWallet(dbCustomer);
      if (wallet_id != null) {
        passkit_wallet_id = wallet_id;
        // update database with customer wallet Id
        await customer_service.UpdateCustomerWalletId(
          dbCustomer.id,
          wallet_id,
          dbCustomer.loyalty_balance
        );
      } else {
        return res.status(400).json({ message: "wallet already created!" });
      }
    } else {
      console.log("wallet already created!");
    }
  }

  const member = await passkit_service.CheckMemberByExternalID(membership);
  if (!member) {
    return res.status(200).json({ message: "wallet not exist" });
  }
  passkit_wallet_id = member.id;

  if (order.status != 4 && order.status != 5) {
    return res.status(200).json({ message: "order is not done yet" });
  }

  const response = await order_service.upsertOrders(body);

  if (response.inserted > 0) {
    
    //await passkit_service.UpdateMemberByExternalID(membership, loyaltyBalance);
    await passkit_service.UpdateMemberByExternalID(membership, loyaltyBalance);
    await customer_service.UpdateCustomer(
      order.customer,
      loyaltyBalance,
      member.discount_amount,
      passkit_wallet_id,
      member.tier_id
    );
    await order_service.AwardPointsForOrder(body.order, false);
  } else {
    if (body.order.status == 5) {
      await order_service.AwardPointsForOrder(body.order, true);
      await passkit_service.RevertUpdateMemberByExternalID(
        membership,
        loyaltyBalance
      );
      await customer_service.RevertCustomerLoyaltyBalance(
        order.customer,
        loyaltyBalance
      );
    }
  }
  res.status(200).json(response);
  // res.status(200).json({ message: "order callback" });
});

router.post("/adapter/v1/reward", async (req, res) => {
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
        if (!member) {
          return res.status(200).json("no record found!");
        }
        return res.status(200).json(member);
      } catch (error) {
        // res.write(JSON.stringify({ error }));
        return res.status(500).json({
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
      try {
        const passKitResponse =
          await passkit_service.GetMemberByExternalIDForRedeem(body);
        if (body.discount_amount > passKitResponse.discount_amount) {
          return res.status(400).json({ message: "insufficient points" });
        }
        if (!passKitResponse) {
          return res.status(404).json({ message: "wallet not exist" });
        }

        const customer = await customer_service.GetByCustomerPhone(
          body.customer_mobile_number,
          passKitResponse.discount_amount,
          body
        );

        const reward_code = await customer_service.RedeemPointsForCustomer(
          customer.id,
          body.order_id,
          customer.loyalty_balance,
          body.discount_amount
        );
        if (body.discount_amount > 0) {
          const setPoint = {
            externalId: passKitResponse.externalId,
            points: body.discount_amount,
            programId: passKitResponse.programId,
          };
          await passkit_service.BurnPoints(setPoint);
        }
        //await passkit_service.SetPoints(setPoint);
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

router.post("/adapter/v1/signup", async (req, res) => {
  const body = req.body;
  console.log("new wallet created", req.body);
  const customer = await customer_service.GetCustomerByMembership(
    body.pass.externalId
  );
  const setPoint = {
    externalId: body.pass.externalId,
    points: customer.loyalty_balance || 0,
    programId: body.pass.classId,
    resetPoints: customer.loyalty_balance == 0 ? true : false,
  };

  console.log("set brandwallet balance:", setPoint);
  await passkit_service.SetPoints(setPoint);

  // update database with customer wallet Id
  await customer_service.UpdateCustomerWalletId(
    customer.id,
    body.pass.id,
    customer.loyalty_balance,
  );
});

module.exports = router;
