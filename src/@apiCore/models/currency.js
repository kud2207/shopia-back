import { Schema, model, models } from 'mongoose'

let currencySchema = new Schema(
  {
    fr: String,
    en: String,
    code: String
  },
  { timestamps: true }
)

export default models.Currency || model('Currency', currencySchema)
