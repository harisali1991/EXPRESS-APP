
const axios = require('axios');

const baseUrl  = "https://api.pub2.passkit.io/";
const access_token = "pX1ZcU4hRRoSvgKzXHdTKN8GGrmBW9IbDeOK2SncJNOmzKF8IEsbjT2ukrgBIvzDXIQb7Pe3389ySkd8DjgGJjGkEeHfyZl8q1euVVvf5J7XoB3p-i_e812iKdYNEe3jjTftVePEnmphXx8TSstoeB96Qj48YPWqg5IDI9iy6smjeso8dRfS5maRP8xJ8b6gJFKTRQWzrw1tCijj5d9PfJpBXaPgaxN5qGyl1smGqSXjBGA-Om5IrlTWxPzt78ywbf6p2Tsdes2NmXSS5sEC67wozjAmewXBG8FXQr5t3ULpJ5FAsjHAJ3wEpBVzdm6w";

async function GetMemberByExternalID(rewardObj) {
	// console.log("inside getmemberbyexternalid", rewardObj);
    const url = `${baseUrl}members/member/externalId/3jjEmzl4YLE3019VgKRyGZ/${rewardObj.reward_code}`;
    // console.log("request url", url);
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        // console.log("response", response.data);
        return {
            type: 1,
            discount_amount: response.data.points || 0,
            is_percent: false,
            require_otp: false,
            customer_mobile_number: response.data.person.mobileNumber || "",
            mobile_country_code: rewardObj.mobile_country_code || "+965",
            reward_code: response.data.externalId,
            business_reference: "494675",
            max_discount_amount: response.data.points || 0,
            discount_includes_modifiers: false,
            allowed_products: null,
            is_discount_taxable: false
        };
    } catch (error) {
        console.error('Error fetching member by external ID:', error);
        throw error;
    }
}

module.exports = {
    GetMemberByExternalID,
};