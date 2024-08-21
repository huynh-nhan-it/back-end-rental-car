import { mongoose, Schema } from "../untils/utilities_import";

const carSchema = new Schema({
  carID: { type: mongoose.Schema.Types.ObjectId, auto: true, require: true },
  make: { type: String, required: true },
  name: { type: String, required: true },
  year: { type: Number, required: true },
  pricePerDay: { type: Number, required: true },
  features: { type: Object },
  location: { type: String, required: true },
  availability: { type: Boolean, default: true },
  primaryImage: { type: String, required: true },
  images: { type: [String] },
  description: { type: String },
  maintenanceStatus: { type: String },
  insuranceStatus: { type: String },
  ownerID: { type: mongoose.Schema.Types.ObjectId, ref: "User"},
  averageRating: { type: Number, default: 0 },
  latitude: { type: Number },
  longitude: { type: Number },
});

carSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerID',
  foreignField: 'userId',
  justOne: true
});

carSchema.set('toObject', { virtuals: true });
carSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Car', carSchema);
