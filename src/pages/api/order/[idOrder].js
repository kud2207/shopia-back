import { sendOrderNotification } from 'src/@apiCore/helpers'
import { messages } from 'src/@apiCore/helpers/messages'
import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import orderActivity from 'src/@apiCore/models/orderActivity'
import OrderItem from 'src/@apiCore/models/orderItem'
import User from 'src/@apiCore/models/user'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import moment from 'moment'
import { formatNumber } from 'src/@core/utils/format-currency'

const formatOrderActiviyLabel = status => {
  let result = {
    label: '',
    content: ''
  }
  if (status == 'delivered') {
    result.label = 'Livraison de la commande'
    result.content = 'Commande livree avec success'
  } else if (status == 'cancelled') {
    result.label = 'Annulation de la commande'
    result.content = 'Commande annulee avec success'
  } else if (status == 'sent_to_delivry') {
    result.label = 'Commande soumise a livraison'
    result.content = 'Commande soumise a livraison'
  } else {
    result.label = 'Commande en cours de Livraison'
    result.content = 'Commande en cours de livraison'
  }

  return result
}

export default async function updateOrder(req, res) {
  try {
    await dbConnect()

    const orderId = req.query.idOrder
    const { isStatus, ...newObject } = req.body

    if (isStatus === 'Y') {
      const updatedOrder = await Order.findOneAndUpdate({ _id: orderId }, { $set: newObject }, { new: true })
        .populate('shop customer')
        .populate({ path: 'items', populate: 'product' })

      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: 'not_found_order' })
      }

      if (
        newObject.status == 'delivered' ||
        newObject.status == 'cancelled' ||
        newObject.status == 'processing' ||
        newObject.deliveryService
      ) {
        orderActivity.create({
          orderId: orderId,
          activityLabel: formatOrderActiviyLabel(newObject.status ?? 'sent_to_delivry').label,
          activityContent: formatOrderActiviyLabel(newObject.status ?? 'sent_to_delivry').content
        })
      }

      if (newObject.sendNotification && newObject.userNotifyId && newObject.lang) {
        const lang = newObject.lang || 'en'
        //Internal notification
        handleCreateNotif({
          title: newObject?.isDelivery ? messages[lang].notifdevTitle1 : messages[lang].notifdevTitle,
          toChannel: newObject.userNotifyId,
          content: messages[lang].notifTitle,
          redirectionLink: '/app/orders/' + orderId,
          read: false,
          label: messages[lang].viewOrder
        })
        const mailMessage = `<h2 style='text-align:center'>${
          newObject?.isDelivery ? messages[lang].notifdevTitle1 : messages[lang].notifdevTitle
        }</h2><br />
        <b>${messages[lang].shop}</b>: ${updatedOrder?.shop?.name}<br />
        <b>${messages[lang].orderInfo}</b>:<br />
        - ${messages[lang].products}: ${updatedOrder?.items?.map(item => item.product?.name).join(',')}<br />
        - ${messages[lang].total}: ${formatNumber(updatedOrder?.total)} ${updatedOrder?.shop?.currency}<br />
        <b>${messages[lang].clientInfo}</b>:<br />
        - ${messages[lang].name}: ${updatedOrder?.customer?.name || updatedOrder?.customer?.first_name}<br />
        - ${messages[lang].whatsapp}: ${updatedOrder?.customer?.phone}<br />
        - ${messages[lang].devAdress}: ${updatedOrder.deliveryInfo?.address} ${updatedOrder.deliveryInfo?.city}<br />
        - ${messages[lang].devDate}: ${moment(updatedOrder.deliveryInfo?.date).format('DD-MM-YYYY')}<br />
        <div style='display:flex; justify-content:center;'>
         <a class='mail-btn primary' href='https://shopia-app.com/app/orders/${updatedOrder._id}'>${
          messages[lang].viewOrder
        }</a>
        </div>
       `
        //Notify to Email
        if (newObject.userNotifyEmail) sendOrderNotification(newObject.userNotifyEmail, mailMessage, updatedOrder?.name, newObject?.isDelivery ? messages[lang].notifdevTitle1 : messages[lang].notifdevTitle)
      }
      // Respond with success
      res.status(201).json({
        success: true,
        message: 'Order updated successfully',
        data: updatedOrder // Optionally, you can send the updated order back to the client
      })
    } else {
      const { shop, itemList, date, isNewCustomer, customer, deliveryInfo } = req.body
      let customerId
      if (isNewCustomer === 'Y') {
        const parseCustomer = JSON.parse(customer)
        const newUser = await User.create({ ...parseCustomer, role: 'customer' })
        customerId = newUser._id
      } else {
        customerId = customer
      }

      const parsedItemList = JSON.parse(itemList)
      const orderItems = await Promise.all(
        parsedItemList.map(async item => {
          const orderItem = await OrderItem.create({
            product: item.product,
            quantity: item.qty,
            total: item.price
          })

          return orderItem._id
        })
      )

      const totalOrderPrice = parsedItemList.reduce((total, item) => total + item.price, 0)

      const fields = {
        shop,
        customer: customerId,
        items: orderItems,
        total: totalOrderPrice,
        status: 'processing',
        date: new Date(date),
        deliveryInfo
      }
      const updatedOrder = await Order.findOneAndUpdate(
        { _id: orderId }, // Query to find the order by its ID
        fields,
        { new: true } // To return the updated document
      )

      if (!updatedOrder) {
        return res.status(404).json({ success: false, message: 'Order not found' })
      }

      res.status(200).json({ success: true, data: updatedOrder })
    }
  } catch (error) {
    // Handle errors
    console.error(error)
    res.status(400).json({ success: false, message: 'server_error' })
  }
}
