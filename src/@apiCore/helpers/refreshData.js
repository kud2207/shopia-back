import Stock from 'src/@apiCore/models/stock'
import Order from 'src/@apiCore/models/order'
import dbConnect from 'src/@apiCore/lib/mongodb'
import moment from 'moment'
import mongoose from 'mongoose'

export default async function RefreshOrder(order) {
  await dbConnect()
  const BATCH_SIZE = 1000
  const queryData = {
    jour: new Date(moment().format('YYYY-MM-DD')),
    shop: new mongoose.Types.ObjectId(order?.shop)
  }
  const queryData2 = {
    status: 'Livré',
    shop: order?.shop,
    $or: [{ date: new Date(moment().format('YYYY-MM-DD')) }, { deliveryDate: new Date(moment().format('YYYY-MM-DD')) }]
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
    const stocks = await Stock.aggregate(data)
    const orders = await Order.find(queryData2)
    const dataStock = []
    if (stocks.length) {
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
        if (stockVendu && stockVendu != item.stockVendu) {
          todayS.stockVendu = stockVendu
        }

        if (stockEchanger && stockEchanger != item.produitEchanger) {
          todayS.produitEchanger = stockEchanger
        }

        dataStock.push(todayS)
      }
      console.log(dataStock)

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
}
