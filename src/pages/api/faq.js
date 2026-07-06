import Faq from 'src/@apiCore/models/faq.js'
import dbConnect from 'src/@apiCore/lib/mongodb'

export default async function faq(req, res) {
  const { method } = req
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        const queryData = {}
        if (req.query.type) queryData.type = req.query.type
        const values = await Faq.find(queryData)
        res.status(200).json({
          success: true,
          data: values
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const fields = req.body
        const conv = await Faq.create(fields)
        if (conv) res.status(201).json({ success: true, data: conv })
        else res.status(400).json({ success: false })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
