"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const utilities_import_1 = require("../untils/utilities_import");
function Connect() {
    return __awaiter(this, void 0, void 0, function* () {
        const uri = "mongodb+srv://rentalcar:rentalcar@atlascluster.oo2lk0e.mongodb.net/car-rental?appName=AtlasCluster";
        try {
            yield utilities_import_1.mongoose.connect(uri, {
                serverSelectionTimeoutMS: 5000, // Tăng thời gian chờ kết nối
                socketTimeoutMS: 45000, // Tăng thời gian chờ socket
            });
            const db = utilities_import_1.mongoose.connection.db;
            const databaseList = yield db.admin().listDatabases();
            const foundDB = databaseList.databases.find(db => db.name === 'car-rental');
            if (!foundDB) {
                yield db.createCollection("users"); // Tạo collection 'users' nếu chưa tồn tại
                console.log("Created 'users' collection in database 'car-rental'");
                console.log("Connect to MongoDB successfully!");
            }
            else {
                console.log("Connect to MongoDB successfully!");
            }
        }
        catch (e) {
            console.error("MongoDB connection error:", e);
        }
    });
}
module.exports = { Connect };
