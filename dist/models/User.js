"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
var userSchema = new utilities_import_1.Schema({
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: false },
    email: { type: String, required: false, unique: false },
    password: { type: String, required: true },
    phonenumber: { type: String, required: false },
    address: { type: String, required: false },
    frontLicense: { type: String, required: false },
    backLicense: { type: String, required: false },
    lincenseCar: { type: String, required: false },
    countFailed: { type: Number, default: 0 },
    status: { type: String, required: true, default: "active" },
    avatar: { type: String },
}, { timestamps: true });
var User = utilities_import_1.mongoose.model("User", userSchema);
exports.default = User;
