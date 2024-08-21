"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const notificationSchema = new utilities_import_1.Schema({
    notificationID: { type: String, required: true, unique: true },
    userID: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    status: { type: String, default: 'unread' },
});
exports.default = utilities_import_1.mongoose.model('Notification', notificationSchema);
