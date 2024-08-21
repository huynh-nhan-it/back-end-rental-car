import { mongoose, Schema } from "../untils/utilities_import";

const TokenSchema: Schema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '10d' } // Token hết hạn sau 10 ngày
});


export default mongoose.model('Token', TokenSchema);

