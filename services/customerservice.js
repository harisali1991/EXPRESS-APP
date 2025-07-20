const connection = require("../db");

// function queryAsync(query, values = []) {
//   return new Promise((resolve, reject) => {
//     connection.query(query, values, (err, results) => {
//       if (err) return reject(err);
//       resolve(results);
//     });
//   });
// }

// function GetByCustomerPhone(customer_mobile_number) {
//   return new Promise((resolve, reject) => {
//     if (!customer_mobile_number) {
//       return reject(new Error("Customer mobile number is required"));
//     }

//     const query = "SELECT * FROM customers WHERE phone = ?";
//     connection.query(query, [customer_mobile_number], (err, results) => {
//       if (err) return reject(err);
//       resolve(results);
//     });
//   });
// }
async function GetByCustomerPhone(customer_mobile_number) {
  if (!customer_mobile_number) {
    throw new Error("Customer mobile number is required");
  }

  const query = "SELECT * FROM customers WHERE phone = ?";
  const [rows] = await connection.query(query, [customer_mobile_number]);
  return rows;
}
async function UpdateCustomer(customer, loyalty_balance) {
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
        `UPDATE customers SET loyalty_balance = loyalty_balance + ? WHERE id = ?`,
        [incrementAmount, customer.id]
      );
    } else {
      
      const foodics_customer = customer.name.split("-");
      const membership = foodics_customer[1]?.trim();
      const name = foodics_customer[0]?.trim();
      
      // Step 2b: Customer does not exist — insert new row
      await connection.query(
        `INSERT INTO customers (id, membership, name, phone, email, loyalty_balance) VALUES (?, ?, ?, ?, ?, ?)`,
        [customer.id, membership, name, customer.phone, customer.email, incrementAmount]
      );
    }
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

    console.log(`Reverted ${decrementAmount} from customer ${customer.id}, new balance: ${newBalance}`);
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
    // console.log(`inside RedeemPointsForCustomer function ${customer_id}, ${current_balance}, ${pointsToRedeem}`);
    const now = getFormattedDateTime();
    console.log("NOW: ", now);
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
    await connection.query(`UPDATE customers SET loyalty_balance = ? WHERE id = ?`, [
      newBalance,
      customer_id,
    ]);

    return customer_id;
  } catch (error) {
    console.error("Redemption Error:", error.message);
    return `Error: ${error.message}`;
  }
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

function BalanceToPoint(points) {
  return points * 20;
}

module.exports = {
  GetByCustomerPhone,
  RedeemPointsForCustomer,
  UpdateCustomer,
  RevertCustomerLoyaltyBalance
};
