import { mongoose, Schema } from "../untils/utilities_import";

const creditCardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    cardNumber: { type: String, required: true },
    cardHolderName: { type: String, required: true },
    amount: { type: Number, required: true, default: 50000},
    expirationDate: { type: String, required: true },
    cvv: { type: String, required: true },
  },
  { timestamps: true }
);

const CreditCard = mongoose.model("CreditCard", creditCardSchema);

export default CreditCard;
