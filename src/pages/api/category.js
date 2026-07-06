import Category from 'src/@apiCore/models/category.js'
import dbConnect from 'src/@apiCore/lib/mongodb'

export default async function category(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
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
        const values = await Category.find().sort({ name: 1 })

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
        const conv = await Category.create(fields)

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
