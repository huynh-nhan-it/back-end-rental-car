import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Booking from "../models/Booking";
import Car from "../models/Car";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import axios from "axios";
import helpers from "../untils/helpers";
import CreditCard from "../models/CreditCard";
import Payment from "../models/Payment";
import Promotion from "../models/Promotion";

class BookingController {
  createBooking: (req: Request, res: Response, next: NextFunction) => void;

  getBookingHistory: (req: Request, res: Response, next: NextFunction) => void;

  getBookingStatus: (req: Request, res: Response, next: NextFunction) => void;

  cancelBooking: (req: Request, res: Response, next: NextFunction) => void;

  updateBookingStatus: (req: Request, res: Response, next: NextFunction) => void;

  createMoMoPayment: (req: Request, res: Response, next: NextFunction) => void;

  addPaymentCard: (req: Request, res: Response, next: NextFunction) => void;

  removePaymentCard: (req: Request, res: Response, next: NextFunction) => void;

  createCardPayment: (req: Request, res: Response, next: NextFunction) => void;

  verifyOTPPayment: (req: Request, res: Response, next: NextFunction) => void;

  constructor() {
    this.createMoMoPayment = async (req: Request, res: Response) => {
      try {
        const {
          amount,
          orderInfo,
          accessKey,
          secretKey, // Đổi từ 'secretkey' thành 'secretKey'
          partnerCode,
          redirectUrl,
          ipnUrl,
          requestType,
          lang,
        } = req.body;
    
        if (!secretKey || !accessKey || !partnerCode || !amount) {
          throw new Error("Missing required fields: secretKey, accessKey, partnerCode, or amount.");
        }
    
        const requestId = partnerCode + new Date().getTime();
        const orderId = requestId;
        const extraData = "";
    
        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
        const signature = crypto
          .createHmac('sha256', secretKey)
          .update(rawSignature)
          .digest('hex');
    
        const requestBody = {
          partnerCode: partnerCode,
          accessKey: accessKey,
          requestId: requestId,
          amount: amount,
          orderId: orderId,
          orderInfo: orderInfo,
          redirectUrl: redirectUrl,
          ipnUrl: ipnUrl,
          extraData: extraData,
          requestType: requestType,
          signature: signature,
          lang: lang || 'en', // Default to 'en' if not provided
        };
    
        const response = await axios.post(
          'https://test-payment.momo.vn/v2/gateway/api/create',
          requestBody,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
    
        if (!response.data || !response.data.payUrl) {
          return res.status(500).json({ msg: "Error creating MoMo payment" });
        }
    
        const paymentStatus = "pending";
    
        const newPayment = new Payment({
          bookingID: null,
          amount,
          method: "MoMo",
          status: paymentStatus,
        });
    
        const savedPayment = await newPayment.save();
    
        res.status(200).json({ MoMo: response.data, payment: savedPayment });
      } catch (error) {
        res.status(500).json({ msg: "Error creating MoMo payment", error });
      }
    };
    

    this.createBooking = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { userID, carID, orderInfor, paymentId } = req.body;

        const userObjectId = helpers.convertStringToObjectId(userID);
        const carObjectId = helpers.convertStringToObjectId(carID);
        const paymentObjectId = helpers.convertStringToObjectId(paymentId);

        const car = await Car.findOne({ carID: carObjectId });
        if (!car) {
          return res.status(404).json({ msg: "Car not found" });
        }

        const booking = new Booking({
          userID: userObjectId,
          carID: carObjectId,
          startDate: new Date(orderInfor.startDate),
          endDate: new Date(orderInfor.endDate),
          totalCost: orderInfor.totalCost,
        });

        await booking.save();

        // Cập nhật bookingID vào payment
        await Payment.findByIdAndUpdate(paymentObjectId, {
          bookingID: booking.bookingID,
        });

        // Gửi xác nhận đặt chỗ và hóa đơn
        await BookingController.sendConfirmation(
          userID,
          carID,
          new Date(orderInfor.startDate),
          new Date(orderInfor.endDate),
          parseFloat(orderInfor.totalCost),
          "Xác nhận đặt xe",
          "Đặt xe mới"
        );

        await BookingController.sendInvoice(
          userID,
          carID,
          booking.bookingID?.toString() ?? "",
          parseFloat(orderInfor.totalCost),
          "Hóa đơn đặt xe",
          "Hóa đơn đặt xe mới"
        );

        return res
          .status(201)
          .json({ message: "Booking created successfully", booking });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ msg: error.message });
      }
    };

    this.getBookingHistory = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { userID } = req.params;
        const userObjectId = helpers.convertStringToObjectId(userID);
        const bookings = await Booking.find({ userID: userObjectId });
        res.status(200).json(bookings);
      } catch (error) {
        res
          .status(500)
          .json({ msg: "Error retrieving booking history", error });
      }
    };

    this.getBookingStatus = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { userId } = req.params;
        const userObjectId = helpers.convertStringToObjectId(userId);
        
        const user = await User.findOne({ userId: userObjectId });

        if (!user || !user.isOwner) {
          return res.status(403).json({ msg: "Unauthorized access" });
        }

        const cars = await Car.find({ ownerID: userObjectId }).select('carID name primaryImage');
    
        const carIDs = cars.map((car) => car.carID);
        const bookings = await Booking.find({ carID: { $in: carIDs }, status: "pending" }).populate({
          path: "userID",
          localField: "userID",
          foreignField: "userId",
          select: "name email phonenumber avatar",
        });
    
        const result = cars.map((car: any) => {
          const booking: any = bookings.find((b) => b.carID.toString() === car.carID.toString());
          return {
            ...car.toObject(),
            booking,
            bookingStatus: booking ? booking.status : 'available',
          };
        });
    
        return res.status(200).json({
          cars: result,
          total: result.length,
        });
    
      } catch (error) {
        res
          .status(500)
          .json({ msg: "Error retrieving booking status", error });
      }
    };
    

    this.cancelBooking = async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      try {
        const { bookingID } = req.body;

        if (!bookingID) {
          return res.status(400).json({ msg: "Booking ID is required." });
        }

        const bookingObjectId = helpers.convertStringToObjectId(bookingID);
        const booking = await Booking.findOne({ bookingID: bookingObjectId });

        if (!booking) {
          return res.status(404).json({ msg: "Booking not found." });
        }

        if (booking.status === "cancelled") {
          return res
            .status(400)
            .json({ msg: "Booking is already canceled." });
        }

        const payment = await Payment.findOne({ bookingID: bookingObjectId });

        if (!payment) {
          return res
            .status(404)
            .json({ msg: "Associated payment not found." });
        }

        // Refund logic: Repay the money to the user's credit card
        const creditCard = await CreditCard.findOne({ _id: payment.cardId });

        if (!creditCard) {
          return res.status(404).json({ msg: "Credit card not found." });
        }

        // Update the status to canceled
        booking.status = "cancelled";
        await booking.save();

        // Refund the money
        creditCard.amount += payment.amount;
        await creditCard.save();

        // Update payment status to refunded
        payment.status = "refunded";
        await payment.save();

        await BookingController.sendConfirmation(
          booking.userID.toString(),
          booking.carID.toString(),
          new Date(booking.startDate),
          new Date(booking.endDate),
          parseFloat(booking.totalCost.toString()),
          "Xác nhận hủy đặt xe",
          "Hủy đặt xe"
        );

        return res
          .status(200)
          .json({
            message: "Booking canceled and payment refunded successfully.",
            booking,
          });
      } catch (error: any) {
        console.error(error);
        return res
          .status(500)
          .json({ msg: "Error canceling booking", error: error.message });
      }
    };

    this.updateBookingStatus = async (req: Request, res: Response) => {
      try {
        const { bookingID, status } = req.body;

        if (!bookingID || !status) {
          return res.status(400).json({ msg: "Booking ID and status are required." });
        }

        const bookingObjectId = helpers.convertStringToObjectId(bookingID);
        const booking = await Booking.findOne({ bookingID: bookingObjectId });

        if (!booking) {
          return res.status(404).json({ msg: "Booking not found." });
        }

        booking.status = status;
        await booking.save();


        await BookingController.sendConfirmation(
          booking.userID.toString(),
          booking.carID.toString(),
          new Date(booking.startDate),
          new Date(booking.endDate),
          parseFloat(booking.totalCost.toString()),
          `${status === "renting" ? "Xác nhận thuê xe" : "Xác nhận trả xe"}`,
          `${status === "renting" ? "Thuê xe" : "Trả xe"}`
        );

        return res.status(200).json({
          message: "Booking status updated successfully.",
          booking,
        });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ msg: error.message });
      }
    }

    this.addPaymentCard = async (req: Request, res: Response) => {
      try {
        const { userId, cardNumber, expiryDate, cvv, cardHolderName } =
          req.body;

        if (!userId || !cardNumber || !expiryDate || !cvv || !cardHolderName) {
          return res.status(400).json({ msg: "All fields are required." });
        }

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });
        if (!user) {
          return res.status(404).json({ msg: "User not found." });
        }

        const newCreditCard = new CreditCard({
          userId: helpers.convertStringToObjectId(userId),
          cardNumber,
          cardHolderName: cardHolderName,
          expirationDate: expiryDate,
          cvv,
        });

        const savedCreditCard = await newCreditCard.save();

        user.creditCards.push(savedCreditCard._id);
        await user.save();

        return res.status(200).json({
          message: "Credit card added successfully.",
          creditCard: savedCreditCard,
        });
      } catch (error) {
        // Handle any errors that occur
        console.error(error);
        return res.status(500).json({ msg: "Internal server error." });
      }
    };

    this.removePaymentCard = async (req: Request, res: Response) => {
      try {
        const { userId, cardId } = req.body;

        if (!userId || !cardId) {
          return res.status(400).json({ msg: "All fields are required." });
        }

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });
        if (!user) {
          return res.status(404).json({ msg: "User not found." });
        }

        const creditCard = await CreditCard.findOne({
          _id: helpers.convertStringToObjectId(cardId),
        });
        if (!creditCard) {
          return res.status(404).json({ msg: "Credit card not found." });
        }

        user.creditCards = user.creditCards.filter(
          (card) => card.toString() !== cardId
        );
        await user.save();

        await CreditCard.findByIdAndDelete(cardId);

        return res.status(200).json({
          message: "Credit card removed successfully.",
          creditCard,
        });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ msg: error.message });
      }
    };

    this.createCardPayment = async (req: Request, res: Response) => {
      try {
        const { userId, amount, paymentMethod, cardId, promotionCode } =
          req.body;
        console.log(req.body);
        if (!userId || !amount || !paymentMethod) {
          return res.status(400).json({ msg: "All fields are required." });
        }

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });
        if (!user) {
          return res.status(404).json({ msg: "User not found." });
        }

        let finalAmount = amount;
        let promotionId = "";
        if (promotionCode) {
          const promotion = await Promotion.findOne({
            code: promotionCode,
            isActive: true,
            expiryDate: { $gte: new Date() },
          });

          if (!promotion) {
            return res
              .status(400)
              .json({ msg: "Invalid or expired promotion code." });
          }

          const discount = (promotion.discountPercentage / 100) * amount;
          finalAmount = amount - discount;
          promotionId = promotion._id.toString();
        }

        const selectedCreditCard = user.creditCards.find(
          (card) => card._id.toString() === cardId
        );

        const creditCard = await CreditCard.findOne({
          _id: selectedCreditCard,
        });

        if (!creditCard) {
          return res.status(404).json({ msg: "Credit card not found." });
        }

        if (creditCard.amount < amount) {
          return res
            .status(400)
            .json({ msg: "Insufficient funds on the credit card." });
        }

        const paymentStatus = "pending";

        const newPayment = new Payment({
          bookingID: null,
          amount: finalAmount,
          cardId,
          method: paymentMethod,
          status: paymentStatus,
        });

        const otp = helpers.generateOTP();
        const token = helpers.signToken(otp, newPayment._id.toString());
        const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;
        await helpers.sendMail(
          user?.email ?? "",
          "Your OTP Payment Code",
          mailText
        );

        const savedPayment = await newPayment.save();

        return res.status(200).json({
          message: "Payment processed successfully.",
          payment: savedPayment,
          promotionId,
          otp,
          token,
        });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ msg: error.message });
      }
    };

    this.verifyOTPPayment = async (req: Request, res: Response) => {
      try {
        const { userId, paymentId, otp, token, promotionId } = req.body;

        if (!userId || !paymentId || !otp) {
          return res.status(400).json({ msg: "All fields are required." });
        }

        const user = await User.findOne({
          userId: helpers.convertStringToObjectId(userId),
        });
        if (!user) {
          return res.status(404).json({ msg: "User not found." });
        }

        const payment = await Payment.findOne({
          _id: helpers.convertStringToObjectId(paymentId),
        });

        if (!payment) {
          return res.status(404).json({ msg: "Payment not found." });
        }

        // Verify OTP
        const otpVerification = await helpers.verifyOTP(paymentId, otp, token);
        if (!otpVerification.status) {
          return res
            .status(400)
            .json({ msg: "Invalid OTP." + otpVerification.msg });
        }

        const creditCard = await CreditCard.findOne({ _id: payment.cardId });

        if (!creditCard) {
          return res.status(404).json({ msg: "Credit card not found." });
        }

        user.promotions = user.promotions.filter(
          (promotion) => promotion.toString() !== promotionId
        );
        creditCard.amount -= payment.amount;
        payment.status = "successful";
        await creditCard.save();
        await payment.save();
        await user.save();

        return res.status(200).json({
          message: "Payment verified successfully.",
          payment,
        });
      } catch (error: any) {
        console.error(error);
        return res.status(500).json({ msg: error.message });
      }
    };
  }

  static async sendConfirmation(
    userID: string,
    carID: string,
    startDate: Date,
    endDate: Date,
    totalCost: number,
    titleUser: string,
    titleOwner: string
  ) {
    const userObjectId = helpers.convertStringToObjectId(userID);
    const carObjectId = helpers.convertStringToObjectId(carID);

    const user = await User.findOne({ userId: userObjectId });
    const car: any = await Car.findOne({ carID: carObjectId }).populate(
      "owner"
    );
    //Xác nhận đặt xe
    const messageUser = `
        ${titleUser}:
        Xe: ${car?.make} ${car?.name}
        Ngày bắt đầu: ${startDate.toLocaleString()}
        Ngày kết thúc: ${endDate.toLocaleString()}
        Tổng chi phí: ${totalCost}
    `;
    //Đặt xe mới
    const messageOwner = `
        ${titleOwner}:
        Xe: ${car?.make} ${car?.name}
        Người thuê: ${user?.name}
        Ngày bắt đầu: ${startDate.toLocaleString()}
        Ngày kết thúc: ${endDate.toLocaleString()}
        Tổng chi phí: ${totalCost}
    `;

    if (user && car && user.email && car.owner && car.owner.email) {
      helpers.sendMail(user.email, "Xác nhận đặt xe", messageUser);
      helpers.sendMail(car.owner.email, "Đặt xe mới", messageOwner);
    }
  }

  static async sendInvoice(
    userID: string,
    carID: string,
    bookingID: string,
    totalCost: number,
    titleUser: string,
    titleOwner: string
  ) {
    try {
      // Chuyển đổi ID thành ObjectId
      const userObjectId = helpers.convertStringToObjectId(userID);
      const carObjectId = helpers.convertStringToObjectId(carID);

      // Tìm người dùng và xe
      const user = await User.findOne({ userId: userObjectId });
      const car: any = await Car.findOne({ carID: carObjectId }).populate(
        "owner"
      );

      if (!user || !car || !car.ownerID) {
        throw new Error("User or Car or Owner not found");
      }

      // Hóa đơn đặt xe
      const invoiceUser = `
        ${titleUser}:
        Xe: ${car.make} ${car.name}
        Ngày đặt: ${new Date().toLocaleString()}
        Tổng chi phí: ${totalCost}
        Mã đặt xe: ${bookingID}
      `;
      // Hóa đơn đặt xe mới
      const invoiceOwner = `
        ${titleOwner}:
        Xe: ${car.make} ${car.name}
        Người thuê: ${user.name}
        Ngày đặt: ${new Date().toLocaleString()}
        Tổng chi phí: ${totalCost}
        Mã đặt xe: ${bookingID}
      `;

      // Gửi email cho người dùng và chủ xe
      if (user.email) {
        await helpers.sendMail(user.email, "Hóa đơn đặt xe", invoiceUser);
      }

      if (car.owner.email) {
        await helpers.sendMail(
          car.owner.email,
          "Hóa đơn đặt xe mới",
          invoiceOwner
        );
      }
    } catch (error) {
      console.error("Error in sendInvoice:", error);
    }
  }
}

export default new BookingController();
