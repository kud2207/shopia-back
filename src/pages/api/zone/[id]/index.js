import Zone from "src/@apiCore/models/zone";
import dbConnect from "src/@apiCore/lib/mongodb";
import authenticate from 'src/middleware/authenticate'
import formidable from "formidable-serverless";

export const config = {
  api: {
    bodyParser: false,
  },
};
export default async function handler(req, res) {
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
  const {
    query: { id },
    method,
  } = req;
  if (method != "GET") await authenticate(req, res);
  await dbConnect();

  switch (method) {
    case "GET":
      try {
        const zone = await Zone.findOne({ _id: id });

        res.status(200).json({ success: true, data: zone });
      } catch (error) {
        console.log(error);
        res.status(400).json({ success: false });
      }
      break;

    case "PUT":
      try {
        const form = new formidable.IncomingForm({ multiples: true });

        form.parse(req, async (err, fields, files) => {
          

          const result = await Zone.findByIdAndUpdate(id, fields, {
            new: true,
            runValidators: true,
          });
          if (!result) {
            return res.status(400).json({ success: false });
          }
          res.status(200).json({ success: true, data: result });
        });
      } catch (error) {
        console.log(error);
        res.status(400).json({ success: false });
      }
      break;

    case "DELETE":
      try {
        const deletedUser = await Zone.deleteOne({ _id: id });
        if (!deletedUser) {
          return res.status(400).json({ success: false });
        }
        res.status(200).json({ success: true, data: {} });
      } catch (error) {
        res.status(400).json({ success: false });
      }
      break;
    default:
      res.status(400).json({ success: false });
      break;
  }
}
