import dbConnect from "src/@apiCore/lib/mongodb"
import deliveryService from "src/@apiCore/models/deliveryService"

export default async function getDelivraries(req, res) {
  try {
    await dbConnect()
    const { page, limit, sortBy, sortOrder } = req.query

    // Pagination
    const pageNumber = parseInt(page) || 1
    const pageSize = parseInt(limit) || 10
    const skip = (pageNumber - 1) * pageSize

    // Sorting
    const sortOptions = {}
    if (sortBy) {
      sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
    }
    const response = await deliveryService.find({ user: req.query.userId })
      .sort(sortOptions)
      .skip(skip)
      .limit(pageSize)

    const totalItems = await deliveryService.countDocuments({ user: req.query.userId })

    if (response) res.status(200).json({
      success: true, data: response, pagination: {
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
        currentPage: pageNumber
      }
    })
    res.status(200).json({ success: true, data: [] })
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, data: error.message })
  }
}