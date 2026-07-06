import Stock from 'src/@apiCore/models/stock'
import Product from 'src/@apiCore/models/product'
import Order from 'src/@apiCore/models/order'
import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import moment from 'moment'
import mongoose from 'mongoose'
import { sendOrderNotification } from 'src/@apiCore/helpers'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import { createFileStore } from 'src/@apiCore/lib/file-store'

const updateLocks = new Map()

export default async function handler(req, res) {
  const currentDay = new Date(moment().format('YYYY-MM-DD'))

  if (updateLocks.get(moment().format('YYYY-MM-DD'))) return res.status(200).end('Cron already run!')
  updateLocks.set(moment().format('YYYY-MM-DD'), true)

  await dbConnect()
  let stockOfDay = []
  const BATCH_SIZE = 1000
  const queryData = {
    jour: new Date(moment().add(-1, 'day').format('YYYY-MM-DD'))
  }
  const queryData2 = {
    status: 'Livré',
    $or: [
      { date: new Date(moment().add(-1, 'day').format('YYYY-MM-DD')) },
      { deliveryDate: new Date(moment().add(-1, 'day').format('YYYY-MM-DD')) }
    ]
  }

  // Écouter les mises à jour de shopClient

  const data = [
    { $sort: { createdAt: 1 } },
    {
      $lookup: {
        from: 'products',
        localField: 'product',
        foreignField: '_id',
        as: 'product'
      }
    },
    {
      $unwind: {
        path: '$product',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $match: queryData
    }
  ]
  try {
    const todayStocks = await Stock.find({ jour: currentDay })
    const stocks = await Stock.aggregate(data)
    const orders = await Order.find(queryData2)
    const dataStock = []
    if (stocks) {
      for (let item of stocks) {
        const todayS = item
        const stockVendu = orders
          ?.filter(
            val =>
              val.status != 'rechange' &&
              (item.livreur?.toString() == val.company?.toString() ||
                item.driver?.toString() == val.driver?.toString()) &&
              val?.stocks?.find(v => v.product?._id == item?.product?._id)
          )
          .reduce(
            (acc, item2) =>
              acc +
              item2?.stocks?.reduce(
                (acc1, item1) => acc1 + (item1?.product?._id == item?.product?._id ? parseInt(item1.quantity) : 0),
                0
              ),
            0
          )
        const stockEchanger = orders
          ?.filter(
            val =>
              val.status == 'rechange' &&
              (item.livreur?.toString() == val.company?.toString() ||
                item.driver?.toString() == val.driver?.toString()) &&
              val?.stocks?.find(v => v.product?._id == item?.product?._id)
          )
          .reduce(
            (acc, item2) =>
              acc +
              item2?.stocks?.reduce(
                (acc1, item1) => acc1 + (item1?.product?._id == item?.product?._id ? parseInt(item1.quantity) : 0),
                0
              ),
            0
          )

        if ((stockVendu && stockVendu != item.stockVendu) || (stockEchanger && stockEchanger != item.produitEchanger)) {
          if (stockVendu && stockVendu != item.stockVendu) {
            todayS.stockVendu = stockVendu
          }

          if (stockEchanger && stockEchanger != item.produitEchanger) {
            todayS.produitEchanger = stockEchanger
          }
          dataStock.push(todayS)
        }
        if (
          item.product &&
          !item.product.isDelete &&
          !todayStocks.find(val => val.parent?.toString() == item._id?.toString())
        ) {
          const stockItem = {
            jour: currentDay,
            product: item.product?._id,
            stockDisponible:
              item.stockDisponible +
              (item.stockEnAjout || 0) -
              (todayS.stockVendu || 0) -
              (todayS.produitEchanger || 0) -
              (item.stockTransferer || 0) +
              (item.ajoutJourSuivant || 0),
            stockVendu: 0,
            stockEnAjout: 0,
            produitEchanger: 0,
            ajoutJourSuivant: 0,
            shop: item.shop,
            livreur: item.livreur,
            driver: item.driver,
            parent: item._id
          }

          stockOfDay.push(removeEmptyAttributes(stockItem))
        }
      }
      if (stockOfDay.length > 0) {
        for (let i = 0; i < stockOfDay.length; i += BATCH_SIZE) {
          const batch = stockOfDay.slice(i, i + BATCH_SIZE)
          await Stock.insertMany(batch, { ordered: false })
        }

        const prods = await Product.aggregate([
          {
            $addFields: {
              stockRestant: { $subtract: ['$quantity', { $add: ['$quantitySale', '$quantityChange'] }] }
            }
          },
          {
            $match: { stockRestant: { $lt: 5 } }
          },
          {
            $group: {
              _id: '$shop', // Regroupe par boutique
              products: {
                $push: {
                  name: '$name',
                  quantity: '$quantity',
                  quantitySale: '$quantitySale',
                  quantityChange: '$quantityChange',
                  stockRestant: '$stockRestant'
                }
              }
            }
          }
        ])
      }
      if (dataStock.length > 0) {
        const bulkUpdates = dataStock.map(stock => ({
          updateOne: {
            filter: { _id: stock._id },
            update: { $set: { stockVendu: stock.stockVendu, produitEchanger: stock.produitEchanger } }
          }
        }))
        for (let i = 0; i < bulkUpdates.length; i += BATCH_SIZE) {
          const batch = bulkUpdates.slice(i, i + BATCH_SIZE)
          await Stock.bulkWrite(batch)
        }
      }
    }
  } catch (err) {
    console.log('err', err)
  }
  await duplicateTodaysDeliveries()
  await uptadeProductsSalesQty()
  await checkAbonement()
  res.status(200).end('Hello Cron!')
}
function removeEmptyAttributes(obj) {
  for (const key in obj) {
    if (obj[key] === '' || obj[key] === null || obj[key] === undefined) {
      delete obj[key]
    }
    // Si c'est un objet (et non un ObjectId, Date, etc.), on nettoie récursivement
    else if (typeof obj[key] === 'object' && !(obj[key] instanceof Date) && !('$oid' in obj[key])) {
      removeEmptyAttributes(obj[key]) // Nettoyage récursif
      if (Object.keys(obj[key]).length === 0) {
        delete obj[key] // Supprime l'objet s'il est vide après nettoyage
      }
    }
  }
  return obj
}

async function duplicateTodaysDeliveries() {
  try {
    const BATCH_SIZE = 1000
    // Obtenir la date du jour sans l'heure
    const queryData1 = {
      deliveryDate: new Date(moment().format('YYYY-MM-DD')),
      status: 'Non livré'
    }
    // Rechercher toutes les livraisons avec la date du jour
    const deliveries = await Order.find(queryData1)
    if (!deliveries || deliveries.length === 0) {
      return
    }

    // Créer une liste des nouvelles livraisons à insérer
    const newDeliveries = deliveries.map(originalDelivery => ({
      ...originalDelivery.toObject(),
      _id: new mongoose.Types.ObjectId(), // Générer un nouvel ObjectId pour chaque duplication
      parent: originalDelivery._id, // Ajouter l'ID du document parent
      status: 'En attente', // Mettre à jour le statut
      olddate: originalDelivery.date,
      date: new Date(moment().format('YYYY-MM-DD')),
      createdAt: undefined, // Retirer les timestamps
      updatedAt: undefined // Ils seront recréés automatiquement
    }))

    for (let i = 0; i < newDeliveries.length; i += BATCH_SIZE) {
      const batch = newDeliveries.slice(i, i + BATCH_SIZE)
      await Order.insertMany(batch, { ordered: false })
    }

    const bulkUpdates = deliveries.map(delivery => ({
      updateOne: {
        filter: { _id: delivery._id },
        update: { $set: { deliveryDate: delivery.date, olddeliveryDate: delivery.deliveryDate } }
      }
    }))

    for (let i = 0; i < bulkUpdates.length; i += BATCH_SIZE) {
      const batch = bulkUpdates.slice(i, i + BATCH_SIZE)
      await Order.bulkWrite(batch)
    }

    return bulkUpdates
  } catch (error) {
    console.log(error)
    return
  }
}

async function uptadeProductsSalesQty() {
  try {
    const BATCH_SIZE = 1000
    const pdts = []
    // Obtenir la date du jour sans l'heure
    const queryData1 = {
      status: 'Livré'
    }
    // Rechercher toutes les livraisons avec la date du jour
    const orders = await Order.find(queryData1)

    if (!orders || orders.length === 0) {
      return
    }

    for (let item of orders) {
      if (item.stocks && item.stocks.length)
        for (let product of item.stocks) {
          if (!pdts.find(p => p._id == product.product?._id)) {
            const pd = product
            const stockVendu = orders
              ?.filter(val => val.status != 'rechange')
              .reduce(
                (acc, item2) =>
                  acc +
                  item2?.stocks?.reduce(
                    (acc1, item1) =>
                      acc1 + (item1?.product?._id == product?.product?._id ? parseInt(item1.quantity) : 0),
                    0
                  ),
                0
              )

            const stockEchanger = orders
              ?.filter(val => val.status == 'rechange')
              .reduce(
                (acc, item2) =>
                  acc +
                  item2?.stocks?.reduce(
                    (acc1, item1) =>
                      acc1 + (item1?.product?._id == product?.product?._id ? parseInt(item1.quantity) : 0),
                    0
                  ),
                0
              )
            if (stockVendu) {
              pd.quantitySale = stockVendu
            }

            if (stockEchanger) {
              pd.quantityChange = stockEchanger
            }
            if (stockVendu || stockEchanger) pdts.push(pd)
          }
        }
    }
    if (pdts.length) {
      const bulkUpdates = pdts.map(item => ({
        updateOne: {
          filter: { _id: item?.product?._id },
          update: { $set: { quantitySale: item.quantitySale, quantityChange: item.quantityChange } }
        }
      }))

      for (let i = 0; i < bulkUpdates.length; i += BATCH_SIZE) {
        const batch = bulkUpdates.slice(i, i + BATCH_SIZE)
        await Product.bulkWrite(batch)
      }
    }
    return orders
  } catch (error) {
    console.log(error)
    return
  }
}

async function resetStopComptabilityToday() {
  try {
    // Mettre à jour tous les utilisateurs où stopComptabilityToday est true
    const result = await User.updateMany(
      { stopComptabilityToday: true }, // Filtre : tous les utilisateurs avec stopComptabilityToday à true
      { $set: { stopComptabilityToday: false } } // Action : mettre stopComptabilityToday à false
    )
    return result
  } catch (error) {
    return
  }
}

async function checkAbonement() {
  try {

    const rolesAllowed = ['marchand', 'shop-admin', 'entreprise', 'admin-entreprise']

    const usersExpiringSoon = await User.find({
      role: { $in: rolesAllowed },
      $or: [
        { expire_date: { $gte: getDateWithoutTime(7), $lt: getDateWithoutTime(8) } }, // 7 jours
        { expire_date: { $gte: getDateWithoutTime(3), $lt: getDateWithoutTime(4) } }, // 3 jours
        { expire_date: { $gte: getDateWithoutTime(1), $lt: getDateWithoutTime(2) } }, // 1 jour
        { expire_date: { $gte: getDateWithoutTime(0), $lt: getDateWithoutTime(1) } } // 0 jour
      ]
    }).populate('shops')
    console.log('usersExpiringSoon', JSON.stringify(usersExpiringSoon))

    for (let user of usersExpiringSoon) {
      const message =
        moment(user?.expire_date).diff(moment(), 'days') > 1
          ? "Votre abonnement ShopIA s'expire le " +
            moment(user?.expire_date).format('DD/MM/YYYY') +
            ". Veuillez renouveler maintenant pour évité que vos services soint à  l'arrêt"
          : "Votre abonnement ShopIA a expiré et tous les services seront à l'arrêt. Veuillez le renouveler pour activer les services !"
      if (moment(user?.expire_date).isAfter(moment())) {
        sendAbonementNotification(
          user?.email,
          user?.deliveryCompanies?.length ? user.deliveryCompanies[0] : '',
          user.shops?.length ? user.shops[0] : null,
          'Alerte abonnement',
          message
        )
      } else if (user && user.shops?.length) {
        for (let shop of user.shops) {
          if (shop.isScan && user.role == 'marchand') {
            const fileStore = await createFileStore(shop._id)
            fileStore.saveShop({ ...shop, user: user })
          }
        }
      }
    }
    return usersExpiringSoon
  } catch (error) {
    console.log(error)
    return
  }
}
const getDateWithoutTime = daysAhead => {
  const date = new Date()
  const today = new Date()

  date.setDate(today.getDate() + daysAhead)
  date.setHours(0, 0, 0, 0) // Réinitialiser l'heure à 00:00:00
  return date
}
const sendAbonementNotification = async (email, company, shop, title, message) => {
  handleCreateNotif({
    title: title,
    shop: !company ? shop?._id : '',
    company,
    content: message,
    read: false
  })
  //Notify to Email
  if (email) sendOrderNotification(email || shop?.notifyEmail, message, shop?.name, title)
}
