import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import axios from 'axios'
import moment from 'moment'
import mongoose from 'mongoose'
import Comission from 'src/@apiCore/models/commission'
import Earn from 'src/@apiCore/models/earn'
import Shop from 'src/@apiCore/models/shop'
import Plan from 'src/@apiCore/models/plan'
import { createFileStore } from 'src/@apiCore/lib/file-store'
function calculerGainMensuel(montant) {
  return Math.ceil(montant * 0.2)
}
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  const {
    query: { id, response, returnContext, hashcode, countryCurrencyCode, amount, referenceNumber },
    method
  } = req
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        console.log('returnContext', returnContext, response)
        if (response == 0 || response == '0') {
          const responseData = JSON.parse(returnContext)

          if (responseData) {
            const data = responseData.metadata?.split('-duration-')

            // Vérification de la structure des données
            if (data.length >= 1) {
              const user = await User.findById(id)
              let userAdmin = null
              const expireDate = user?.expire_date ? moment(user.expire_date) : null

              // Compare à la date actuelle
              const subscription_date =
                expireDate && expireDate.isAfter(moment())
                  ? expireDate // date d'expiration encore valide
                  : moment()
              console.log("subscription_date", subscription_date)
              const field = {
                plan: data[0],
                subscription_date: new Date(subscription_date),
                expire_date: data.length > 1 ? new Date(subscription_date.add(parseInt(data[1]), 'months')) : null
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
                  role: { $in: ['marchand', 'shop-admin', 'livreur', 'gestionnaire'] }
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
                let users = await User.aggregate(data)

                if (users.length > 0) {
                  const userIds = ['marchand', 'shop-admin'].includes(user.role)
                    ? users.filter(u => u.role != 'livreur' || (u.role == 'livreur' && u.isShopUser)).map(u => u._id)
                    : users.map(u => u._id)
                  const resp = await User.updateMany({ _id: { $in: userIds } }, { $set: field })
                  console.log('Mise à jour réussie :', resp)
                  users = await User.aggregate(data)
                  const shopUser = users?.find(u => u.role == 'marchand')
                  userAdmin = shopUser
                  if (shopUser)
                    for (let shop of shopUser.shops) {
                      if (shop.isScan) {
                        const fileStore = await createFileStore(shop._id)
                        fileStore.saveShop({ ...shop, user: shopUser })
                      }
                    }
                }
              }

              //Gestion du parrainage
              const isLessThanOrEqualTo6Months = moment(user?.createdAt).isSameOrAfter(moment().subtract(6, 'months'))

              if (user.referrer && isLessThanOrEqualTo6Months) {
                const parentUser = await User.findOne({ referrerCode: user.referrer })
                if (parentUser) {
                  const gain = calculerGainMensuel(parseInt(amount) / parseInt(data[1]))
                  const comission = gain * parseInt(data[1])
                  const comissionData = {
                    user: parentUser._id,
                    amount: comission,
                    buyAmount: parseInt(amount),
                    buyer: id
                  }
                  let earn = await Earn.findOne({ user: parentUser._id })
                  if (earn) {
                    await Earn.updateOne({ user: parentUser._id }, { $set: { amount: earn.amount + comission } })
                  } else {
                    await Earn.create({ user: parentUser._id, amount: comission })
                  }
                  await Comission.create(comissionData)
                }
              }
              if (userAdmin) {
                const plan = Plan.findOne({ _id: data[0] })
                if (plan) {
                  const resp = await Shop.updateMany(
                    { _id: { $in: userAdmin.shops } },
                    { $set: { freeCampaign: plan?.access?.freeCampaign || 1 } }
                  )
                }
              }
            }
          }
          return res.status(200).json({ message: 'Paiement effectué avec succès.' })
        } else {
          return res.status(400).json({ message: 'Le paiement a échoué. Veuillez réessayer s’il vous plaît.' })
        }
      } catch (error) {
        console.log('error', error)
        res.status(400).json({ success: false })
      }
      break

    case 'POST':
      try {
        const fields = req.body
        console.log('fields payment', fields)
        if (fields.response == 0 || fields.response == '0') {
          const responseData = JSON.parse(fields.returnContext)

          if (responseData) {
            const data = responseData.metadata.split('-duration-')

            // Vérification de la structure des données
            if (data.length >= 1) {
              const user = await User.findById(id)
              let userAdmin = null
              const subscription_date = moment(user?.expire_date || '').isAfter(moment())
                ? moment(user?.expire_date || '')
                : moment()

              const field = {
                plan: data[0],
                subscription_date: subscription_date,
                expire_date: data.length > 1 ? subscription_date.add(parseInt(data[1]), 'months') : null
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
                let users = await User.aggregate(data)

                if (users.length > 0) {
                  const userIds = ['marchand', 'shop-admin'].includes(user.role)
                    ? users.filter(u => u.role != 'livreur' || (u.role == 'livreur' && u.isShopUser)).map(u => u._id)
                    : users.map(u => u._id)
                  const resp = await User.updateMany({ _id: { $in: userIds } }, { $set: field })
                  console.log('Mise à jour réussie :', resp)
                  users = await User.aggregate(data)
                  const shopUser = users?.find(u => u.role == 'marchand')
                  userAdmin = shopUser
                  if (shopUser)
                    for (let shop of shopUser.shops) {
                      if (shop.isScan) {
                        localStorage.setItem('shop_' + shop._id, JSON.stringify({ ...shop, user: shopUser }))
                      }
                    }
                }
              }

              //Gestion du parrainage
              const isLessThanOrEqualTo6Months = moment(user?.createdAt).isSameOrAfter(moment().subtract(6, 'months'))

              if (user.referrer && isLessThanOrEqualTo6Months) {
                const parentUser = await User.findOne({ referrerCode: user.referrer })
                if (parentUser) {
                  const gain = calculerGainMensuel(parseInt(fields.amount) / parseInt(data[1]))
                  const comission = gain * parseInt(data[1])
                  const comissionData = {
                    user: parentUser._id,
                    amount: comission,
                    buyAmount: parseInt(fields.amount),
                    buyer: id
                  }
                  let earn = await Earn.findOne({ user: parentUser._id })
                  if (earn) {
                    await Earn.updateOne({ user: parentUser._id }, { $set: { amount: earn.amount + comission } })
                  } else {
                    await Earn.create({ user: parentUser._id, amount: comission })
                  }
                  await Comission.create(comissionData)
                }
              }
              if (userAdmin) {
                const plan = Plan.findOne({ _id: data[0] })
                if (plan) {
                  const resp = await Shop.updateMany(
                    { _id: { $in: userAdmin.shops } },
                    { $set: { freeCampaign: plan?.access?.freeCampaign || 1 } }
                  )
                }
              }
            }
          }
          return res.status(200).json({ success: true })
        } else {
          return res.status(400).json({ success: false })
        }
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
