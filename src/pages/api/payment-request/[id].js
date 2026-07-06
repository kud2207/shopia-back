import Payment from 'src/@apiCore/models/payment'
import dbConnect from 'src/@apiCore/lib/mongodb'
import authenticate from 'src/middleware/authenticate'
import User from 'src/@apiCore/models/user'
import { handleCreateNotif } from 'src/@apiCore/npoints'
import { sendOrderNotification } from 'src/@apiCore/helpers'

export default async function handler(req, res) {
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
  const {
    query: { id },
    method
  } = req
  await authenticate(req, res)
  await dbConnect()

  switch (method) {
    case 'GET':
      try {
        const payment = await Payment.findOne({ _id: id })
        res.status(200).json({ success: true, data: payment })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break

    case 'PUT':
      console.log('inside put ', req.body)
      try {
        const { amount, paymentMethod, status, isStatus } = req.body

        let fields = isStatus
          ? { status: status }
          : {
              amount: amount,
              paymentMethod: paymentMethod,
              status: status
            }
        Payment.findOneAndUpdate({ _id: id }, { $set: fields }, { new: true, runValidators: true })
          .then(async updatedVal => {
            if (!updatedVal) {
              console.log('error ')
              return res.status(404).json({ success: false, message: 'payment_request_not_found' })
            }
            if (fields.status == 'Paid' && updatedVal.user) {
              const user = await User.updateOne(
                { _id: updatedVal.user },
                { $inc: { totalAmount: -updatedVal.amount } },
                { new: true }
              )
              if (user) {
                handleCreateNotif({
                  title: 'Payment validation',
                  toChannel: user?._id,
                  content: `Your payment request for the amount of $${updatedVal?.amount} has been approved!`,
                  redirectionLink: '/app/payment/',
                  read: false,
                  label: 'View details'
                })

                //Notify to Email
                if (user.email)
                  sendOrderNotification(
                    user.email,
                    `Your payment request for the amount of $${updatedVal?.amount} has been approved!`,
                    '',
                    'Payment validation'
                  )
              }
            }
            return res.status(200).json({ success: true, message: 'payment_request_updated', data: updatedVal })
          })
          .catch(error => {
            console.log('error during update ', error)
            res.status(400).json({ message: 'Server error', success: false, error, type: 'server_error' })
          })
      } catch (error) {
        console.log('error during update ', error)
        res.status(400).json({ success: false })
      }
      break

    case 'DELETE':
      try {
        const deletedData = await Payment.deleteOne({ _id: id })
        if (!deletedData) {
          res.status(400).json({ success: false })
        }
        res.status(200).json({ success: true, data: {} })
      } catch (error) {
        res.status(400).json({ success: false })
      }
      break
    default:
      res.status(400).json({ success: false })
      break
  }
}
