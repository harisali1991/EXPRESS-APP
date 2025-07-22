const axios = require("axios");
require("dotenv").config();

const baseUrl = "https://api.pub2.passkit.io/";
const access_token =
  "pX1ZcU4hRRoSvgKzXHdTKN8GGrmBW9IbDeOK2SncJNOmzKF8IEsbjT2ukrgBIvzDXIQb7Pe3389ySkd8DjgGJjGkEeHfyZl8q1euVVvf5J7XoB3p-i_e812iKdYNEe3jjTftVePEnmphXx8TSstoeB96Qj48YPWqg5IDI9iy6smjeso8dRfS5maRP8xJ8b6gJFKTRQWzrw1tCijj5d9PfJpBXaPgaxN5qGyl1smGqSXjBGA-Om5IrlTWxPzt78ywbf6p2Tsdes2NmXSS5sEC67wozjAmewXBG8FXQr5t3ULpJ5FAsjHAJ3wEpBVzdm6w";
const programId = "3jjEmzl4YLE3019VgKRyGZ";

async function CreateWallet(paramCustomer) {
  const name = paramCustomer.name.split(" ")[0];
  const data = {
    externalId: paramCustomer.membership,
    tierId: "purple_power",
    programId: programId,
    person: {
      surname: name,
      forename: name,
      displayName: name,
      mobileNumber: paramCustomer.phone,
      externalId: paramCustomer.id,
    },
    optOut: false,
    points: paramCustomer.loyalty_balance,
    secondaryPoints: 0,
    tierPoints: parseInt(paramCustomer.loyalty_balance),
    status: "ENROLLED",
    operation: "OPERATION_DO_NOT_USE",
  };
  console.log("wallet create request data", data);
  let config = {
    method: "POST",
    url: `${baseUrl}members/member`,
    data: JSON.stringify(data),
    headers: {
      Authorization: `Bearer ${access_token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await axios.request(config);

    // ✅ Success handling
    if (response.data?.id) {
      console.log("Wallet created:", response.data.id);
      return response.data.id;
    } else {
      console.warn("Unexpected response:", response.data);
      return null;
    }
  } catch (error) {
    // ❌ Error handling
    if (error.response && error.response.data?.error) {
      console.error("Wallet creation failed:", error.response.data.error);
    } else {
      console.error("Unexpected error:", error.message);
    }
    return null;
  }
}

async function CheckMemberByExternalID(membership) {
  const url = `${baseUrl}members/member/externalId/3jjEmzl4YLE3019VgKRyGZ/${membership}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    return {
      type: 1,
      discount_amount: response.data.points || 0,
      is_percent: false,
      require_otp: false,
      id: response.data.id,
      // customer_mobile_number: response.data.person.mobileNumber || "",
      reward_code: response.data.externalId,
      max_discount_amount: response.data.points || 0,
      discount_includes_modifiers: false,
      allowed_products: null,
      is_discount_taxable: false,
    };
  } catch (error) {
    // console.error('Error fetching member by external ID:', error.message);
    return null;
  }
}
async function GetMemberByExternalID(rewardObj) {
  const url = `${baseUrl}members/member/externalId/3jjEmzl4YLE3019VgKRyGZ/${rewardObj.reward_code}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    return {
      type: 1,
      discount_amount: response.data.points || 0,
      is_percent: false,
      require_otp: false,
      // customer_mobile_number: response.data.person.mobileNumber || "",
      customer_mobile_number: rewardObj.customer_mobile_number || "",
      mobile_country_code: rewardObj.mobile_country_code || "+965",
      reward_code: response.data.externalId,
      business_reference: rewardObj.business_reference,
      max_discount_amount: response.data.points || 0,
      discount_includes_modifiers: false,
      allowed_products: null,
      is_discount_taxable: false,
    };
  } catch (error) {
    console.error("Error fetching member by external ID:", error);
    throw error;
  }
}
async function UpdateMemberByExternalID(externalId, balance) {
  const url = `${baseUrl}members/member/externalId/${programId}/${externalId}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const points = response.data.points || 0;
    const newBalance = points + balance;
    const setPoint = {
      externalId: response.data.externalId,
      points: newBalance || 0,
      tierPoints: parseInt(newBalance),
      programId: response.data.programId,
      resetPoints: newBalance == 0 ? true : false,
    };
    await SetPoints(setPoint);
  } catch (error) {
    console.error("Error fetching member by external ID:", error);
    throw error;
  }
}
async function RevertUpdateMemberByExternalID(externalId, balance) {
  const url = `${baseUrl}members/member/externalId/${programId}/${externalId}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const currentPoints = response.data.points || 0;
    const revertedBalance = currentPoints - balance;

    const setPoint = {
      externalId: response.data.externalId,
      points: revertedBalance < 0 ? 0 : revertedBalance,
      programId: response.data.programId,
      resetPoints: revertedBalance <= 0,
    };

    await SetPoints(setPoint);
  } catch (error) {
    console.error("Error reverting member points by external ID:", error);
    throw error;
  }
}
async function GetMemberByExternalIDForRedeem(rewardObj) {
  const url = `${baseUrl}members/member/externalId/3jjEmzl4YLE3019VgKRyGZ/${rewardObj.reward_code}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    return {
      type: 1,
      discount_amount: response.data.points || 0,
      is_percent: false,
      require_otp: false,
      customer_mobile_number: rewardObj.customer_mobile_number || "",
      mobile_country_code: rewardObj.mobile_country_code || "+965",
      reward_code: response.data.externalId,
      business_reference: rewardObj.business_reference,
      max_discount_amount: response.data.points || 0,
      discount_includes_modifiers: false,
      allowed_products: null,
      is_discount_taxable: false,
      externalId: response.data.externalId,
      programId: response.data.programId,
    };
  } catch (error) {
    console.error(
      "Error fetching member by external ID :",
      response.data.externalId,
      error?.message
    );
    throw error;
  }
}
async function SetPoints(pointsObj) {
  const url = `${baseUrl}members/member/points/set`;
  try {
    const response = await axios.put(url, pointsObj, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    console.log("wallet update successful:", response.data);
  } catch (error) {
    console.error("wallet update error:", error);
    throw error;
  }
}
module.exports = {
  CreateWallet,
  GetMemberByExternalID,
  GetMemberByExternalIDForRedeem,
  UpdateMemberByExternalID,
  RevertUpdateMemberByExternalID,
  SetPoints,
  CheckMemberByExternalID,
};
