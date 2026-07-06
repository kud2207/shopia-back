import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import Stock from 'src/@apiCore/models/stock'
import User from 'src/@apiCore/models/user'
import formidable from 'formidable-serverless'
import moment from 'moment'
import { sendPushNotificationToUser } from 'src/@apiCore/helpers'
import mongoose, { isValidObjectId } from 'mongoose'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import authenticate from 'src/middleware/authenticate'
import RefreshOrder from 'src/@apiCore/helpers/refreshData'

export const config = {
  api: {
    bodyParser: false
  }
}
export default async function orders(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        let queryData = {}
        if (req.query.q) {
          queryData.$or = [{ name: { $regex: req.query.q } }, { description: { $regex: req.query.q } }]
        }
        if (req.query.company) {
          queryData.$or = [
            { company: new mongoose.Types.ObjectId(req.query.company) },
            { driver: new mongoose.Types.ObjectId(req.query.company) }
          ]
        }

        if (req.query.livreur) {
          queryData.livreur = new mongoose.Types.ObjectId(req.query.livreur)
        }

        if (req.query.id) {
          queryData._id = new mongoose.Types.ObjectId(req.query.id)
        }

        if (req.query.driver) {
          if (req.query.isDriver) {
            queryData.$or = [{ driver: { $exists: false } }, { driver: new mongoose.Types.ObjectId(req.query.driver) }]
          } else {
            queryData.$or = [
              { createdBy: new mongoose.Types.ObjectId(req.query.driver) },
              { driver: new mongoose.Types.ObjectId(req.query.driver) }
            ]
          }
        }

        if (req.query.status) {
          queryData.status = req.query.status
        }

        if (req.query.shop) {
          const shopIds = req.query.shop.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
          if (shopIds.length > 1) queryData.shop = { $in: shopIds }
          else queryData.shop = new mongoose.Types.ObjectId(req.query.shop)
          // if (!req.query.company) queryData.company = { $exists: false }
        }

        if (req.query.date && !req.query.id) {
          const date = new Date(req.query.date)
          const date_debut = new Date(req.query.date_debut)
          const startDateDay = new Date(date_debut?.setUTCHours(0, 0, 0, 0))

          const startOfDay = new Date(date.setUTCHours(0, 0, 0, 0))
          const endOfDay = new Date(date.setUTCHours(23, 59, 59, 999))

          queryData.$and = [
            {
              $or: [
                {
                  date: {
                    $gte: req.query.date_debut ? startDateDay : startOfDay,
                    $lte: endOfDay
                  }
                },
                {
                  deliveryDate: {
                    $gte: req.query.date_debut ? startDateDay : startOfDay,
                    $lt: endOfDay
                  }
                }
              ]
            }
          ]
        }

        if (req.query.startDate) {
          const date = new Date(req.query.startDate)
          queryData.date = {
            $gte: new Date(date.setUTCHours(0, 0, 0, 0))
          }
        }
        if (req.query.endDate) {
          const date = new Date(req.query.endDate)

          queryData.date = {
            ...queryData.createdAt,
            $lte: new Date(date.setUTCHours(23, 59, 59, 999))
          }
        }

        const deliverys = await Order.find(queryData)
          .sort({ updatedAt: -1 })
          .populate('motif')
          .populate('customer')
          .populate('driver')
          .populate('transferedBy')
          .populate({
            path: 'stock',
            populate: 'product'
          })
        res.status(200).json({
          success: true,
          data: deliverys
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
      }
      break

    case 'POST':
      try {
        const form = new formidable.IncomingForm({ multiples: false })

        form.parse(req, async (err, fields, files) => {
          // Determine if the customer is new or existing
          if (err) res.status(400).json({ success: false })

          let customer = null
          if (
            !fields.shop ||
            (fields.shop && !isValidObjectId(fields.shop)) ||
            (fields.company && !isValidObjectId(fields.company)) ||
            (fields.driver && !isValidObjectId(fields.driver))
          ) {
            return res.status(400).json({
              message: 'Information sur la boutique manquante. Veuillez selectionner la boutique ou reconnectez vous!'
            })
          }

          if (fields.phone) {
            customer = await User.findOne({ phone: fields.phone })
            if (!customer) customer = await User.create({ phone: fields.phone, role: 'customer', name: fields.name })
            fields.customer = customer?._id
          }

          if (fields.order) {
            const order = JSON.parse(fields.order)
            const quantity = order?.reduce((sum, item) => sum + (parseInt(item.quantity) || 1), 0)
            fields.quantity = quantity
            fields.stock = order.map(item => item?._id)
            fields.stocks = order
          }

          if (fields.deliveryDate) {
            fields.deliveryDate = new Date(fields.deliveryDate)
            fields.date = new Date(fields.deliveryDate)
          }
          if (!fields.status) fields.status = 'En attente'

          const delivery = await Order.create(fields).catch(err => {
            console.log(err)
            return res
              .status(400)
              .json({ result: false, message: 'Erreur survenue lors de la création de la commande' })
          })
          if (delivery && fields.status == 'Livré') {
            RefreshOrder(delivery)
          }
          if (delivery && customer) await customer.addOrder(delivery._id)
          if ((fields.company || fields.driver) && delivery) {
            const val =
              'Nouvelle commande à livré: \n No commande: ' +
              delivery.order_id +
              '\n Adresse: ' +
              delivery.adress +
              ' \n Date: ' +
              moment(delivery.deliveryDate).format('DD/MM/YYYY')
            sendPushNotificationToUser(
              'Nouvelle commande ',
              val,
              '',
              fields.company,
              fields.driver,
              delivery._id?.toString()
            )
            handleCreateNotif({
              title: 'Nouvelle commande ',
              // shop: result.shop,
              company: fields.company,
              driver: fields.driver,
              content: val,
              read: false,
              order: delivery._id?.toString()
            })
          }
          res.status(201).json({ success: true, data: delivery })
        })
      } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({ ret: false, message: 'error_user_exist' })
        } else if (error.code === 11000 && error.keyPattern.phone) {
          return res.status(400).json({ ret: false, message: 'error_phone_exist' })
        } else {
          res.status(400).json({ ret: false, error, message: 'error' })
        }
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
