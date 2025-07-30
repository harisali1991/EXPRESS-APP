const connection = require("../db");
const passkit_service = require("./passkit");
const axios = require("axios");
require("dotenv").config();

async function GetByCustomer(customer_mobile_number) {
  if (!customer_mobile_number) {
    throw new Error("Customer mobile number is required");
  }
  const query = "SELECT * FROM customers WHERE phone = ?";
  const [rows] = await connection.query(query, [customer_mobile_number]);
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}
async function GetCustomerByMembership(member) {
  if (!member) {
    throw new Error("Customer mobile number is required");
  }
  const query = "SELECT * FROM customers WHERE membership = ?";
  const [rows] = await connection.query(query, [member]);
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
}

async function GetByCustomerPhone(
  customer_mobile_number,
  discount_amount,
  body
) {
  if (!customer_mobile_number) {
    throw new Error("Customer mobile number is required");
  }
  const query = "SELECT * FROM customers WHERE phone = ?";
  const [rows] = await connection.query(query, [customer_mobile_number]);
  if (rows.length === 0) {
    console.log("customer not exist is db");
    const foodicsCustomer = await fetchFoodicsCustomers(customer_mobile_number);
    const member = await passkit_service.CheckMemberByExternalID(
      body.reward_code
    );
    //foodicsCustomer.loyalty_balance = discount_amount;
    if (foodicsCustomer) {
      const member_customer = {
        id: foodicsCustomer.id,
        loyalty_balance: member.discount_amount,
      };
      await AddOpeningTransaction(member_customer);
      await UpdateCustomerOpening(
        foodicsCustomer,
        member.discount_amount,
        member.id,
        member.tier_id
      );
    }
    const selectQuery = "SELECT * FROM customers WHERE phone = ?";
    const [customerRows] = await connection.query(selectQuery, [
      customer_mobile_number,
    ]);
    return customerRows[0];
  }
  return rows[0];
}
async function UpdateCustomerWalletId(
  customer_id,
  wallet_id,
  balance,
  tier_id
) {
  await connection.query(`UPDATE customers SET wallet_id = ? WHERE id = ?`, [
    wallet_id,
    customer_id,
  ]);
  const now = getFormattedDateTime();
  // 1. Check if opening transaction already exists
  const [rows] = await connection.query(
    `SELECT id FROM loyaltytransactions 
   WHERE customer_id = ? 
     AND description LIKE 'Opening balance%' 
     AND type = 'Earn'`,
    [customer.id]
  );
  if (rows.length === 0) {
    // 2. Insert only if not found
    await connection.query(
      `INSERT INTO loyaltytransactions 
         (customer_id, points, type, status, description, created_at, expire_at, expired) 
       VALUES (?, ?, 'Earn', 'Unused', ?, ?, ?, ?)`,
      [
        customer_id,
        balance,
        `Opening balance ${balance} points on ${now}`,
        now,
        getExpiryFormattedDateTime(),
        false,
      ]
    );
  } else {
    console.log("Opening balance already exists. Skipping insert.");
  }
  return true;
}

async function UpdateCustomerOpening(
  customer,
  loyalty_balance,
  wallet_id,
  tier_id
) {
  console.log(
    "inside UpdateCustomerOpening function",
    loyalty_balance,
    wallet_id,
    tier_id
  );
  const incrementAmount = Number(loyalty_balance);
  try {
    // Step 1: Check if customer exists
    const [rows] = await connection.query(
      `SELECT id FROM customers WHERE id = ?`,
      [customer.id]
    );
    if (rows.length > 0) {
      // Step 2a: Customer exists — update balance
      await connection.query(
        `UPDATE customers SET loyalty_balance = loyalty_balance + ?, tier_id = ? WHERE id = ?`,
        [incrementAmount, tier_id, customer.id]
      );
    } else {
      const newBalance = loyalty_balance;
      const foodics_customer = customer.name.split("-");
      const membership = foodics_customer[1]?.trim();
      const name = foodics_customer[0]?.trim();
      console.log("updating balance", loyalty_balance);
      // Step 2b: Customer does not exist — insert new row
      await connection.query(
        `INSERT INTO customers (id, membership, name, phone, email, loyalty_balance, wallet_id, tier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.id,
          membership,
          name,
          customer.phone,
          customer.email,
          loyalty_balance,
          wallet_id,
          tier_id,
        ]
      );

      // const now = getFormattedDateTime();
      // await connection.query(
      //   `INSERT INTO loyaltytransactions
      //    (customer_id, points, type, status, description, created_at, expire_at, expired)
      //  VALUES (?, ?, 'Earn', 'Unused', ?, ?, ?, ?)`,
      //   [
      //     customer.id,
      //     loyalty_balance,
      //     `Opening balance ${loyalty_balance} points on ${now}`,
      //     now,
      //     getExpiryFormattedDateTime(),
      //     false,
      //   ]
      // );
    }
  } catch (err) {
    console.log("Error in UpsertCustomer", err.message);
  }
}
async function UpdateCustomer(
  customer,
  loyalty_balance,
  passkit_balance,
  wallet_id,
  tier_id
) {
  console.log("inside UpdateCustomer function", loyalty_balance, tier_id);
  const incrementAmount = Number(loyalty_balance);
  try {
    // Step 1: Check if customer exists
    const [rows] = await connection.query(
      `SELECT id FROM customers WHERE id = ?`,
      [customer.id]
    );
    if (rows.length > 0) {
      // Step 2a: Customer exists — update balance
      await connection.query(
        `UPDATE customers SET loyalty_balance = loyalty_balance + ?, tier_id = ? WHERE id = ?`,
        [incrementAmount, tier_id, customer.id]
      );
    } else {
      const newBalance = passkit_balance + incrementAmount;
      const foodics_customer = customer.name.split("-");
      const membership = foodics_customer[1]?.trim();
      const name = foodics_customer[0]?.trim();
      // console.log("upadating balance", passkit_balance);
      // Step 2b: Customer does not exist — insert new row
      await connection.query(
        `INSERT INTO customers (id, membership, name, phone, email, loyalty_balance, wallet_id, tier_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          customer.id,
          membership,
          name,
          customer.phone,
          customer.email,
          newBalance,
          wallet_id,
          tier_id,
        ]
      );

      const now = getFormattedDateTime();
      await connection.query(
        `INSERT INTO loyaltytransactions 
         (customer_id, points, type, status, description, created_at, expire_at, expired) 
       VALUES (?, ?, 'Earn', 'Unused', ?, ?, ?, ?)`,
        [
          customer.id,
          passkit_balance,
          `Opening balance ${passkit_balance} points on ${now}`,
          now,
          getExpiryFormattedDateTime(),
          false,
        ]
      );
    }
    // const [updateCustomer] = await connection.query(
    //   `SELECT id, loyalty_balance FROM customers WHERE id = ?`,
    //   [customer.id]
    // );
    // console.log("return loyalty balance: ", updateCustomer[0].loyalty_balance);

    // return updateCustomer[0].loyalty_balance;
  } catch (err) {
    console.log("Error in UpsertCustomer", err.message);
  }
}
async function RevertCustomerLoyaltyBalance(customer, loyalty_balance) {
  const decrementAmount = Number(loyalty_balance);

  try {
    // Step 1: Ensure customer exists
    const [rows] = await connection.query(
      `SELECT id, loyalty_balance FROM customers WHERE id = ?`,
      [customer.id]
    );

    if (rows.length === 0) {
      console.log("Customer not found for revert.");
      return;
    }

    const currentBalance = rows[0].loyalty_balance;
    const newBalance = currentBalance - decrementAmount;

    // Step 2: Update with the reverted balance
    await connection.query(
      `UPDATE customers SET loyalty_balance = ? WHERE id = ?`,
      [newBalance, customer.id]
    );

    console.log(
      `Reverted ${decrementAmount} from customer ${customer.id}, new balance: ${newBalance}`
    );
  } catch (err) {
    console.error("Error in RevertCustomerLoyaltyBalance:", err.message);
  }
}
async function RedeemPointsForCustomer(
  customer_id,
  order_id,
  current_balance,
  pointsToRedeem
) {
  try {
    console.log(
      `inside RedeemPointsForCustomer function ${customer_id}, ${current_balance}, ${pointsToRedeem}`
    );
    const now = getFormattedDateTime();
    // Step 1: Get available earned points
    const [earnedPoints] = await connection.query(
      `SELECT * FROM loyaltytransactions 
       WHERE customer_id = ? 
         AND type = 'Earn' 
         AND (status = 'Unused' OR status = 'Partial') 
         AND expired = false 
         AND expire_at > ? 
       ORDER BY created_at ASC`,
      [customer_id, now]
    );
    // console.log("Earned points:", earnedPoints);

    let remaining = pointsToRedeem;
    let totalRedeemed = 0;

    for (const point of earnedPoints) {
      // console.log("inside loop");

      const available = point.points - (point.redeem_amount || 0);
      if (available <= 0) continue;

      const toRedeem = Math.min(available, remaining);
      const newRedeemAmount = (point.redeem_amount || 0) + toRedeem;
      const newStatus = newRedeemAmount === point.points ? "Used" : "Partial";

      // Update the original Earn record
      await connection.query(
        `UPDATE loyaltytransactions SET redeem_amount = ?, status = ? WHERE tid = ?`,
        [newRedeemAmount, newStatus, point.tid]
      );

      remaining -= toRedeem;
      totalRedeemed += toRedeem;
      if (remaining <= 0) break;
    }

    if (remaining > 0) {
      return "Not enough points to redeem.";
    }
    console.log(`${customer_id}, ${pointsToRedeem}, ${now}`);

    // Step 2: Record the redemption
    await connection.query(
      `INSERT INTO loyaltytransactions 
         (customer_id, order_id, points, type, status, description, created_at) 
       VALUES (?, ?, ?, 'Redeem', 'Used', ?, ?)`,
      [
        customer_id,
        order_id,
        -pointsToRedeem,
        `Redeemed ${pointsToRedeem} points on ${now}`,
        now,
      ]
    );

    // Step 3: Update customer balance
    const newBalance = current_balance - pointsToRedeem;
    await connection.query(
      `UPDATE customers SET loyalty_balance = ? WHERE id = ?`,
      [newBalance, customer_id]
    );

    return customer_id;
  } catch (error) {
    console.error("Redemption Error:", error.message);
    return `Error: ${error.message}`;
  }
}
async function AddOpeningTransaction(customer) {
  const now = getFormattedDateTime();
  await connection.query(
    `INSERT INTO loyaltytransactions 
         (customer_id, points, type, status, description, created_at, expire_at, expired) 
       VALUES (?, ?, 'Earn', 'Unused', ?, ?, ?, ?)`,
    [
      customer.id,
      customer.loyalty_balance,
      `Opening balance ${customer.loyalty_balance} points on ${now}`,
      now,
      getExpiryFormattedDateTime(),
      false,
    ]
  );
}
async function AddOpeningTransactionV2(customer, member) {
  const now = getFormattedDateTime();
  await connection.query(
    `INSERT INTO loyaltytransactions 
         (customer_id, points, type, status, description, created_at, expire_at, expired) 
       VALUES (?, ?, 'Earn', 'Unused', ?, ?, ?, ?)`,
    [
      customer.id,
      member.discount_amount,
      `Opening balance ${member.discount_amount} points on ${now}`,
      now,
      getExpiryFormattedDateTime(),
      false,
    ]
  );
}
async function fetchFoodicsCustomers(phone) {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${process.env.BASEURL}/customers?filter[phone]=` + phone,
    headers: {
      Authorization: `Bearer ${process.env.ACCESS_TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };
  const response = await axios.request(config);
  const foodics_customer = response.data?.data?.[0];

  // console.log("foodics_customer:", foodics_customer);
  return foodics_customer || null;
}
function getFormattedDateTime() {
  const now = new Date();
  now.setHours(now.getHours() + 3);
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}
function getExpiryFormattedDateTime() {
  const now = new Date();
  now.setFullYear(now.getFullYear() + 1);
  now.setHours(now.getHours() + 3);
  const yyyy = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
}

module.exports = {
  GetByCustomer,
  GetCustomerByMembership,
  UpdateCustomerWalletId,
  UpdateCustomer,
  GetByCustomerPhone,
  RedeemPointsForCustomer,
  UpdateCustomerOpening,
  RevertCustomerLoyaltyBalance,
  AddOpeningTransaction,
  AddOpeningTransactionV2,
};
