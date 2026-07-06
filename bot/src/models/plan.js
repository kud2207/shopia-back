import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let planSchema = new Schema(
  {
    title: String,
    color: String,
    price: Number,
    duration: Number,
    day: Number,
    content: Object,
    unit: String,
    prices: Object,
    access: Object,
    type: String,
    shops: Number,
    credit: Number
  },
  { timestamps: true }
)

export default models.Plan || model('Plan', planSchema)
