import { Schema, model, models } from "mongoose";

let zoneSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    zone: {
      type: Schema.Types.ObjectId,
      ref: 'Zone'
    },
    deliveryPrice: Number
  },
  { timestamps: true },
);

export default models.ServiceZone || model("ServiceZone", zoneSchema);
