"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const verificationSchema = new utilities_import_1.Schema({
    verificationID: { type: String, required: true, unique: true },
    userID: { type: String, required: true },
    documentType: { type: String, required: true },
    documentImage: { type: String, required: true },
    status: { type: String, default: 'pending' },
});
exports.default = utilities_import_1.mongoose.model('Verification', verificationSchema);
