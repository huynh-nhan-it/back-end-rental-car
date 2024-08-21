"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const bookingSchema = new utilities_import_1.Schema({
    bookingID: { type: String, required: true, unique: true },
    userID: { type: String, required: true },
    carID: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, default: 'pending' },
    totalCost: { type: Number, required: true },
});
exports.default = utilities_import_1.mongoose.model('Booking', bookingSchema);
