import pkg from 'mongoose';
const { Schema, model, models } = pkg;

let saleProducTypeSchema = new Schema(
  {
    fr: String,
    en: String,
  },
  { timestamps: true }
);

export default models.SaleProducType || model("SaleProducType", saleProducTypeSchema);
