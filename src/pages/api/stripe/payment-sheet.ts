// https://docs.stripe.com/payments/accept-a-payment?platform=react-native&ui=payment-sheet

import { CURRENCY } from 'src/utils/config'
import { stripe } from 'src/utils/stripe-server'

export default async function paymentSheet(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  // Get data from your database
  if (req.method == 'POST') {
    // Use an existing Customer ID if this is a returning customer.
    const data = req.body
    const { email, name, phone } = req.body

    const customer = await stripe.customers.create({
      email,
      name,
      phone
    })
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2025-04-30.basil' }
    )

    const paymentIntent = await stripe.paymentIntents.create({
      amount: parseFloat(data.amount),
      currency: data.currency || 'XAF',
      customer: customer.id,
      // In the latest version of the API, specifying the `automatic_payment_methods` parameter
      // is optional because Stripe enables its functionality by default.
      automatic_payment_methods: {
        enabled: true
      }
    })

    return res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customer.id,
      publishableKey: process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
    })
  }
}
