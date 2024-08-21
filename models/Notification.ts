import { mongoose, Schema } from "../untils/utilities_import";

const notificationSchema = new Schema({
    notificationID: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, default: 'unread' },
});

export default mongoose.model('Notification', notificationSchema);
