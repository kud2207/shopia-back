import jwt from "jsonwebtoken";

const checkToken = (req, res) => {
  try {
    const token = req.query.token
    const decodedToken = jwt.verify(token, process.env.JWT_TOKEN);
    if (Math.floor(Date.now() / 1000) > decodedToken?.exp) {
      res.status(401).json({ success: false, message: "Access denied" });
    } else {
      return res.status(200).json({ success: true, message: "token is verified" });;
    }
  } catch {
    res.status(401).json({ success: false, message: "Access denied" });
  }
};
export default checkToken;
