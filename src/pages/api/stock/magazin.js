import Stock from "src/@apiCore/models/stock";
import Product from "src/@apiCore/models/product";
import dbConnect from "src/@apiCore/lib/mongodb";
import formidable from "formidable-serverless";
import authenticate from 'src/middleware/authenticate'
import mongoose from "mongoose";

export const config = {
  api: {
    bodyParser: false,
  },
};
export default async function register(req, res) {
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, authorization",
  );
  //Preflight CORS handler
  if (req.method === "OPTIONS") {
    return res.status(200).json({
      body: "OK",
    });
  }
  const { method } = req;
  await authenticate(req, res);
  await dbConnect();
  switch (method) {
    case "GET":
      try {
        let queryData = {};
        let data = [];
        if (req.query.day && req.query.userId && req.query.id) {
          queryData = {
            jour: new Date(req.query.day),
            livreur: new mongoose.Types.ObjectId(req.query.userId),
            product: new mongoose.Types.ObjectId(req.query.id),
          };
          const product = await Product.findOne({ _id: req.query.id });

          const stock = await Stock.findOne(queryData);
          const val = product.quantity - product.total;
          if (stock) {
            await Stock.updateOne(
              { _id: stock._id },
              { stockDisponible: val >= 0 ? val : 0 },
              {
                new: true,
                runValidators: true,
              },
            );
          } else {
            queryData.stockDisponible = val >= 0 ? val : 0;
            queryData.stockEnAjout = 0;
            queryData.produitEchanger = 0;
            queryData.ajoutJourSuivant = 0;
            queryData.stockVendu = 0;
            await Stock.create(queryData);
          }
        }
        res.status(200).json({
          success: true,
        });
      } catch (error) {
        console.log(error);
        res.status(400).json({ success: false });
      }
      break;
    case "POST":
      try {
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
          if (err) res.status(400).json({ success: false });
          const stock = await Stock.create(fields);
          if (stock) res.status(201).json({ success: true, data: stock });
          else res.status(400).json({ success: false });
        });
      } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
          return res.status(400).json({
            message: "Un utilisateur ayant ce numéro de téléphone existe déjà",
            ret: false,
            type: "error_user_exist",
          });
        } else if (error.code === 11000 && error.keyPattern.phone) {
          return res.status(400).json({
            message: "Un utilisateur ayant cet adresse mail existe déjà",
            ret: false,
            type: "error_phone_exist",
          });
        } else {
          res.status(500).json({
            message: "Server error",
            ret: false,
            error,
            type: "server_error",
          });
        }
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}
