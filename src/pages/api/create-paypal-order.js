import { createOrder } from "src/@apiCore/helpers/paypal";

export default async function login(req, res) {
  //Preflight CORS handler
  if (req.method === "OPTIONS") {
    return res.status(200).json({
      body: "OK",
    });
  }
  // Get data from your database
  if (req.method == "POST") {
    const order = await createOrder(req.body?.cart[0]);
    res.json(order);
  } else {
    res.status(404).json({
      message: "not found",
    });
  }
}
