import User from 'src/@apiCore/models/user'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import formidable from 'formidable-serverless'
import { uploadFileWithFormidable } from 'src/@apiCore/helpers'

export const config = {
  api: {
    bodyParser: false
  }
}

export default async function updateAccount(req, res) {
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

    const form = new formidable.IncomingForm({ multiples: false })

    form.parse(req, async (err, fields, files) => {
      if (files && files.file && files.file.name) {
        const url = await uploadFileWithFormidable('public/images/profile', files.file)
        fields.image = url
      }
      if (files && files.logo_file && files.logo_file.name) {
        const urlimage = await uploadFileWithFormidable('public/images/logos', files.logo_file)
        fields.logo = urlimage
      }
      if (fields.totalAmount) delete data.totalAmount
      if (fields.role) delete data.role
      if (fields.iaAmount) delete data.iaAmount
      User.findOneAndUpdate({ _id: req.userId }, { $set: fields }, { new: true, runValidators: true })
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
        .select('+password') // Assuming you still want to include the password in the response
        .then(updatedUser => {
          if (!updatedUser) {
            return res.status(404).json({ ret: false, message: 'user_not_found' })
          }
          res.status(200).json({ ret: true, message: 'user_updated', user: updatedUser })
        })
        .catch(error => {
          if (error.code === 11000 && error.keyPattern.email) {
            return res.status(400).json({ message: 'User already exists', ret: false, type: 'error_user_exist' })
          } else if (error.code === 11000 && error.keyPattern.phone) {
            return res
              .status(400)
              .json({ message: 'Phone number already exists', ret: false, type: 'error_phone_exist' })
          } else {
            res.status(500).json({ message: 'Server error', ret: false, error, type: 'server_error' })
          }
        })
    })
  }
}
