import { mongoose, Schema } from "../untils/utilities_import";

const messageSchema = new Schema({
  roomId: { type: String, required: true },
  senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;
