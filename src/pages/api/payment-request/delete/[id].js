import dbConnect from 'src/@apiCore/lib/mongodb'
import Payment from 'src/@apiCore/models/payment'
import authenticate from 'src/middleware/authenticate'

export default async function deletePayment(req, res) {
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
  try {
    await authenticate(req, res)
    await dbConnect()
    console.log('deleting ', req.query.id);
    Payment
      .findByIdAndDelete(req.query.id)
      .then(response => {
        if (response) {
          res.status(200).json({ success: true, data: response })
        } else {
          res.status(400).json({ success: false, data: '' })
        }
      })
      .catch(err => {
        res.status(500).json({ success: false, data: err.message })
      })
  } catch (error) {
    res.status(500).json({ success: false, data: error.message })
  }
}
