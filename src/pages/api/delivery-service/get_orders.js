import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import DeliveryService from 'src/@apiCore/models/deliveryService'

export default async function getShopOrder(req, res) {
  try {
    await dbConnect()
    try {
      const { search, page, limit, sortBy, sortOrder, services, shops } = req.query

      // Search
      const searchQuery = search ? { description: { $regex: search, $options: 'i' } } : {}

      // Pagination
      const pageNumber = parseInt(page) || 1
      const pageSize = parseInt(limit) || 10
      const skip = (pageNumber - 1) * pageSize

      // Sorting
      const sortOptions = {}
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
      }

      // First, find delivery services created by the user
      const deliveryServices = await DeliveryService.find({ user: req.query.userId })
      let deliveryServiceIds

      if (services) {
        deliveryServiceIds = services.split(',')
      } else {
        // Extract the IDs of the delivery services
        deliveryServiceIds = deliveryServices.map(service => service._id.toString())
      }

      if (shops) {
        searchQuery.shop = { $in: shops.split(',') }
      }

      // Then, find orders linked to those delivery services
      const values = await Order.find({ ...searchQuery, deliveryService: { $in: deliveryServiceIds } })
        .populate({
          path: 'customer'
        })
        .populate({
          path: 'shop',
          populate: 'user'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)

      const totalItems = await Order.countDocuments({
        ...searchQuery,
        deliveryService: { $in: deliveryServiceIds }
      })

      res.status(200).json({
        success: true,
        data: values,
        pagination: {
          totalItems,
          totalPages: Math.ceil(totalItems / pageSize),
          currentPage: pageNumber
        }
      })
    } catch (error) {
      console.log(error)
      res.status(400).json({ success: false, message: error.message })
    }
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
