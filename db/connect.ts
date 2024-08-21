import { mongoose } from "../untils/utilities_import";


async function Connect() {
    const uri = "mongodb+srv://rentalcar:rentalcar@atlascluster.oo2lk0e.mongodb.net/car-rental?appName=AtlasCluster";
    // const uri = "mongodb://127.0.0.1:27017/car-rental"

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000, // Tăng thời gian chờ kết nối
            socketTimeoutMS: 45000, // Tăng thời gian chờ socket
        });
        console.log("Connect to MongoDB successfully!");
    } catch (e) {
        console.error("MongoDB connection error:", e);
    }
}

module.exports = { Connect };
