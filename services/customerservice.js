const connection = require("../db");

function queryAsync(query, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function GetByCustomerPhone(customer_mobile_number) {
  return new Promise((resolve, reject) => {
    if (!customer_mobile_number) {
      return reject(new Error("Customer mobile number is required"));
    }

    const query = "SELECT * FROM Customers WHERE phone = ?";
    connection.query(query, [customer_mobile_number], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}
async function RedeemPointsForCustomer(customer_id, current_balance, pointsToRedeem) {
  try {
    const now = getFormattedDateTime();

    // Step 1: Get available earned points
    const earnedPoints = await queryAsync(
      `SELECT * FROM LoyaltyTransactions 
       WHERE customer_id = ? 
         AND type = 'Earn' 
         AND (status = 'Unused' OR status = 'Partial') 
         AND expired = false 
         AND expire_at > ? 
       ORDER BY created_at ASC`,
      [customer_id, now]
    );

    console.log("Earned points:", earnedPoints);

    let remaining = pointsToRedeem;

    for (const point of earnedPoints) {
      const available = point.points - (point.redeem_amount || 0);
      if (available <= 0) continue;

      const toRedeem = Math.min(available, remaining);
      const newRedeemAmount = (point.redeem_amount || 0) + toRedeem;
      const newStatus = newRedeemAmount === point.points ? "Used" : "Partial";

      remaining -= toRedeem;
      if (remaining <= 0) break;
    }

    if (remaining > 0) {
      return "Not enough points to redeem.";
    }

    // Step 2: Record the redemption
    await queryAsync(
      `INSERT INTO LoyaltyTransactions 
         (customer_id, points, type, status, description, created_at) 
       VALUES (?, ?, 'Redeem', 'Used', ?, ?)`,
      [
        customer_id,
        -pointsToRedeem,
        `Redeemed ${pointsToRedeem} points on ${now}`,
        now,
      ]
    );

    // Step 3: Update customer balance
    const newBalance = current_balance - pointsToRedeem;
    await queryAsync(
      `UPDATE Customers SET loyalty_balance = ? WHERE id = ?`,
      [newBalance, customer_id]
    );

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
};
