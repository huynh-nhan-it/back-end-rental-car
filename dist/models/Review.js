"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const reviewSchema = new utilities_import_1.Schema({
    reviewID: { type: String, required: true, unique: true },
    userID: { type: String, required: true },
    carID: { type: String, required: true },
    rating: { type: Number, required: true },
    comments: { type: String },
});
exports.default = utilities_import_1.mongoose.model('Review', reviewSchema);
