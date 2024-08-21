import { mongoose, Schema } from "../untils/utilities_import";

const reviewSchema = new Schema({
    reviewID: { type: Schema.Types.ObjectId, required: true, unique: true, auto: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    carID: { type: Schema.Types.ObjectId, ref: "Car", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    date: { type: Date, default: Date.now }
});



export default mongoose.model('Review', reviewSchema);
