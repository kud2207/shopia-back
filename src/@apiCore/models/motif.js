import { Schema, model, models } from "mongoose";

let motifSchema = new Schema(
  {
    title: String,
    description: String,
  },
  { timestamps: true },
);
export default models.Motif || model("Motif", motifSchema);
