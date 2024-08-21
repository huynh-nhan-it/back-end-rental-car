import { mongoose, Schema } from "../untils/utilities_import";

const promotionSchema = new Schema({
  code: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
});

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;

