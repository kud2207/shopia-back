import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import shop from './shop.js'
import order from './order.js'

let InvoiceSchema = new Schema(
    {
        shopId: {
            type: Schema.Types.ObjectId,
            ref: shop
        },
        orderId: {
            type: Schema.Types.ObjectId,
            ref: order
        },
        salerPersone: String,
        note: String,
        thanksgiving: String,
    },
    { timestamps: true }
)
export default models.Invoice || model('Invoice', InvoiceSchema)