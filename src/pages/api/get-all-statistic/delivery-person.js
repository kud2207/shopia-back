import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import moment from 'moment'
import DeliveryService from 'src/@apiCore/models/deliveryService'
import 'moment/locale/en-gb'

moment.locale('en-gb')

const getCurrentMonthStartDate = () => {
  return moment().startOf('month').toDate()
}

const getCurrentMonthEndDate = () => {
  return moment().endOf('month').toDate()
}

export default async function statistic(req, res) {
  await dbConnect()
  try {
    const { userId } = req.query

    const currentMonthStart = getCurrentMonthStartDate()
    const currentMonthEnd = getCurrentMonthEndDate()

    const currentWeekStart = moment().startOf('week').toDate() // Sunday
    const currentWeekEnd = moment().endOf('week').toDate() // Monday

    const previousMonthStart = moment().subtract(1, 'month').startOf('month').toDate()
    const previousMonthEnd = moment().subtract(1, 'month').endOf('month').toDate()

    const weeklyRevenueByDay =
      moment.locale() == 'fr'
        ? {
          dimanche: 0,
          lundi: 0,
          mardi: 0,
          mercredi: 0,
          jeudi: 0,
          vendredi: 0,
          samedi: 0
          }
        : {
            Sunday: 0,
            Monday: 0,
            Tuesday: 0,
            Wednesday: 0,
            Thursday: 0,
            Friday: 0,
            Saturday: 0
          }
    let totalWeeklyRevenue = 0

    let totalOrderCount = 0
    let totalDeliveryPriceTotal = 0
    let currentMonthRevenue = 0
    let deliveryPriceTotalLastMonth = 0

    const deliveryServices = await DeliveryService.find({ user: userId })
    const deliveryIdsPromises = deliveryServices.map(async item => item._id)
    const deliveryIds = await Promise.all(deliveryIdsPromises)

    const allOrders = await Order.find({
      deliveryService: { $in: deliveryIds },
      status: 'delivered'
    })
    const totalUndeliveryOrders = await Order.countDocuments({
      deliveryService: { $in: deliveryIds },
      status: { $ne: 'delivered' }
    })

    totalOrderCount += allOrders.length
    const deliveryPriceTotalAllOrders = allOrders.reduce((total, order) => total + (order.deliveryPrice || 0), 0)
    totalDeliveryPriceTotal += deliveryPriceTotalAllOrders

    const ordersCurrentMonth = allOrders.filter(item => {
      const updatedAt = moment(item.updatedAt)
      return updatedAt.isAfter(currentMonthStart) && updatedAt.isBefore(currentMonthEnd)
    })

    const deliveryPriceTotalCurrentMonth = ordersCurrentMonth.reduce(
      (total, order) => total + (order.deliveryPrice || 0),
      0
    )
    currentMonthRevenue += deliveryPriceTotalCurrentMonth

    // Retrieve orders for last month
    const ordersLastMonth = allOrders.filter(item => {
      const updatedAt = moment(item.updatedAt)
      return updatedAt.isAfter(previousMonthStart) && updatedAt.isBefore(previousMonthEnd)
    })
    // Calculate revenue for last month
    deliveryPriceTotalLastMonth = ordersLastMonth.reduce((total, order) => total + (order.deliveryPrice || 0), 0)

    // Find delivered orders for the current week
    const weeklyOrders = allOrders.filter(item => {
      const updatedAt = moment(item.updatedAt)
      return updatedAt.isAfter(currentWeekStart) && updatedAt.isBefore(currentWeekEnd)
    })

    // Calculate revenue for each day of the week and total weekly revenue
    for (let order of weeklyOrders) {
      const dayOfWeek = moment(order.updatedAt).format('dddd')
      weeklyRevenueByDay[dayOfWeek] += order.deliveryPrice || 0
      totalWeeklyRevenue += order.deliveryPrice || 0
    }

    res.status(200).json({
      monthlyStats: {
        currentRevenue: currentMonthRevenue,
        lastMonthRevenue: deliveryPriceTotalLastMonth
      },
      stats: {
        totalRevenue: totalDeliveryPriceTotal,
        totalSales: totalOrderCount,
        totalUndeliveryOrders: totalUndeliveryOrders
      },
      weeklyStats: {
        weeklyRevenue: weeklyRevenueByDay,
        totalWeeklyRevenue: totalWeeklyRevenue
      }
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ success: false, message: error.message })
  }
}
