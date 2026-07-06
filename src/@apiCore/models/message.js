import { Schema, model, models } from "mongoose";

let messageSchema = new Schema(
  {
    message: Object,
    usage: Object,
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
    },
  },
  { timestamps: true }
);

export default models.Message || model("Message", messageSchema);
