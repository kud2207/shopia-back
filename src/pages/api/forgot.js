import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import { sendResetPasswordMail, sendSMS } from 'src/@apiCore/helpers'

export default async function forgot(req, res) {
  //Preflight CORS handler
  if (req.method === 'OPTIONS') {
    return res.status(200).json({
      body: 'OK'
    })
  }

  if (req.method === 'POST') {
    // Get data from your database
    await dbConnect()
    User.findOne({ $or: [{ email: req.body.email }, { phone: req.body.email }] })
      .populate('plan')
      .then(async user => {
        if (!user)
          return res.status(400).json({
            message: 'User not found !'
          })
        let code = Math.floor(1000 + Math.random() * 9000)
        await user.setToken(code)
        // let resetToken = await user.generateResetToken()
        if (user.email) await sendResetPasswordMail(user.email, req.body.language, code)
        if (user.phone && !req.body.email?.includes('@')) sendSMS(user.phone, 'Votre code de validation est: '+code)
        return res.status(200).json({
          message: 'Nous vous avons envoyer un lien ',
          user
        })
      })
      .catch(err => {
        console.log(err)
        res.status(400).json({ message: 'errorr', err })
      })
  }
}
