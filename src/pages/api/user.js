import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'

export default async function orders(req, res) {
  const { method } = req

  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const userId = req.query.userId
        const values = userId ? await User.findById(userId) : await User.find({})
        res.status(200).json({
          success: true,
          data: values
        })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
