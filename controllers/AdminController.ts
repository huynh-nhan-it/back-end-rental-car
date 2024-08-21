import { Request, Response } from "express";
import User from "../models/User";
import Promotion from "../models/Promotion";
import Booking from "../models/Booking";
import Payment from "../models/Payment";
import helpers from "../untils/helpers";

class AdminController {
  // Update user details

  async getAllUsers(req: Request, res: Response) {
    try {
      const { status } = req.body;

      const users = await User.aggregate([
        {
          $match: { status: status ? status : "active" },
        },
        {
          $lookup: {
            from: "bookings",
            localField: "_id",
            foreignField: "userID",
            as: "bookings",
          },
        },
        {
          $addFields: {
            bookingCount: {
              $size: {
                $filter: {
                  input: "$bookings",
                  as: "booking",
                  cond: { $eq: ["$$booking.status", "successful"] },
                },
              },
            },
            totalBookingCost: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: "$bookings",
                      as: "booking",
                      cond: { $eq: ["$$booking.status", "successful"] },
                    },
                  },
                  as: "booking",
                  in: "$$booking.totalCost",
                },
              },
            },
          },
        },
        {
          $project: {
            bookings: 0, // Exclude the bookings array from the final result if not needed
          },
        },
      ]);

      res.status(200).json({ users });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const updatedUser = await User.findByIdAndUpdate(userId, req.body, {
        new: true,
      });
      res
        .status(200)
        .json({ message: "User updated successfully", user: updatedUser });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Get user details by ID
  async getUserById(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const user = await User.findOne({
        userId: helpers.convertStringToObjectId(userId),
      });
      res.status(200).json({ user });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async getPromotions(req: Request, res: Response) {
    try {
      const promotions = await Promotion.find({});
      res.status(200).json({ promotions });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Add a promotion to a user
  async createPromotion(req: Request, res: Response) {
    try {
      const { code, discountPercentage, expiryDate, condition, isActive } =
        req.body;

      const existingPromotion = await Promotion.findOne({ code });
      if (existingPromotion) {
        return res
          .status(400)
          .json({ message: "Promotion code already exists" });
      }

      const newPromotion = new Promotion({
        code,
        discountPercentage,
        expiryDate,
        isActive: isActive,
      });

      await newPromotion.save();

      let usersToApplyPromotion: any[] = [];

      if (condition === "all") {
        // Apply promotion to all users
        usersToApplyPromotion = await User.find({});
      } else if (!isNaN(condition)) {
        // Apply promotion to users with a certain number of bookings
        const bookingCount = parseInt(condition);
        const usersWithBookings = await Booking.aggregate([
          { $group: { _id: "$userID", bookingCount: { $sum: 1 } } },
          { $match: { bookingCount: { $gte: bookingCount } } },
        ]);

        const userIds = usersWithBookings.map((user) => user._id);
        usersToApplyPromotion = await User.find({ userId: { $in: userIds } });
      }

      for (const user of usersToApplyPromotion) {
        user.promotions.push(newPromotion._id);
        await user.save();
      }

      res.status(200).json({
        message: "Promotion created and applied to users",
        promotion: newPromotion,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePromotion(req: Request, res: Response) {
    try {
      const { promotionId } = req.params;
      const updatedPromotion = await Promotion.findByIdAndUpdate(
        promotionId,
        req.body
      );
      res
        .status(200)
        .json({ message: "Promotion updated", promotion: updatedPromotion });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // Approve or reject user status
  async updateStatusUser(req: Request, res: Response) {
    try {
      const { status, userId } = req.body;
      const objectId = helpers.convertStringToObjectId(userId);

      if (!objectId) {
        return res.status(400).json({ message: "Invalid userId" });
      }

      const existingUser = await User.findOne({ userId: objectId });

      if (!existingUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedCountFailed =
        status === "active" ? 0 : existingUser.countFailed;

      const user = await User.findOneAndUpdate(
        { userId: objectId },
        { status, countFailed: updatedCountFailed },
        { new: true }
      );

      res.status(200).json({ message: "User status updated", user });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // View all bookings of a user
  async getUserBookings(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const bookings = await Booking.find({ userID: userId });
      res.status(200).json({ bookings });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  // View all payments of a user
  async getUserPayments(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const payments = await Payment.find({ userID: userId }).populate(
        "bookingID cardId"
      );
      res.status(200).json({ payments });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}

export default new AdminController();
