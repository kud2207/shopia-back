import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import bcrypt from 'bcrypt'

export default async function updatePassword(req, res) {
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, authorization')
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  if (req.method === 'PUT') {
    //Authenticate user
    await authenticate(req, res)

    // Get data from your database
    await dbConnect()
    let fields = req.body
    User.findOne({ _id: req.userId })
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
      .then(user => {
        if (!user) return res.status(401).json({ message: 'user_not_found' })

        //ceheck if current password is valid
        bcrypt
          .compare(fields.currentPassword, user.password)
          .then(async valid => {
            if (!valid) {
              return res.status(401).json({ message: 'invalid_current_password' })
            }

            const hash = await bcrypt.hash(fields.newPassword, 10)
            user.password = hash
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
                res.status(400).json({ message: 'error', err })
              })
          })
          .catch(err => {
            res.status(400).json({ message: 'error', err })
          })
      })
  }
}
