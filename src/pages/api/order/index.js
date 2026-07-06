import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import orderActivity from 'src/@apiCore/models/orderActivity'
import OrderItem from 'src/@apiCore/models/orderItem'
import User from 'src/@apiCore/models/user'

export default async function orders(req, res) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const values = await Order.find({})
        res.status(200).json({
          success: true,
          data: values
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
      }
      break

    case 'POST':
      try {
        const { shop, itemList, date, isNewCustomer, customer, deliveryInfo } = req.body

        // Determine if the customer is new or existing
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

        const lastOrder = await Order.findOne({shop}, {}, { sort: { order_id: -1 } })

        const newOrder = await Order.create({
          shop,
          customer: customerId,
          items: orderItems,
          total: totalOrderPrice,
          status: 'processing',
          date: new Date(date),
          order_id: lastOrder?.order_id ? lastOrder.order_id + 1 : 1,
          deliveryInfo
        })
        await orderActivity.create({
          orderId: newOrder?._id,
          activityLabel: "Creation de la commande",
          activityContent: "Commande creee avec success"
        })
        res.status(201).json({ success: true, data: newOrder })
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
