import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import moment from 'moment'
import 'moment/locale/en-gb'
import Product from 'src/@apiCore/models/product'
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
    const { activeShop } = req.query

    const startDate = getCurrentMonthStartDate()
    const endDate = getCurrentMonthEndDate()
    const previousMonthStart = moment().subtract(1, 'month').startOf('month').toDate()
    const previousMonthEnd = moment().subtract(1, 'month').endOf('month').toDate()

    const currentWeekStart = moment().startOf('week').toDate() // Sunday
    const currentWeekEnd = moment().endOf('week').toDate() // Monday

    // Initialize an object to store revenue for each day and total revenue for the week
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

    // Find all delivered orders without considering the date
    const allTimeOrders = await Order.find({
      shop: activeShop,
      status: 'delivered'
    }).populate({
      path: 'items',
      select: 'product quantity price',
      populate: {
        path: 'product',
        model: 'Product',
        populate: {
          path: 'category',
          model: 'Category'
        }
      }
    })

    // Find delivered orders for the current week
    const weeklyOrders = allTimeOrders.filter(item => {
      const updatedAt = moment(item.updatedAt)
      return updatedAt.isAfter(currentWeekStart) && updatedAt.isBefore(currentWeekEnd)
    })

    // Calculate revenue for each day of the week and total weekly revenue
    weeklyOrders.forEach(order => {
      const dayOfWeek = moment(order.updatedAt).format('dddd')
      weeklyRevenueByDay[dayOfWeek] += order.total
      totalWeeklyRevenue += order.total
    })

    // Find delivered orders for the current month
    const currentMonthOrders = allTimeOrders.filter(item => {
      const updatedAt = moment(item.updatedAt)
      return updatedAt.isAfter(startDate) && updatedAt.isBefore(endDate)
    })

    // Find delivered orders for the past month
    const pastMonthOrders = allTimeOrders.filter(item => {
      const updatedAt = moment(item.updatedAt)
      return updatedAt.isAfter(previousMonthStart) && updatedAt.isBefore(previousMonthEnd)
    })

    //find all products
    const allProducts = await Product.countDocuments({
      shop: activeShop
    })

    let currentMonthRevenue = 0
    currentMonthOrders.forEach(order => {
      currentMonthRevenue += order.total
    })

    let totalRevenue = 0
    allTimeOrders.forEach(order => {
      totalRevenue += order.total
    })

    const allTimeCustomers = new Set()
    allTimeOrders.forEach(order => {
      allTimeCustomers.add(order.customer?.toString())
    })
    const totalCustomers = allTimeCustomers.size

    const { totalMonthlyRevenue, topProducts, totalPreviousMonthRevenue } = await getMonthlyEarningsAndTopProducts(
      currentMonthOrders,
      pastMonthOrders
    )
    res.status(200).json({
      success: true,
      stats: {
        totalRevenue: totalRevenue,
        totalSales: allTimeOrders.length,
        totalProducts: allProducts,
        totalCustomers: totalCustomers
      },
      totalEarnings: {
        totalMonthlyRevenue: totalMonthlyRevenue,
        topProducts: topProducts,
        totalPreviousMonthRevenue: totalPreviousMonthRevenue
      },
      weeklyStats: {
        weeklyRevenue: weeklyRevenueByDay,
        totalWeeklyRevenue: totalWeeklyRevenue
      },
      monthlyStats: {
        currentRevenue: currentMonthRevenue,
        lastMonthRevenue: totalPreviousMonthRevenue
      }
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

const getMonthlyEarningsAndTopProducts = async (monthlyOrders, previousMonthlyOrders) => {
  try {
    let totalPreviousMonthRevenue = 0
    previousMonthlyOrders.forEach(order => {
      totalPreviousMonthRevenue += order.total
    })

    let totalMonthlyRevenue = 0
    monthlyOrders.forEach(order => {
      totalMonthlyRevenue += order.total
    })

    const productSalesArray = []

    // Iterate over monthly orders and calculate sales for each product
    monthlyOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.product?._id
        const quantity = item.quantity
        const itemRevenue = item.product?.price * quantity
        const productInfo = {
          _id: item.product?._id,
          name: item.product?.name,
          image: item.product?.images,
          category: item.product?.category
        }
        const existingProductIndex = productSalesArray.findIndex(
          product => product.product?._id?.toString() === productId?.toString()
        )
        if (existingProductIndex !== -1) {
          productSalesArray[existingProductIndex].revenue += itemRevenue
        } else {
          productSalesArray.push({
            product: productInfo,
            revenue: itemRevenue
          })
        }
      })
    })
    const sortedProducts = productSalesArray.sort((a, b) => b.revenue - a.revenue)
    const topProducts = sortedProducts.slice(0, 3)

    return {
      totalMonthlyRevenue: totalMonthlyRevenue,
      topProducts: topProducts,
      totalPreviousMonthRevenue: totalPreviousMonthRevenue
    }
  } catch (error) {
    console.error('Error fetching orders:', error)
    throw error
  }
}
