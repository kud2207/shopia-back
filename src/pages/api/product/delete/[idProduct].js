import dbConnect from 'src/@apiCore/lib/mongodb'
import product from 'src/@apiCore/models/product'
import authenticate from 'src/middleware/authenticate'

export default async function deleteProduct(req, res) {
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
    product
      .findByIdAndDelete(req.query.idProduct)
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
