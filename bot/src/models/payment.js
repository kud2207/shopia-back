import pkg from 'mongoose';
const { Schema, model, models } = pkg;
let PaymentSchema = new Schema(
  {
    amount: Number,
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    paymentMethod: String, // "momo or bankTransfert"
    status: {
        type: String,
        default: "Processing" //validate, cancel
    },
    phone: String,
  },
  { timestamps: true }
)
export default models.Payment || model('Payment', PaymentSchema)
