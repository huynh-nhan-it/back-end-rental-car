import { mongoose, Schema } from "../untils/utilities_import";

const bookingSchema = new Schema({
    bookingID: { type: mongoose.Schema.Types.ObjectId, auto: true },
    userID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    carID: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Car' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, default: 'pending' },
    totalCost: { type: Number, required: true },
});

export default mongoose.model('Booking', bookingSchema);
