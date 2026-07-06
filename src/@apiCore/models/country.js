import { Schema, model, models } from 'mongoose'

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
