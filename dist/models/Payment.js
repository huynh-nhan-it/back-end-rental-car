"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const paymentSchema = new utilities_import_1.Schema({
    paymentID: { type: String, required: true, unique: true },
    bookingID: { type: String, required: true },
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, default: 'pending' },
});
exports.default = utilities_import_1.mongoose.model('Payment', paymentSchema);
