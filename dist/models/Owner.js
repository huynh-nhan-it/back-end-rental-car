"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
const ownerSchema = new utilities_import_1.Schema({
    cars: [{ type: utilities_import_1.Schema.Types.ObjectId, ref: 'Car' }],
});
// Inherits User attributes
const Owner = utilities_import_1.mongoose.model('Owner', ownerSchema);
exports.default = Owner;
