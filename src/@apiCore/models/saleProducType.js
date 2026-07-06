import { Schema, model, models } from "mongoose";

let saleProducTypeSchema = new Schema(
  {
    fr: String,
    en: String,
  },
  { timestamps: true }
);

export default models.SaleProducType || model("SaleProducType", saleProducTypeSchema);
