import User from 'src/@apiCore/models/user'
import Shop from 'src/@apiCore/models/shop'
import Plan from 'src/@apiCore/models/plan'
import dbConnect from 'src/@apiCore/lib/mongodb'
import axios from 'axios'
import moment from 'moment'
import mongoose from 'mongoose'
import Comission from 'src/@apiCore/models/commission'
import Earn from 'src/@apiCore/models/earn'
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
        if (fields.cpm_site_id && fields.cpm_trans_id) {
          axios
            .post('https://api-checkout.cinetpay.com/v2/payment/check', {
              apikey: process.env.CINETPAY_API_KEY,
              site_id: fields.cpm_site_id,
              transaction_id: fields.cpm_trans_id
            })
            .then(async responses => {
              const responseData = responses.data?.data

              if (responseData && responseData.status === 'ACCEPTED' && (responseData.metadata || fields.cpm_custom)) {
                const data = (fields.cpm_custom || responseData.metadata).split('-duration-')

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
                      role: { $in: ['marchand', 'shop-admin', 'gestionnaire', 'livreur'] }
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
                        ? users
                            .filter(u => u.role != 'livreur' || (u.role == 'livreur' && u.isShopUser))
                            .map(u => u._id)
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
                  const isLessThanOrEqualTo6Months = moment(user?.createdAt).isSameOrAfter(
                    moment().subtract(6, 'months')
                  )

                  if (user.referrer && isLessThanOrEqualTo6Months) {
                    const parentUser = await User.findOne({ referrerCode: user.referrer })
                    if (parentUser) {
                      const amount =
                        typeof fields.cpm_amount == 'number' ? fields.cpm_amount : parseInt(fields.cpm_amount)
                      const gain = calculerGainMensuel(amount / parseInt(data[1]))
                      const comission = gain * parseInt(data[1])
                      const comissionData = {
                        user: parentUser._id,
                        amount: comission,
                        buyAmount: amount,
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
            })
            .catch(error => {
              console.error('Erreur lors de la requête Cinetpay :', error)
            })
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
