import mongoose from 'mongoose'
import { createFileStore } from 'src/@apiCore/lib/file-store'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'

export default async function preview(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ body: 'OK' })
  }

  const { method } = req
  await dbConnect()

  switch (method) {
    case 'GET': {
      const { shopId, minOrders, productIds } = req.query

      if (!shopId) return res.status(400).json({ success: false, message: 'Missing shopId' })

      const fileStore = await createFileStore(shopId)
      const [groups, contacts, chats, unknows, threads] = await Promise.all([
        fileStore.getGroups(),
        fileStore.getContacts(),
        fileStore.getChats(),
        fileStore.getChatsOutContacts(),
        fileStore.getThreads()
      ])

      // Build match condition
      const match = {
        shop: new mongoose.Types.ObjectId(shopId)
      }

      // Si des produits sont spécifiés
      if (productIds) {
        const productIdArray = productIds.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
        match['stocks.product._id'] = { $in: productIdArray }
      }

      // Pipeline de base
      const pipeline = [
        { $match: match },
        {
          $group: {
            _id: '$customer',
            count: { $sum: 1 } // Nombre de commandes par client
          }
        }
      ]

      // Si on veut filtrer les clients ayant commandé au moins X fois
      if (minOrders) {
        pipeline.push({
          $match: {
            count: { $gte: parseInt(minOrders) }
          }
        })
      }

      // Finalement, on compte les clients uniques
      pipeline.push({
        $count: 'distinctCustomers'
      })

      const orders = await Order.aggregate(pipeline)

      res.status(200).json({
        success: true,
        groups,
        contacts,
        chats: chats.length && chats.length > threads.length ? chats : threads,
        unknows,
        clients: orders?.[0]?.distinctCustomers || 0
      })
      break
    }

    default:
      res.status(400).json({ success: false })
      break
  }
}
