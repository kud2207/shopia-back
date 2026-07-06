import { Schema, model, models } from 'mongoose'
import order from './order'

let orderActivitySchema = new Schema(
    {
        orderId: {
            type: Schema.Types.ObjectId,
            ref: order
        },
        activityLabel: String,
        activityContent: String
    },
    { timestamps: true }
)

export default models.OrderActivity || model('OrderActivity', orderActivitySchema)