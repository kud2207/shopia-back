// For a fully working example, please see:
// https://github.com/paypal-examples/docs-examples/tree/main/standard-integration
// const CC = require("currency-converter-lt");

const { PAYPAL_CLIENT_ID, PAYPAL_APP_SECRET } = process.env;
const baseURL = "https://api-m.paypal.com"
// {
//   sandbox: "https://api-m.sandbox.paypal.com",
//   production: "https://api-m.paypal.com",
// };

//////////////////////
// PayPal API helpers
//////////////////////

// use the orders api to create an order
export async function createOrder(data1) {
  const accessToken = await generateAccessToken();
  const url = `${baseURL}/v2/checkout/orders`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "USD",
            value: parseFloat(data1.price).toFixed(2),
          },
        },
      ],
      application_context: {
        shipping_preference: "NO_SHIPPING", // Désactiver la collecte des informations de livraison
        landing_page: "NO_PREFERENCE",
      },
    }),
  });
  const data = await response.json();
  console.log("order", data)
  // Return order ID
  return data;
}

// use the orders api to capture payment for an order
export async function capturePayment(orderId) {
  const accessToken = await generateAccessToken();
  const url = `${baseURL}/v2/checkout/orders/${orderId}/capture`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await response.json();
  return data;
}

// generate an access token using client id and app secret
async function generateAccessToken() {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_APP_SECRET).toString(
    "base64"
  );
  const response = await fetch(`${baseURL}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  return data.access_token;
}
