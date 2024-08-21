import { mongoose, Schema } from "../untils/utilities_import";

const paymentSchema = new Schema({
    bookingID: { type: Schema.Types.ObjectId, ref: "Booking" },
    cardId: { type: Schema.Types.ObjectId, ref: "CreditCard" },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Payment', paymentSchema);
