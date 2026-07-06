import { Schema, model, models } from 'mongoose'
import shop from './shop'
import order from './order'

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