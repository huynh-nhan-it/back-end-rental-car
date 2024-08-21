const jwt = require("jsonwebtoken");
import mongoose from "mongoose";
import nodemailer from "nodemailer";
const { Vonage } = require("@vonage/server-sdk");

export default {
  generateAccesssToken(useremail: string) {
    return (
      jwt.sign({ email: useremail }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10d",
      })
    );
  },

  sendMail(to: string, subject: string, text: string) {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL, // Thay thế bằng email của bạn
      to,
      subject,
      text,
    };

    return transporter.sendMail(mailOptions);
  },

  signToken(otp: string, input: string) {
    const token = jwt.sign({ otp, input }, process.env.OTP_SECRET, {
      expiresIn: process.env.OTP_EXPIRATION,
    });
    return token;
  },

  signTokenForgot(otp: string, input: string) {
    const token = jwt.sign({ otp, input }, process.env.OTP_SECRET_FORGOT, {
      expiresIn: process.env.OTP_EXPIRATION,
    });
    return token;
  },

  generateOTP() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo OTP 6 chữ số
    return otp;
  },

  async sendOtp(to: string, otp: string) {
    const vonage = new Vonage({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET,
    });
    await vonage.sms.send({
      to: to, // Số điện thoại người nhận
      from: process.env.PHONE, // Số điện thoại Twilio của bạn
      text: `Your OTP code is ${otp}`,
    });
  },

  verifyOTP(
    input: string,
    otp: string,
    token: string,
    type: string = "REGISTER"
  ) {
    try {
      let typeSecret;

      switch (type) {
        case "REGISTER":
          typeSecret = process.env.OTP_SECRET;
          break;
        case "FORGOT":
          typeSecret = process.env.OTP_SECRET_FORGOT;
          break;
        default:
          throw new Error("Invalid type");
      }

      const decoded = jwt.verify(token, typeSecret) as {
        otp: string;
        input: string;
      };
      const isMatch = decoded.input === input && decoded.otp === otp;

      return {
        status: isMatch,
        msg: isMatch ? "OTP code is correct" : "OTP code is incorrect",
      };
    } catch (error) {
      return {
        status: false,
        err: error,
        msg: "OTP code is expired",
      };
    }
  },

  mutipleMongooseToObject(mongooses: any) {
    return mongooses.map((mongoose: any) => mongoose.toObject());
  },

  mongooseToObject(mongoose: any) {
    return mongoose ? mongoose.toObject() : mongoose;
  },

  convertStringToObjectId(str: string) {
    return new mongoose.Types.ObjectId(str);
  },

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  
  calculateAge(birthdate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthdate.getFullYear();
    const monthDifference = today.getMonth() - birthdate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthdate.getDate())) {
        age--;
    }

    return age;
  },

  getFileNameFireBase(filePath: string) {
    
    const decodedUrl = decodeURIComponent(filePath.split("?")[0]);
    const tempFilePath = decodedUrl.split("/o/")[1];
    return tempFilePath.split("/").pop();
  }

};
