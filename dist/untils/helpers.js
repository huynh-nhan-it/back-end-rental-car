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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
const nodemailer_1 = __importDefault(require("nodemailer"));
const { Vonage } = require("@vonage/server-sdk");
exports.default = {
    generateAccesssToken(useremail) {
        return ("Bearer " +
            jwt.sign(useremail, process.env.TOKEN_SECRET, {
                expiresIn: "3600s",
            }));
    },
    sendMail(to, subject, text) {
        const transporter = nodemailer_1.default.createTransport({
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
    signToken(otp, input) {
        const token = jwt.sign({ otp, input }, process.env.OTP_SECRET, {
            expiresIn: process.env.OTP_EXPIRATION,
        });
        return token;
    },
    signTokenForgot(otp, input) {
        const token = jwt.sign({ otp, input }, process.env.OTP_SECRET_FORGOT, {
            expiresIn: process.env.OTP_EXPIRATION,
        });
        return token;
    },
    generateOTP() {
        const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Tạo OTP 6 chữ số
        return otp;
    },
    sendOtp(to, otp) {
        return __awaiter(this, void 0, void 0, function* () {
            const vonage = new Vonage({
                apiKey: process.env.API_KEY,
                apiSecret: process.env.API_SECRET,
            });
            yield vonage.sms.send({
                to: to, // Số điện thoại người nhận
                from: process.env.PHONE, // Số điện thoại Twilio của bạn
                text: `Your OTP code is ${otp}`,
            });
        });
    },
    verifyOTP(input, otp, token, type = "REGISTER") {
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
            const decoded = jwt.verify(token, typeSecret);
            const isMatch = decoded.input === input && decoded.otp === otp;
            return {
                status: isMatch,
                msg: isMatch ? "OTP code is correct" : "OTP code is incorrect",
            };
        }
        catch (error) {
            return {
                status: false,
                msg: "OTP code is expired",
            };
        }
    },
    mutipleMongooseToObject(mongooses) {
        return mongooses.map((mongoose) => mongoose.toObject());
    },
    mongooseToObject(mongoose) {
        return mongoose ? mongoose.toObject() : mongoose;
    },
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
};
