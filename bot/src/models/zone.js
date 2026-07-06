import pkg from 'mongoose';
const { Schema, model, models } = pkg;
import city from "./city.js";
import country from "./country.js";

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
