import { Request, Response, NextFunction } from "express";
import Review from "../models/Review";
import helpers from "../untils/helpers";

class ReviewController {
  addReview: (req: Request, res: Response, next: NextFunction) => void;

  getReviewsByCar: (req: Request, res: Response, next: NextFunction) => void;

  constructor() {
    this.addReview = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { userId, carID, rating, comment } = req.body;

        const review = new Review({
          userId: helpers.convertStringToObjectId(userId),
          carID: helpers.convertStringToObjectId(carID),
          rating,
          comment,
        });

        await review.save();

        res.status(201).json({ message: "Review added successfully", review });
      } catch (error) {
        res.status(500).json({ msg: "Error adding review", error });
      }
    };

    this.getReviewsByCar = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { carID } = req.params;
        const reviews = await Review.find({
          carID: helpers.convertStringToObjectId(carID),
        }).populate({
          path: "userId",
          model: "User",
          localField: "userId",
          foreignField: "userId",
          select: "name avatar",
        });
        const averageRating = reviews.length
          ? (
              reviews.reduce((sum, review) => sum + review.rating, 0) /
              reviews.length
            ).toFixed(2)
          : 0;
        res.status(200).json({
          averageRating,
          reviews,
        });
      } catch (error) {
        res.status(500).json({ msg: "Error retrieving reviews", error });
      }
    };
  }
}

export default new ReviewController();
