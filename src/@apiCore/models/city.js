import { Schema, model, models } from "mongoose";
import Country from "@models/country"

let citySchema = new Schema(
  {
    name: String,
    country: {
        type: Schema.Types.ObjectId,
        ref: Country,
      },
  },
  { timestamps: true }
);

export default models.City || model("City", citySchema);
