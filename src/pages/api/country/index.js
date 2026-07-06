import Country from 'src/@apiCore/models/country.js'
import dbConnect from 'src/@apiCore/lib/mongodb.js'

export default async function country(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
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
        const values = await Country.find()
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
        const conv = await Country.create(fields)
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
