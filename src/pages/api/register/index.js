import User from '../../../@apiCore/models/user'
import bcrypt from 'bcrypt'
import dbConnect from 'src/@apiCore/lib/mongodb'

const saltRounds = 10

const handler = async (req, res) => {
  const requestMethod = req.method
  res.setHeader('Content-Type', 'application/json')
  await dbConnect()
  switch (requestMethod) {
    case 'POST':
      const {
        email,
        c_password,
        first_name,
        last_name,
        phone,
        gender,
        role,
        referral,
        plan,
        subscription_date,
        expire_date,
        referrer
      } = req.body
      try {
        // Generate salt for hashing
        const salt = await bcrypt.genSalt(saltRounds)
        const hashedPassword = await bcrypt.hash(c_password, salt)
        let img = gender === 'male' ? '/images/avatars/1.png' : '/images/avatars/2.png'

        const newUser = new User({
          email,
          password: hashedPassword,
          name: first_name + ' ' + last_name,
          first_name: first_name,
          last_name: last_name,
          phone,
          sexe: gender,
          role: role != 'admin' ? role : 'marchand',
          image: img,
          plan: !plan ? (role == 'marchand' ? '65fd7ba195f73168d9129069' : '67b23aa20d197f34d9bec2a7') : plan,
          subscription_date,
          expire_date,
          referrer,
          isNewUser: true
        })

        if (referral) {
          newUser.referral = referral
        }

        await newUser.save()
        const user = await User.findOne({ _id: newUser._id })
          .populate('plan')
          .populate('shops')
          .populate('deliveryCompanies')
        let tokenInfo = await user.generateToken()

        res.status(200).json({
          ret: true,
          newUser: user,
          token: tokenInfo,
          message: 'User created successfully'
        })
      } catch (error) {
        console.error(error)
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({ message: 'User already exists', ret: false, type: 'error_user_exist' })
        } else if (error.code === 11000 && error.keyPattern.phone) {
          return res.status(400).json({ message: 'Phone number already exists', ret: false, type: 'error_phone_exist' })
        } else {
          res.status(500).json({ message: 'Server error', ret: false, error, type: 'server_error' })
        }
      }
      break
    case 'GET':
      break
    default:
      res.status(200).json({ message: 'users pages', ret: true })
  }
}

export default handler
