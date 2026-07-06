import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import axios from 'axios'
import moment from 'moment'
import Setting from 'src/@apiCore/models/setting'
import Plan from 'src/@apiCore/models/plan'
import mongoose from 'mongoose'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  const {
    query: { id },
    method
  } = req
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const user = await User.findById(id)
        if (!user) {
          return res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: user })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'POST':
      try {
        const fields = req.body
        console.log(fields)
        if (fields.duration && fields.plan) {
          // Vérification de la structure des données
          const user = await User.findOne({ _id: id })

          const field = {
            plan: fields.plan,
            subscription_date: moment(user?.expire_date || ''),
            expire_date: moment(user?.expire_date).add(parseInt(fields.duration), 'months')
          }

          if (!user) {
            console.error('Utilisateur introuvable')
            return
          }

          let queryData = null
          if (['marchand', 'shop-admin'].includes(user.role)) {
            const shopIds = user.shops?.map(id => new mongoose.Types.ObjectId(id))

            queryData = {
              shops: {
                $elemMatch: {
                  _id: { $in: shopIds }
                }
              },
              role: { $in: ['marchand', 'shop-admin', 'gestionnaire'] }
            }
          } else if (['entreprise', 'admin-entreprise'].includes(user.role)) {
            const Ids = user.deliveryCompanies?.map(id => new mongoose.Types.ObjectId(id))

            queryData = {
              deliveryCompanies: {
                $elemMatch: {
                  _id: { $in: Ids }
                }
              },
              role: { $in: ['entreprise', 'admin-entreprise', 'gestionnaire-entreprise', 'livreur'] }
            }
          }

          if (queryData) {
            console.log(JSON.stringify(queryData))
            let data = [
              {
                $lookup: {
                  from: 'shops',
                  localField: 'shops',
                  foreignField: '_id',
                  as: 'shops'
                }
              },
              {
                $lookup: {
                  from: 'deliverycompanies',
                  localField: 'deliveryCompanies',
                  foreignField: '_id',
                  as: 'deliveryCompanies'
                }
              },
              {
                $match: {
                  $and: [queryData]
                }
              }
            ]
            const users = await User.aggregate(data)
            console.log(JSON.stringify(users))

            if (users.length > 0) {
              const userIds = users.map(u => u._id)
              const resp = await User.updateMany({ _id: { $in: userIds } }, { $set: field })
              console.log('Mise à jour réussie :', resp)
            }
          }

          return res.status(200).json({ success: true })
        } else {
          return res.status(400).json({ success: false })
        }
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
