import dbConnect from 'src/@apiCore/lib/mongodb'
import User from 'src/@apiCore/models/user'
import bcrypt from 'bcrypt'
import { checkIfUserHasShop } from 'src/@apiCore/helpers'

export default async function login(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  // Connect to database
  await dbConnect()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phone = req.body.phone?.replace(/\s+/g, '') || ''
  const email = req.body.email?.replace(/\s+/g, '') || ''
  let key = email && emailRegex.test(email) ? { email: email } : { phone: "+"+(phone || email)?.replace(/[^\d]/g, '') }
  console.log(key)
  User.findOne(key)
    .populate('plan')
    .populate('shops')
    .populate({
      path: 'deliveryCompanies',
      populate: [
        { path: 'adress' }, // Correction de 'adress' en 'address'
        { path: 'shops' },
        {
          path: 'pricings',
          populate: { path: 'zone' }
        }
      ]
    })
    .select('+password')
    .then(async user => {
      if (!user) return res.status(401).json({ message: 'incorrect_username' })
      let truth = await bcrypt.compare(req.body.password, user.password)
      if (truth) {
        let resetToken = await user.generateToken()
        if (user.role == 'marchand' && user.shops?.length == 0) {
          const userShops = await checkIfUserHasShop(user._id)
          user.shops = userShops
        }
        res.status(200).json({
          token: resetToken,
          message: 'connected',
          user: { ...user._doc, hasShop: user?.shops?.length > 0 }
        })
      } else {
        res.status(400).json({ message: 'incorrect_password' })
      }
    })
    .catch(err => {
      console.log('erreur ici', err)
      res.status(400).json({ message: 'error: ' + err.message, err })
    })
}
