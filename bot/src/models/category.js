import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let categorySchema = new Schema(
  {
    fr: String,
    en: String,
    icon: String
  },
  { timestamps: true }
)

export default models.Category || model('Category', categorySchema)
