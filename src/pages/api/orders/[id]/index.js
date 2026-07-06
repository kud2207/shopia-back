import Notification from 'src/@apiCore/models/notifications'
import formidable from 'formidable-serverless'
import { sendPushNotificationToUser, sendPushNotification } from 'src/@apiCore/helpers'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Stock from 'src/@apiCore/models/stock'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import authenticate from 'src/middleware/authenticate'
import moment from 'moment'
import RefreshOrder from 'src/@apiCore/helpers/refreshData'

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
  await authenticate(req, res)

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const delivery = await Order.findOne({ _id: id })

        res.status(200).json({ success: true, data: delivery })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      try {
        const form = new formidable.IncomingForm({ multiples: true })

        form.parse(req, async (err, fields, files) => {
          const lastorder = await Order.findOne({ _id: id })

          if (fields.initialOrder) fields.initialOrder = JSON.parse(fields.initialOrder)
          if (fields.deliveryDate) {
            fields.deliveryDate = new Date(fields.deliveryDate)
            if (fields.status != 'Non livré') fields.date = new Date(fields.deliveryDate)
          }
          if (fields.order) {
            const order = JSON.parse(fields.order)
            const quantity = order?.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)
            fields.quantity = quantity
            fields.stock = order.map(item => item?._id)
            fields.stocks = order
          }

          //Verifier si le livreur peut changer l'état de la commande
          if (fields.check && fields.driver) {
            const oldOrder = await Order.findById(id)
            if (oldOrder?.driver && oldOrder.driver?.toString() != fields.driver) {
              return res.status(400).json({ success: false, notAuth: true })
            }
          }

          const result = await Order.findByIdAndUpdate(id, fields, {
            new: true,
            runValidators: true
          })
          if (!result) {
            return res.status(400).json({ success: false })
          }
          if (fields.status == 'Livré' || lastorder.status == 'Livré') {
            RefreshOrder(result)
          }

          if (fields.isTransfert) {
            const val = `Vous vennez de recevoir une nouvelle commande #${result.order_id} à livré à ${result.adress}!! `
            sendPushNotificationToUser('Nouvelle commande', val, '', fields?.company, fields?.driver, id)
            handleCreateNotif({
              title: 'Nouvelle commande',
              // shop: result.shop,
              company: fields?.company,
              driver: fields?.driver,
              content: val,
              read: false,
              order: id
            })
          }

          if (result && result.shop && result.quantity - result.total <= 10 && result.quantity - result.total > 8) {
            const val =
              'Veuillez revoir le stock du produit suivant: ' + result.name + ': ' + (result.quantity - result.total)
            handleCreateNotif({
              title: 'Alerte status commande',
              shop: result.shop?.toString(),
              // company: result?._id,
              content: val,
              read: false
            })
            sendPushNotificationToUser('Alerte stock', val, result.shop?.toString())
          }
          if (fields.sendNotif && result && result.shop) {
            const val = `La commande #${result.order_id} de ${result.phone} pour ${result.adress} est ${
              result.status
            }. ${result.status == 'Non livré' ? 'Motif: ' + fields.motifText : ''}`
            sendPushNotificationToUser(
              'Alerte status commande',
              val,
              result.shop?.toString(),
              result.company?.toString(),
              '',
              id
            )
            handleCreateNotif({
              title: 'Alerte status commande',
              shop: result.shop?.toString(),
              company: result.company?.toString(),
              content: val,
              read: false,
              order: id
            })
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
        const BATCH_SIZE = 1000
        const order = await Order.findOne({ _id: id })
        if (order.status == 'Livré' && (order.company || order.driver)) {
          for (let stock of order?.stocks) {
            const datas = new FormData()

            const stocks = await Stock.find({
              product: stock.product._id,
              jour: { $gte: new Date(moment(order?.deliveryDate).format('YYYY-MM-DD')) },
              $or: [{ livreur: order.company }, { driver: order.driver }]
            })

            if (stocks.length > 0) {
              const bulkUpdates = stocks.map((s, index) => ({
                updateOne: {
                  filter: { _id: s._id },
                  update: {
                    $set:
                      index == 0 && order.type == 'livraison'
                        ? { stockVendu: parseInt(s.stockVendu) - parseInt(stock.quantity) }
                        : index == 0 && order.type == 'rechange'
                        ? { produitEchanger: parseInt(s.produitEchanger) - parseInt(stock.quantity) }
                        : { stockDisponible: parseInt(s.stockDisponible) + parseInt(stock.quantity) }
                  }
                }
              }))
              for (let i = 0; i < bulkUpdates.length; i += BATCH_SIZE) {
                const batch = bulkUpdates.slice(i, i + BATCH_SIZE)
                await Stock.bulkWrite(batch)
              }
            }
          }
        }
        const deletedUser = await Order.deleteOne({ _id: id })
        RefreshOrder(order)

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
