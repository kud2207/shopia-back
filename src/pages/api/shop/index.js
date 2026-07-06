import Shop from 'src/@apiCore/models/shop'
import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'
import authenticate from 'src/middleware/authenticate'
import DeliveryCompany from 'src/@apiCore/models/deliveryCompany'
import bcrypt from 'bcrypt'
import moment from 'moment'

const mongoose = require('mongoose') // Assurez-vous que mongoose est importé

export const config = {
  api: {
    bodyParser: false
  }
}

const isHightProduct = (str1, str2, vals) => {
  const similarity = similarityPercentage(str1, str2) // Calcule la similarité entre str1 et str2
  let highestSimilarity = 0 // Stocke la plus grande similarité trouvée dans vals
  let index = 0

  // Parcours la liste des valeurs pour comparer leur similarité avec str2
  while (index < vals?.length) {
    const val = similarityPercentage(vals[index].name, str2)
    if (val > highestSimilarity ) {
      highestSimilarity = val // Met à jour la similarité la plus élevée si elle est plus grande
    }
    index++
  }

  // Retourne true si la similarité de str1 avec str2 est supérieure ou égale à la plus grande trouvée
  return similarity >= highestSimilarity
}
const similarityPercentage = (str1, str2) => {
  const maxLength = Math.max(str1.length, str2.length)
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  return ((maxLength - distance) / maxLength) * 100
}

const levenshteinDistance = (str1, str2) => {
  const matrix = []

  // Si l'une des chaînes est vide
  if (str1.length === 0) return str2.length
  if (str2.length === 0) return str1.length

  // Initialisation de la matrice
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  // Remplissage de la matrice
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // Substitution
          matrix[i][j - 1] + 1, // Insertion
          matrix[i - 1][j] + 1 // Suppression
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}

export default async function register(req, res) {
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
        const { page, limit, user, q } = req.query

        let queryData = req.query.type ? { role: { $in: req.query.type.split(',') } } : {}
        const pageNumber = parseInt(page) || 1
        const pageSize = parseInt(limit) || 5
        if (user) {
          const shopIds = user.split(',').map(id => new mongoose.Types.ObjectId(id.trim()))
          queryData.users = {
            $elemMatch: {
              _id: { $in: shopIds }
            }
          }
        }
        if (q) {
          queryData.$or = [{ name: { $regex: q } }, { email: { $regex: q } }, { phone: { $regex: q } }]
        }
        let data = [
          { $sort: { createdAt: -1 } },
          {
            $lookup: {
              from: 'users',
              localField: 'users',
              foreignField: '_id',
              as: 'users'
            }
          },
          {
            $match: {
              $and: [queryData]
            }
          }
        ]
        if (req.query.page)
          data.push({
            $facet: {
              data: [{ $skip: pageSize * (pageNumber - 1) }, { $limit: pageSize }],
              pagination: [{ $count: 'total' }]
            }
          })
        const users = await Shop.aggregate(data)
        res.status(200).json({
          success: true,
          data: !req.query.page ? users : users.length > 0 ? users[0].data : [],
          total: !req.query.page ? users.length : users.length > 0 ? users[0].pagination[0]?.total || 0 : 0
        })
      } catch (error) {
        console.log('error', error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        const form = new formidable.IncomingForm()

        form.parse(req, async (err, fields, files) => {
          if (err) res.status(400).json({ success: false })
          if (files && files.image && files.image.name) {
            const url = await uploadFileWithFormidable('public/assets/images/', files.image)
            if (url) fields.logo = url
          }

          if (files && files.file && files.file.name) {
            const url = await uploadFileWithFormidable('public/assets/images/', files.file)
            if (url) fields.file = url
          }
          let shop = null
          let isUserExist = false
          let userData = null

          if (fields.userData) {
            const data = JSON.parse(fields.userData)
            userData = await User.findOne({ $or: [{ phone: data.phone},{email: data.email }] }).populate('shops')
            console.log("userData", userData)
            if (userData) {
              isUserExist = true
              const shops = userData.shops
              shop =
                shops.length == 1
                  ? shops[0]
                  : shops.find(item => item.name?.toLowerCase() == fields.name?.toLowerCase())
              // if (!shop && shops.length) shop = shops.find(item => isHightProduct(item.name, fields.name, shops))
              if (shop) shop = await Shop.findOne({ _id: shop._id })
            } else {
              data.plan= "65fd7ba195f73168d9129069"
              data.subscription_date = moment()
              data.expire_date = moment().add(12, "months")
              if (data.password) data.password = await bcrypt.hash(data.password, 10)
              userData = await User.create(data).catch(error => {
                if (error.code === 11000 && error.keyPattern.email) {
                  return res.status(400).json({
                    message:
                      "Un utilisateur avec cet email existe déjà. Si c'est votre partenaire, demandez-lui de créer la boutique et de vous y ajouter.",
                    ret: false,
                    type: 'error_user_exist',
                    isUserExist: true
                  })
                } else if (error.code === 11000 && error.keyPattern.phone) {
                  return res.status(400).json({
                    message:
                      "Un utilisateur avec ce numéro de téléphone existe déjà. Si c'est votre partenaire, demandez-lui de créer la boutique et de vous y ajouter.",
                    ret: false,
                    type: 'error_phone_exist',
                    isUserExist: true
                  })
                } else {
                  res.status(500).json({
                    message: 'Server error',
                    ret: false,
                    error,
                    type: 'server_error'
                  })
                }
              })
            }
          }
          if (userData) {
            fields.user = userData?._id
          }
          if (fields.categories) fields.categories = JSON.parse(fields.categories)
          if (!shop && !isUserExist && fields.user) shop = await Shop.create(fields)
          if (fields.userData && fields.company && shop) {
            const company = await DeliveryCompany.findOne({ _id: fields.company })
            if (company) {
              await company.addShop(shop._id)
            }
          }
          if (shop) {
            const user = await User.findOne({ _id: fields.user })
            if (user) user.addShop(shop._id)

            res.status(201).json({ success: true, data: shop })
          } else res.status(400).json({ success: false, isUserExist })
        })
      } catch (error) {
        console.log('errorde', error)
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({
            message: 'Un utilisateur ayant ce numéro de téléphone existe déjà',
            ret: false,
            type: 'error_email_exist'
          })
        } else if (error.code === 11000 && error.keyPattern.phone) {
          return res.status(400).json({
            message: 'Un utilisateur ayant cet adresse mail existe déjà',
            ret: false,
            type: 'error_phone_exist'
          })
        } else {
          res.status(500).json({
            message: 'Server error',
            ret: false,
            error,
            type: 'server_error'
          })
        }
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
