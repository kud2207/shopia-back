import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import bcrypt from 'bcrypt'

export default async function resetPassword(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  if (req.method === 'POST') {
    // Connect to database
    await dbConnect()
    if (req.body.id) {
      console.log('id', req.body.id, req.body)
      User.findOne({ _id: req.body.id })
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
        .then(async user => {
          if (!user) return res.status(401).json({ message: 'User not found !' })

          const hash = await bcrypt.hash(req.body.password, 10)
          user.password = hash
          console.log('user', user)
          user
            .save()
            .then(() => {
              res.status(200).json({
                token: user.generateToken(),
                message: 'Password updated!',
                user
              })
            })
            .catch(err => {
              console.log('err', err)
              res.status(400).json({ message: 'Error', err })
            })
        })
        .catch(err => {
          console.log('err', err)
          res.status(400).json({ message: 'error', err })
        })
    } else {
      res.status(400).json({ message: 'Invalide Token' })
    }
  }
}
