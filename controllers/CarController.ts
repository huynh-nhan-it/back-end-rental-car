import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import { storage, ref, uploadBytes, getDownloadURL } from "../config/firebase";
import { deleteObject } from "firebase/storage";
import helpers from "../untils/helpers";
import Car from "../models/Car";
import Booking from "../models/Booking";
import Review from "../models/Review";

class CarController {
  getCars: (req: Request, res: Response, next: NextFunction) => void;

  getCarById: (req: Request, res: Response, next: NextFunction) => void;

  addCar: (req: Request, res: Response, next: NextFunction) => void;

  updateCar: (req: Request, res: Response, next: NextFunction) => void;

  deleteCar: (req: Request, res: Response, next: NextFunction) => void;

  getBookingsByOwner: (req: Request, res: Response, next: NextFunction) => void;

  getFavorites: (req: Request, res: Response, next: NextFunction) => void;

  addFavorite: (req: Request, res: Response, next: NextFunction) => void;

  removeFavorite: (req: Request, res: Response, next: NextFunction) => void;

  constructor() {
    this.getCars = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const filters = CarController.filterCars(req.body);
        const page = parseInt(req.body.page as string, 10) || 1;
        const limit = parseInt(req.body.limit as string, 10) || 30;
        const skip = (page - 1) * limit;

        const [cars, total, carRatings] = await Promise.all([
          Car.find(filters).skip(skip).limit(limit).populate("owner"),
          Car.countDocuments(filters),
          Review.aggregate([
            { $group: { _id: "$carID", averageRating: { $avg: "$rating" } } },
          ]),
        ]);

        const ratingsMap = new Map(
          carRatings.map((rating) => [
            rating._id.toString(),
            rating.averageRating,
          ])
        );

        cars.forEach((car) => {
          car.averageRating = ratingsMap.get(car.carID?.toString()) || 0;
        });

        if (!req.body.userId) {
          const carIDs = cars.map((car) => car.carID);
          const bookings = await Booking.find({
            carID: { $in: carIDs },
            $or: [
              { status: "pending" },
              { status: "renting" }
            ],
          });
          const results = cars.filter((car: any) => {
            return !bookings.some(
              (booking) => booking.carID.toString() === car.carID.toString()
            );
          });
          results.forEach((result) => {
            result.averageRating =
              ratingsMap.get(result.carID?.toString()) || 0;
          });
          return res.status(200).json({
            cars: results,
            total: results.length || 0,
            page,
            pages: Math.ceil(results.length / limit),
          });
        }

        return res.status(200).json({
          cars,
          total,
          page,
          pages: Math.ceil(total / limit),
        });
      } catch (error: any) {
        return res.status(500).json({ msg: error.message });
      }
    };

    this.getCarById = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const carId = req.params.id;
        const car = await Car.findOne({
          carID: helpers.convertStringToObjectId(carId),
        }).populate("owner");

        const reviews = await Review.find({
          carID: helpers.convertStringToObjectId(carId),
        });

        let averageRating = 0;
        if (reviews.length > 0) {
          const totalRatings = reviews.reduce(
            (sum, review) => sum + review.rating,
            0
          );
          averageRating = totalRatings / reviews.length;
        }
        if (car) {
          car.averageRating = averageRating;
          res.status(200).json({ car: car });
        } else {
          res.status(404).json({ msg: "Car not found" });
        }
      } catch (error) {
        res.status(500).json({ msg: "Error retrieving car", error });
      }
    };

    this.addCar = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const {
          userId,
          make,
          name,
          year,
          pricePerDay,
          features,
          location,
          description,
          maintenanceStatus,
          insuranceStatus,
          latitude,
          longitude,
        } = req.body;
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const images = files.images;
        const primaryImage = files.primaryImage;

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });

        if (!user || !user.isOwner) {
          return res.status(403).json({ msg: "Unauthorized access" });
        }

        const newCar = new Car({
          ownerID: userId,
          make,
          name,
          year,
          pricePerDay,
          features: JSON.parse(features),
          location,
          availability: true,
          images,
          description,
          maintenanceStatus,
          insuranceStatus,
          latitude,
          longitude,
        });

        const [filesUrl, primaryImageUrl] = await Promise.all([
          CarController.uploadCarImages(
            images,
            res,
            userId,
            newCar.carID?.toString()
          ),
          CarController.uploadCarImages(
            primaryImage,
            res,
            userId,
            newCar?.carID?.toString()
          ),
        ]);

        const filesUrlArray: Array<string> = filesUrl as Array<string>;
        const primaryImageUrlArray: Array<string> =
          primaryImageUrl as Array<string>;

        if (filesUrlArray.length > 0) {
          filesUrlArray.forEach((url) => {
            newCar.images = [...newCar.images, url];
          });
        }

        if (primaryImageUrlArray.length > 0) {
          newCar.primaryImage = primaryImageUrlArray[0];
        }

        await newCar.save();
        res.status(201).json(newCar);
      } catch (error) {
        res.status(500).json({ msg: "Error adding car", error });
      }
    };

    this.updateCar = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const {
          userId,
          carID,
          make,
          name,
          year,
          pricePerDay,
          features,
          location,
          description,
          maintenanceStatus,
          insuranceStatus,
          latitude,
          longitude,
        } = req.body;

        // Handle files from multer
        const files = req.files as {
          [fieldname: string]: Express.Multer.File[];
        };
        const images = files.images || [];
        const primaryImage = files.primaryImage ? files.primaryImage[0] : null;

        const car = await Car.findOne({
          carID: helpers.convertStringToObjectId(carID),
        });

        if (!car) {
          return res.status(404).json({ msg: "Car not found" });
        }

        // Check if the user making the request is the owner of the car
        if (car.ownerID?.toString() !== req.body.userId) {
          return res.status(403).json({ msg: "Unauthorized access" });
        }
        const [filesUrl, primaryImageUrl] = await Promise.all([
          CarController.uploadCarImages(
            images,
            res,
            userId,
            car.carID?.toString(),
            car.images
          ),
          CarController.uploadCarImages(
            primaryImage ? [primaryImage] : [],
            res,
            userId,
            car.carID?.toString()
          ),
        ]);

        const filesUrlArray: Array<string> = filesUrl as Array<string>;
        const primaryImageUrlArray: Array<string> =
          primaryImageUrl as Array<string>;

        if (filesUrlArray.length > 0) {
          car.images = [];
          filesUrlArray.forEach((url) => {
            car.images = [...car.images, url];
          });
        }

        if (primaryImageUrlArray.length > 0) {
          car.primaryImage = primaryImageUrlArray[0];
        }

        car.make = make || car.make;
        car.name = name || car.name;
        car.year = year || car.year;
        car.pricePerDay = pricePerDay || car.pricePerDay;
        car.features = (features && JSON.parse(features)) || car.features;
        car.location = location || car.location;
        car.description = description || car.description;
        car.maintenanceStatus = maintenanceStatus || car.maintenanceStatus;
        car.insuranceStatus = insuranceStatus || car.insuranceStatus;
        car.latitude = latitude || car.latitude;
        car.longitude = longitude || car.longitude;

        await car.save();
        res.status(200).json(car);
      } catch (error) {
        res.status(500).json({ msg: "Error updating car", error });
      }
    };

    this.deleteCar = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { carID, userId } = req.body;

        const car = await Car.findOne({
          carID: helpers.convertStringToObjectId(carID),
        });
        if (!car) {
          return res.status(404).json({ msg: "Car not found" });
        }

        // Check if the user making the request is the owner of the car
        if (car.ownerID?.toString() !== userId) {
          return res.status(403).json({ msg: "Unauthorized access" });
        }
        const images = [...car.images, car.primaryImage];
        await CarController.uploadCarImages([], res, userId, carID, images);
        await car.deleteOne();
        res.status(200).json({ msg: "Car deleted successfully" });
      } catch (error) {
        res.status(500).json({ msg: "Error deleting car", error });
      }
    };

    this.getBookingsByOwner = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { userId } = req.params;

        const userObjectId = helpers.convertStringToObjectId(userId);

        const user = await User.findOne({ userId: userObjectId });
        if (!user) {
          return res.status(403).json({ msg: "Unauthorized access" });
        }

        // const cars = await Car.find({ ownerID: userObjectId });

        // const carIDs = cars.map((car) => car.carID);

        const bookings = await Booking.find({ userID: userObjectId }).populate({
          path: "carID",
          localField: "carID",
          foreignField: "carID",
          populate: {
            path: "ownerID",
            localField: "ownerID",
            foreignField: "userId",
            select: "userId name avatar email phonenumber", // Select fields from the owner
          },
          select: "primaryImage name make", // Select fields from the car
        });

        res.status(200).json(bookings);
      } catch (error) {
        res.status(500).json({ msg: "Error retrieving bookings", error });
      }
    };

    this.getFavorites = async (req: Request, res: Response) => {
      try {
        const { userId } = req.params;
        const user: any = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        }).populate({
          path: "cars",
          localField: "cars",
          foreignField: "carID",
        });
        if (!user) {
          return res.status(404).json({ msg: "User not found" });
        }
        const carRatings = await Review.aggregate([
          { $group: { _id: "$carID", averageRating: { $avg: "$rating" } } },
        ]);

        const ratingsMap = new Map(
          carRatings.map((rating) => [
            rating._id.toString(),
            rating.averageRating,
          ])
        );

        user.cars.forEach((car: any) => {
          car.averageRating = ratingsMap.get(car.carID?.toString()) || 0;
        });

        

        res.status(200).json({ favorites: user.cars });
      } catch (error: any) {
        res.status(500).json({ msg: error.message });
      }
    };

    this.addFavorite = async (req: Request, res: Response) => {
      try {
        const { userId, carID } = req.body;
        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });
        if (!user) {
          return res.status(404).json({ msg: "User not found" });
        }

        if (user.cars.some((id) => id.toString() === carID)) {
          return res.status(400).json({ msg: "Car already in favorites" });
        }

        user.cars.push(helpers.convertStringToObjectId(carID));
        await user.save();

        res.status(200).json({ msg: "Car added to favorites" });
      } catch (error: any) {
        res.status(500).json({ msg: error.message });
      }
    };

    this.removeFavorite = async (req: Request, res: Response) => {
      try {
        const { userId, carID } = req.body;

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });

        if (!user) {
          return res.status(404).json({ msg: "User not found" });
        }

        user.cars = user.cars.filter((id) => id.toString() !== carID);
        await user.save();

        res.status(200).json({ msg: "Car removed from favorites" });
      } catch (error: any) {
        res.status(500).json({ msg: error.message });
      }
    };
  }

  static filterCars(body: any) {
    const {
      keyword,
      location,
      priceMin,
      priceMax,
      type,
      make,
      features,
      userId,
    } = body;
    const filters: any = {
      availability: true,
    };

    if (userId) {
      filters.ownerID = helpers.convertStringToObjectId(userId);
    }

    if (keyword) {
      filters.$or = [
        { make: { $regex: keyword, $options: "i" } },
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
      ];
    }

    if (location) {
      filters.location = { $regex: location, $options: "i" };
    }

    if (priceMin || priceMax) {
      filters.pricePerDay = {};
      if (priceMin) filters.pricePerDay.$gte = parseFloat(priceMin as string);
      if (priceMax) filters.pricePerDay.$lte = parseFloat(priceMax as string);
    }

    if (type) {
      filters.type = type;
    }

    if (make) {
      filters.make = { $regex: make, $options: "i" };
    }

    if (features) {
      for (const [key, value] of Object.entries(features)) {
        if (value) {
          filters[`features.${key}`] = value;
        }
      }
    }

    return filters;
  }

  static async uploadCarImages(
    files: Express.Multer.File[],
    res: Response,
    userId: string = "",
    carId: string = "",
    images: string[] = []
  ) {
    try {
      let uploadedFiles: Array<string> = [];

      if (images.length > 0) {
        for (const img in images) {
          const tempFilePath = helpers.getFileNameFireBase(images[img]);
          const newFilePath = `${userId}/cars/${carId}/${tempFilePath}`;
          const oldLicenseRef = ref(storage, newFilePath);
          await deleteObject(oldLicenseRef);
        }
      }

      for (const file of files) {
        const fileName = `${new Date().getTime()}-${file.originalname}`;
        const filePath = userId
          ? `${userId}/cars/${carId}/${fileName}`
          : `cars/${carId}/${fileName}`;
        const fileRef = ref(storage, filePath);

        await uploadBytes(fileRef, file.buffer, {
          contentType: file.mimetype,
          contentDisposition: "inline",
        });

        const fileUrl = await getDownloadURL(fileRef);
        uploadedFiles.push(fileUrl);
      }

      return uploadedFiles;
    } catch (error) {
      return res.status(500).json({ msg: "Error uploading files", error });
    }
  }

  static async getInitial() {
    const review = new Review();
  }
}

export default new CarController();
