import Currency from 'src/@apiCore/models/currency.js'
import dbConnect from 'src/@apiCore/lib/mongodb'

export default async function currency(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        const values = await Currency.find()
        res.status(200).json({
          success: true,
          data: values
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
      }
      break
    case 'POST':
      try {
        const fields = req.body
        const conv = await Currency.create(fields)

        if (conv) res.status(201).json({ success: true, data: conv })
        else res.status(400).json({ success: false })
      } catch (error) {
        res.status(400).json({ success: false, message: error.message })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
