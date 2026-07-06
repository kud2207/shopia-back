import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let currencySchema = new Schema(
  {
    fr: String,
    en: String,
    code: String
  },
  { timestamps: true }
)

export default models.Currency || model('Currency', currencySchema)
