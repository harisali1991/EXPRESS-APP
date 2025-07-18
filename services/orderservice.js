const connection = require("../db");

function queryAsync(query, values = []) {
  return new Promise((resolve, reject) => {
    connection.query(query, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

async function upsertOrders(body) {
  let inserted = 0;
  let updated = 0;
  const order = body.order;

  if (body.event == "customer.order.updated") {
    await queryAsync(
      `UPDATE Orders SET status = ? WHERE id = ?`,
      [body.order.status,body.order.id]
    );
    updated++;
  } else {
    if (
      order.customer.name.includes("TALABAT") ||
      order.customer.name.includes("JAHEZ") ||
      order.customer.name.includes("Vthru")
    ) {
      return { inserted, updated };
    }

    // Step 2: Record the redemption
    await queryAsync(
      `INSERT INTO orders (
            id, branch_id, branch_name, customer_id, customer_name,
            discount_type, reference_x, number, type, source, status,
            delivery_status, kitchen_notes, business_date, subtotal_price,
            total_price, discount_amount, rounding_amount,
            tax_exclusive_discount_amount, opened_at, closed_at,
            reference, check_number
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )`,
      [
        order.id,
        order.branch.id,
        order.branch.name,
        order.customer?.id || null,
        order.customer?.name || "",
        order.discount_type,
        order.reference_x,
        order.number,
        order.type,
        order.source,
        order.status,
        order.delivery_status,
        order.kitchen_notes,
        order.business_date,
        order.subtotal_price,
        order.total_price,
        order.discount_amount,
        order.rounding_amount,
        order.tax_exclusive_discount_amount,
        order.opened_at,
        order.closed_at,
        order.reference,
        order.check_number,
      ]
    );
    inserted++;
  }
  return { inserted, updated };
}

async function AwardPointsForOrder(order) {

  try {
    const loyaltyBalance = Math.floor(order.total_price) / 20;
    if (loyaltyBalance <= 0) return 0;

    await queryAsync(
      `INSERT INTO LoyaltyTransactions 
         (created_at, customer_id, description, expire_at, order_id, points, status, type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        getFormattedDateTime(),
        order.customer?.id || "",
        `Earned from Order# ${order.reference}`,
        getExpiryFormattedDateTime(),
        order.id,
        loyaltyBalance,
        "Unused",
        "Earn"
      ]
    );
  } catch (err) {
    console.error("Loyalty calculation failed:", err.message);
    return 0;
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
  upsertOrders,
  AwardPointsForOrder
};
