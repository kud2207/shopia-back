import type { Stripe } from 'stripe'

import { stripe } from 'src/utils/stripe-server'

export default async function paymentResult(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  if (req.method == 'GET') {
    const session_id = req.query?.session_id

    if (!session_id) {
      throw new Error('Please provide a valid session_id (`cs_test_...`)')
    }

    const checkoutSession: Stripe.Checkout.Session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'payment_intent']
    })

    return res.json(checkoutSession)
  }
}
