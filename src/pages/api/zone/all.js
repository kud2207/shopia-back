import Zone from "src/@apiCore/models/zone";
import dbConnect from "src/@apiCore/lib/mongodb";
import formidable from "formidable-serverless";
import { uploadFileWithFormidable } from "src/@apiCore/helpers";
import bcrypt from "bcrypt";
import authenticate from 'src/middleware/authenticate'

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
        const zones = await Zone.find();
        res.status(200).json({
          success: true,
          data: zones,
        });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;
    case "POST":
      try {
        const form = new formidable.IncomingForm();

        form.parse(req, async (err, fields, files) => {
          if (err) res.status(400).json({ success: false });
          if (files && files.image && files.image.name) {
            const url = await uploadFileWithFormidable(
              files.image,
              "public/assets/images/",
            );
            if (url) fields.image = url;
          }
          if (fields.pass) fields.password = await bcrypt.hash(fields.pass, 10);
          const zone = await Zone.create(fields).catch(() =>
            res.status(400).json({ success: false }),
          );
          if (zone) res.status(201).json({ success: true, data: zone });
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
