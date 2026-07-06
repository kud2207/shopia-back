import Stock from 'src/@apiCore/models/stock'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import moment from 'moment'

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const {
    query: { id },
    method
  } = req
  if (method != 'GET') await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const stock = await Stock.findOne({ _id: id })

        res.status(200).json({ success: true, data: stock })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          console.log(fields)
          const stock = await Stock.findOne({
            jour: new Date(moment().format('YYYY-MM-DD')),
            product: id,
            livreur: fields.company,
            shop: fields.shop
          })

          let result = null
          if (stock) {
            if(fields.stockVendu) fields.stockVendu= stock.stockVendu + parseInt(fields.stockVendu)
            if(fields.produitEchanger) fields.produitEchanger= stock.produitEchanger + parseInt(fields.produitEchanger)

            if (fields.delivery) fields.delivery = JSON.parse(fields.delivery)
            result = await Stock.findByIdAndUpdate(stock._id, fields, {
              new: true,
              runValidators: true
            })
          } else {
            fields.jour = new Date(moment().format('YYYY-MM-DD'))
            fields.stockDisponible = fields.stockVendu
            fields.livreur = fields.company
            fields.product = id
            if(!fields.produitEchanger ) fields.produitEchanger = 0
            fields.stockEnAjout = 0
            result = await Stock.create(fields)
          }

          if (!result) {
            return res.status(400).json({ success: false })
          }

          res.status(200).json({ success: true, data: result })
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deletedUser = await Stock.deleteOne({ _id: id })
        if (!deletedUser) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: {} })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
