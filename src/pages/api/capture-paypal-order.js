import User from 'src/@apiCore/models/user'
import { capturePayment } from '/src/@apiCore/helpers/paypal'
import Setting from 'src/@apiCore/models/setting'
import moment from 'moment'

export default async function login(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }
  // Get data from your database
  if (req.method == 'POST') {
    const data = req.body
    const userData = {}
    const captureData = await capturePayment(data.orderID)
    if (captureData.status == 'COMPLETED') {
      if (data.type == 'credit') {
        userData['$inc'] = { aiAmount: data.price }
      } else {
        userData.plan = data.item_id
        userData.subscription_date = moment()
        if (data.credit) userData['$inc'] = { aiAmount: data.credit }
      }
      const user = await User.findByIdAndUpdate(data?.userId, userData, { new: true })
      if (user.referral && data.type != 'credit') {
        // Retrieve the commission rate from settings

        const settings = await Setting.findOne()
        const referringUser = await User.findById(user.referral)
        const differenceInYears = moment().diff(moment(user.createdAt), 'months')
        const commision = referringUser.settings || settings.content
        if (referringUser && differenceInYears <= commision.commission_duration) {
          const commissionRate = commision?.commission || 0
          let commissionAmount = 0

          if (commision.commission_type === 'percent') {
            commissionAmount = (commissionRate / 100) * plan.price
          } else {
            commissionAmount = commissionRate
          }

          // Create a new affiliate record
          const affiliate = new affiliate({
            user: id,
            commissionRate: commissionAmount
          })

          await affiliate.save()

          referringUser.affiliates.push(affiliate._id)
          referringUser.totalAmount = (referringUser.totalAmount || 0) + commissionAmount
          await referringUser.save()
        }
      }
    }
    res.json(captureData)
  } else {
    res.status(404).json({
      message: 'not found'
    })
  }
}
