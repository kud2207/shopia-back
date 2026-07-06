import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'

export default async function statistic(req, res) {
  await dbConnect()
  try {
    const { userId } = req.query

    const currentDate = new Date()
    const currentMonth = currentDate.getMonth() + 1
    const currentYear = currentDate.getFullYear()
    // await Commissions.find();
    const userResponse = await User.findById(userId).populate({
        path: 'commission',
        model: 'Commission',
      })
    const commissions = userResponse.commission

    const totalCommissionRate = commissions.reduce((total, commission) => total + commission.commissionRate, 0)

    // Filter commissions for the current month
    const commissionsInCurrentMonth = commissions.filter(commission => {
      const commissionMonth = commission.joinDate.getMonth() + 1
      const commissionYear = commission.joinDate.getFullYear()
      return commissionMonth === currentMonth && commissionYear === currentYear
    })

    // Calculate total commission in the current month
    const totalCommissionInCurrentMonth = commissionsInCurrentMonth.reduce(
      (total, commission) => total + commission.commissionRate,
      0
    )

    const monthlyRevenue = await calculateMonthlyCommission(commissions)

    const myReferes = await User.find({ referral: userId })

    res.status(200).json({
      monthlyStats: {
        currentRevenue: totalCommissionInCurrentMonth
        // lastMonthRevenue: deliveryPriceTotalLastMonth
      },
      stats: {
        totalRevenue: totalCommissionRate,
        totalSales: myReferes.length //here it contains the total number of referral
      },
      weeklyStats: {
        weeklyRevenue: monthlyRevenue.monthlyCommission,
        totalWeeklyRevenue: monthlyRevenue.revenueTotal
      }
    })
  } catch (error) {
    res.status(400).json({ success: false, message: error.message })
  }
}

async function calculateMonthlyCommission(commissions) {
  // Initialize monthlyCommission object
  const monthlyCommission = {
    January: 0,
    February: 0,
    March: 0,
    April: 0,
    May: 0,
    June: 0,
    July: 0,
    August: 0,
    September: 0,
    October: 0,
    November: 0,
    December: 0
  }

  const currentYear = new Date().getFullYear()
  let revenueTotal = 0

  // biome-ignore lint/complexity/noForEach: <explanation>
  commissions.forEach(commission => {
    const commissionMonth = commission.joinDate.getMonth() // Month is zero-indexed
    const commissionYear = commission.joinDate.getFullYear()

    if (commissionYear === currentYear) {
      revenueTotal += commission.commissionRate
      switch (commissionMonth) {
        case 0:
          monthlyCommission.January += commission.commissionRate
          break
        case 1:
          monthlyCommission.February += commission.commissionRate
          break
        case 2:
          monthlyCommission.March += commission.commissionRate
          break
        case 3:
          monthlyCommission.April += commission.commissionRate
          break
        case 4:
          monthlyCommission.May += commission.commissionRate
          break
        case 5:
          monthlyCommission.June += commission.commissionRate
          break
        case 6:
          monthlyCommission.July += commission.commissionRate
          break
        case 7:
          monthlyCommission.August += commission.commissionRate
          break
        case 8:
          monthlyCommission.September += commission.commissionRate
          break
        case 9:
          monthlyCommission.October += commission.commissionRate
          break
        case 10:
          monthlyCommission.November += commission.commissionRate
          break
        case 11:
          monthlyCommission.December += commission.commissionRate
          break
        default:
          break
      }
    }
  })

  return { monthlyCommission: monthlyCommission, revenueTotal: revenueTotal }
}
