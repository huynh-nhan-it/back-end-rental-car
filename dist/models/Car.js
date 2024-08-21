"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const carSchema = new utilities_import_1.Schema({
    carID: { type: String, required: true, unique: true },
    ownerID: { type: String, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    pricePerDay: { type: Number, required: true },
    features: { type: [String] },
    location: { type: String, required: true },
    availability: { type: Boolean, default: true },
});
exports.default = utilities_import_1.mongoose.model('Car', carSchema);
