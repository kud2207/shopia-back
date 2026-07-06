import { Schema, model, models } from 'mongoose'

let categorySchema = new Schema(
  {
    fr: String,
    en: String,
    icon: String
  },
  { timestamps: true }
)

export default models.Category || model('Category', categorySchema)
