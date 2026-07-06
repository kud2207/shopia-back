import { Schema, model, models } from 'mongoose'

let newsletterSchema = new Schema(
  {
    email: {
      type: String,
      unique: true
    }
  },
  { timestamps: true }
)

export default models.Newsletter || model('Newsletter', newsletterSchema)
