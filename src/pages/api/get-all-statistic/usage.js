import dbConnect from 'src/@apiCore/lib/mongodb'
import Usage from 'src/@apiCore/models/usage'
import authenticate from 'src/middleware/authenticate'
import mongoose from 'mongoose'
import moment from 'moment'
import "moment/locale/en-gb"

moment.locale('en-gb')

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
    const { userId, date } = req.query
    // Date de début du mois actuel
    const startOfMonth = moment(date).startOf('month')

    // Date de fin du mois actuel
    const endOfMonth = moment(date).endOf('month')

    // Requête d'agrégation pour regrouper les montants par jour
    const aggregationQuery = [
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startOfMonth.toDate(), $lte: endOfMonth.toDate() } // Filtrer par les dates du mois actuel
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, // Groupement par jour
          totalAmount: { $sum: '$amount' } // Somme des montants pour chaque jour
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalAmount: 1
        }
      },
      {
        $sort: {
          date: 1 // Tri par date croissante
        }
      }
    ]

    // Exécution de la requête d'agrégation
    const orders = await Usage.aggregate(aggregationQuery).catch(error => {
      console.error("Une erreur s'est produite lors de l'agrégation :", error)
    })

    console.log(orders)

    res.status(200).json({
      success: true,
      data: orders
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ success: false, message: error.message })
  }
}
