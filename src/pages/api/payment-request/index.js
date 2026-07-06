import Payment from 'src/@apiCore/models/payment'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function PaymentRequest(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const method = req.method
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const payment = await Payment.find({ _id: id })
        if (!payment) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: payment })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields, files) => {
          // Determine if the customer is new or existing
          if (err) res.status(400).json({ success: false })
          const payment = await Payment.create(fields).catch(err => res.status(401).json({ success: false, error: err }))
          console.log('payment created ', payment)
          if (payment) res.status(201).json({ success: true, data: payment })
          else res.status(400).json({ success: false })
        })
      } catch (error) {
        console.log('error payment ', error)
        res.status(400).json({ success: false, error: error })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
