import dbConnect from 'src/@apiCore/lib/mongodb'
import Order from 'src/@apiCore/models/order'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'

export default async function statistic(req, res) {
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
  await authenticate(req, res)
  await dbConnect()
  try {
    const { shopId } = req.query
    const orders = await Order.aggregate([
      {
        $match: {
          shop: new mongoose.Types.ObjectId(shopId)
        }
      },
      {
        $group: {
          _id: '$status', // Grouper par statut
          count: { $sum: 1 } // Compter le nombre de documents dans chaque groupe
        }
      }
    ])
    res.status(200).json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ success: false, message: error.message })
  }
}

