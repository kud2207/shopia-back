import Stock from 'src/@apiCore/models/stock'
import Product from 'src/@apiCore/models/product'
import Order from 'src/@apiCore/models/order'
import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import moment from 'moment'
import mongoose from 'mongoose'
import { ShopManager } from 'src/@apiCore/lib/shop-manager'
import { sendOrderNotification } from 'src/@apiCore/helpers'
import { handleCreateNotif } from 'src/@apiCore/npoints'
const LocalStorage = require('node-localstorage').LocalStorage

const localStorage = new LocalStorage('./storage')
const updateLocks = new Map()

export default async function handler(req, res) {
  const currentDay = new Date(moment().format('YYYY-MM-DD'))

  if (updateLocks.get(moment().format('YYYY-MM-DD'))) return res.status(200).end('Cron already run!')
  updateLocks.set(moment().format('YYYY-MM-DD'), true)

  await dbConnect()
  const BATCH_SIZE = 1000

  const queryData2 = {
    status: 'Livré'
  }

  // Écouter les mises à jour de shopClient

  const todayStocks = await Stock.find({ jour: currentDay })
  const products = await Product.find()
  const orders = await Order.find(queryData2)
  const dataStock = []

  if (products) {
    for (let item of products) {
      const todayS = item
      const stockVendu = orders
        ?.filter(val => val?.stocks?.find(v => v.product?._id == item?._id))
        .reduce(
          (acc, item2) =>
            acc +
            item2?.stocks?.reduce(
              (acc1, item1) => acc1 + (item1?.product?._id == item?._id ? parseInt(item1.quantity) : 0),
              0
            ),
          0
        )
      const pdts = todayStocks?.filter(val => val?.product?.toString() == item._id?.toString())
      const stockDispo = pdts.reduce(
        (acc, item2) => acc + (pdts?.length > 1 ? item2.stockDisponible : Math.abs(item2.stockDisponible)),
        0
      )

      todayS.quantityDispacth = stockVendu + Math.abs(stockDispo)
      if (!item.quantity && todayS.quantityDispacth) {
        todayS.quantity = stockVendu + Math.abs(stockDispo)
      }
      if (todayS.quantityDispacth > todayS.quantity) todayS.quantity = todayS.quantityDispacth

      console.log(item.name, todayS.quantityDispacth, todayS.quantity)

      dataStock.push(todayS)
    }
    // console.log("dataStock", JSON.stringify(dataStock))

    if (dataStock.length > 0) {
      const bulkUpdates = dataStock.map(stock => ({
        updateOne: {
          filter: { _id: stock._id },
          update: { $set: { quantity: stock.quantity, quantityDispacth: stock.quantityDispacth } }
        }
      }))
      for (let i = 0; i < bulkUpdates.length; i += BATCH_SIZE) {
        const batch = bulkUpdates.slice(i, i + BATCH_SIZE)
        await Product.bulkWrite(batch)
      }
    }
  }

  res.status(200).end('Hello Cron!')
}
