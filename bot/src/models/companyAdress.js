import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let deliveryServiceSchema = new Schema(
  {
    address: String,
    country: {
      type: Schema.Types.ObjectId, //Admin user
      ref: 'Country'
    },
    city: {
      type: Schema.Types.ObjectId, //Admin user
      ref: 'City'
    },
    deliveryCompany: {
      type: Schema.Types.ObjectId, //Admin user
      ref: 'DeliveryCompany'
    },
    index: Number,

  },
  { timestamps: true }
)

export default models.CompanyAdress || model('CompanyAdress', deliveryServiceSchema)
