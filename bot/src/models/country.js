import pkg from 'mongoose';
const { Schema, model, models } = pkg;

let countrySchema = new Schema(
  {
    fr: String,
    en: String,
    code: String,
    currency: String,
    currencyCode: String
  },
  { timestamps: true }
)

export default models.Country || model('Country', countrySchema)
