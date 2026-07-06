import dbConnect from 'src/@apiCore/lib/mongodb'
import Payment from 'src/@apiCore/models/payment'
import authenticate from 'src/middleware/authenticate'

export default async function getPaymentRequest(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization"
  );
    //Preflight CORS handler
    if (req.method === "OPTIONS") {
      return res.status(200).json({
        body: "OK",
      });
    }
  try {
    await authenticate(req, res)
    await dbConnect()
    try {
      const { userId, search, page, limit, sortBy, sortOrder, isAdmin } = req.query

      // Search
      const searchQuery = search ? { description: { $regex: search, $options: 'i' } } : {}

      // Pagination
      const pageNumber = parseInt(page) || 1
      const pageSize = parseInt(limit) || 10
      const skip = (pageNumber - 1) * pageSize

      // Sorting
      const sortOptions = {updatedAt:-1}
      if (sortBy) {
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1
      }

      let values = null;
      let totalItems = 0;
      if(!isAdmin){
        values = await Payment.find({ user: userId, ...searchQuery })
        .populate({
          path: 'user'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)

        totalItems = await Payment.countDocuments({ user: userId, ...searchQuery })

      }else if(isAdmin && isAdmin == 1){
        values = await Payment.find({ ...searchQuery })
        .populate({
          path: 'user'
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(pageSize)

        totalItems = await Payment.countDocuments({ ...searchQuery })
      }

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
