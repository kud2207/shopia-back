import axios from 'axios'
import PayCountry from 'src/@apiCore/models/paycountries'

export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  switch (method) {
    case 'GET': {
      try {
        const data = await PayCountry.findOne()

        return res.status(200).json({
          success: true,
          data: data
        })
      } catch (error) {
        console.error('Erreur génération token :', error)
        return null
      }

      break
    }

    default:
      res.status(400).json({ success: false })
      break
  }
}
