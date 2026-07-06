import Earn from 'src/@apiCore/models/earn.js'
import User from 'src/@apiCore/models/user.js'
import Commission from 'src/@apiCore/models/commission.js'
import mongoose from 'mongoose'
import dbConnect from 'src/@apiCore/lib/mongodb.js'

export default async function earn(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  const { method } = req
  await dbConnect()
  switch (method) {
    case 'GET':
      try {
        let queryData = {}
        if (req.query.user) {
          queryData.user = new mongoose.Types.ObjectId(req.query.user)
          let val = await Earn.findOne(queryData)
          let code = req.query.code // ton code de parrainage
          const sixMonthsAgo = new Date()
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

          if (!code) {
            const user = await User.findOne({ _id: req.query.user })
            code = user?.referrerCode
          }
          const commissions = await Commission.aggregate([
            {
              $match: queryData // Autres conditions comme la date ou le livreur
            },
            {
              $group: {
                _id: null,
                total: {
                  $sum: '$amount'
                }
              }
            }
          ])

          const referrers = code
            ? await User.aggregate([
                {
                  $match: {
                    referrer: code
                  }
                },
                {
                  $group: {
                    _id: null,
                    total: { $sum: 1 },
                    createdLast6Months: {
                      $sum: {
                        $cond: [{ $gte: ['$createdAt', sixMonthsAgo] }, 1, 0]
                      }
                    }
                  }
                }
              ])
            : null
          if (!val) {
            queryData.amount = 0
            val = await Earn.create(queryData)
          }

          res.status(200).json({
            success: true,
            availableBalance: val?.amount || 0,
            totalEarned: commissions?.length > 0 ? commissions[0]?.total : 0,
            totalSponsored: referrers?.length > 0 ? referrers[0]?.total : 0,
            activeSponsored: referrers?.length > 0 ? referrers[0]?.createdLast6Months : 0,
            sponsorshipCode: code || '',
            hasCode: code ? true : false
          })
        } else res.status(400).json({ success: false })
      } catch (error) {
        console.log(error)
        res.status(400).json({ success: false })
      }
      break
    case 'POST':
      try {
        res.status(201).json({ success: true })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
