import pkg from 'mongoose';
const { Schema, model, models } = pkg;
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
