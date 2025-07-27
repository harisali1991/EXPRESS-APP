const connection = require("../db");

// async function upsertOrders(body) {
//   try {
//     let inserted = 0;
//     let updated = 0;
//     const order = body.order;

//     if (body.event == "customer.order.updated") {
//       // check if order exist before or not
//       const [orderExist] = await connection.query(
//         `select * from orders where id = ?`,
//         [order.id]
//       );
//       if (orderExist.length > 0) {
//         await connection.query(`UPDATE orders SET status = ? WHERE id = ?`, [
//           order.status,
//           order.id,
//         ]);
//         updated++;
//         return { inserted, updated };
//       }
//     }
//     if (
//       order.customer.name.includes("TALABAT") ||
//       order.customer.name.includes("JAHEZ") ||
//       order.customer.name.includes("Vthru")
//     ) {
//       return { inserted, updated };
//     }
//     if(order.status == 5){
//       inserted = 0;
//       updated = 0;
//       return { inserted, updated };
//     }

//     await connection.query(
//       `INSERT INTO orders (
//         id, branch_id, branch_name, customer_id, customer_name,
//         discount_type, reference_x, number, type, source, status,
//         delivery_status, kitchen_notes, business_date, subtotal_price,
//         total_price, discount_amount, rounding_amount,
//         tax_exclusive_discount_amount, opened_at, closed_at,
//         reference, check_number
//         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         order.id,
//         order.branch.id,
//         order.branch.name,
//         order.customer?.id || null,
//         order.customer?.name || "",
//         order.discount_type,
//         order.reference_x,
//         order.number,
//         order.type,
//         order.source,
//         order.status,
//         order.delivery_status,
//         order.kitchen_notes,
//         order.business_date,
//         order.subtotal_price,
//         order.total_price,
//         order.discount_amount,
//         order.rounding_amount,
//         order.tax_exclusive_discount_amount,
//         order.opened_at,
//         order.closed_at,
//         order.reference,
//         order.check_number,
//       ]
//     );
//     inserted++;

//     return { inserted, updated };
//   } catch (err) {
//     console.log("error message:", err.message);
//   }
// }

async function upsertOrders(body) {
  try {
    let inserted = 0;
    let updated = 0;
    const order = body.order;

    // Always check if order exists
    const [orderExist] = await connection.query(
      `SELECT * FROM orders WHERE id = ?`,
      [order.id]
    );

    // If exists, update it
    if (orderExist.length > 0) {
      await connection.query(`UPDATE orders SET status = ? WHERE id = ?`, [
        order.status,
        order.id,
      ]);
      updated++;
      return { inserted, updated };
    }

    // Skip if from delivery platforms
    if (
      order.customer.name.includes("TALABAT") ||
      order.customer.name.includes("JAHEZ") ||
      order.customer.name.includes("Vthru")
    ) {
      return { inserted, updated };
    }

    // Skip if status is 5 (probably voided/cancelled)
    if (order.status == 5) {
      return { inserted, updated };
    }

    // Insert if not exists
    await connection.query(
      `INSERT INTO orders (
        id, branch_id, branch_name, customer_id, customer_name,
        discount_type, reference_x, number, type, source, status,
        delivery_status, kitchen_notes, business_date, subtotal_price,
        total_price, discount_amount, rounding_amount,
        tax_exclusive_discount_amount, opened_at, closed_at,
        reference, check_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    return { inserted, updated };
  } catch (err) {
    console.log("error message:", err.message);
    return { inserted: 0, updated: 0 }; // Optional safety
  }
}


async function AwardPointsForOrder(order, isReturn = false) {
  try {
    const loyaltyBalance = Math.floor(order.total_price) / 20;
    if (loyaltyBalance <= 0) return 0;

    // Check if a loyalty transaction for this order already exists
    const [existing] = await connection.query(
      `SELECT * FROM loyaltytransactions WHERE order_id = ? AND type = 'Earn'`,
      [order.id]
    );

    if (existing.length === 0 && !isReturn) {
      console.log("insert statement for transaction");
      // ✅ First time awarding points for this order
      await connection.query(
        `INSERT INTO loyaltytransactions 
           (created_at, customer_id, description, expire_at, order_id, points, status, type, expired) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          getFormattedDateTime(),
          order.customer?.id || "",
          `Earned from Order# ${order.reference}`,
          getExpiryFormattedDateTime(),
          order.id,
          loyaltyBalance,
          "Unused",
          "Earn",
          false,
        ]
      );
    } else if (existing.length > 0 && isReturn) {
      // ❌ Order is being returned, reverse points
      await connection.query(
        `INSERT INTO loyaltytransactions 
           (created_at, customer_id, description, expire_at, order_id, points, status, type, expired) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          getFormattedDateTime(),
          order.customer?.id || "",
          `Reversed points for returned Order# ${order.reference}`,
          getExpiryFormattedDateTime(),
          order.id,
          -loyaltyBalance,
          "Used",
          "Adjustment", // or "Reversal"
          false,
        ]
      );

      // Optionally, mark original Earn as expired or reversed
      await connection.query(
        `UPDATE loyaltytransactions SET status = 'Reversed', expired = true WHERE order_id = ? AND type = 'Earn'`,
        [order.id]
      );
    }

    return loyaltyBalance;
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
  AwardPointsForOrder,
};
