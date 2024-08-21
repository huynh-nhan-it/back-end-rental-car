import { mongoose, Schema } from "../untils/utilities_import";

const userSchema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, auto: true, require: true },
    name: { type: String, required: false },
    email: { type: String, required: false, unique: false },
    password: { type: String, required: true },
    phonenumber: { type: String, required: false },
    address: { type: [String], required: false },
    frontLicense: { type: String, required: false },
    backLicense: { type: String, required: false },
    frontLincenseCar: { type: String, required: false },
    backLincenseCar: { type: String, required: false },
    birthdate: { type: Date, required: false },
    countFailed: { type: Number, default: 0 },
    isOwner: { type: Boolean, default: false },
    status: { type: String, required: true, default: "pending" },
    avatar: { type: String },
    twoFactorSecret: { type: String },
    cars: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Car', localField: 'cars', foreignField: 'carID' }],
    creditCards: [{ type: Schema.Types.ObjectId, ref: 'CreditCard' }],
    promotions: [{ type: Schema.Types.ObjectId, ref: 'Promotion' }],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
