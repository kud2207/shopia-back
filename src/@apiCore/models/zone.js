import { Schema, model, models } from "mongoose";
import city from "./city";
import country from "./country";

let stockSchema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    city: {
      type: Schema.Types.ObjectId,
      ref: city
    },
    country: {
      type: Schema.Types.ObjectId,
      ref: country
    },
    longitude: Number,
    latitude: Number
  },
  { timestamps: true },
);
stockSchema.index({ description: "text" });

export default models.Zone || model("Zone", stockSchema);
