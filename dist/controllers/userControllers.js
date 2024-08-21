"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
const User_1 = __importDefault(require("../models/User"));
const Token_1 = __importDefault(require("../models/Token"));
const bcrypt = __importStar(require("bcrypt"));
const uuid_1 = require("uuid");
const helpers_1 = __importDefault(require("../untils/helpers"));
class UserController {
    constructor() {
        this.saltRounds = 10;
        this.validateRegister = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { phonenumber, email } = req.body;
            const conditions = [];
            if (email) {
                conditions.push({ email: email });
            }
            if (phonenumber) {
                conditions.push({ phonenumber: phonenumber });
            }
            try {
                const user = yield User_1.default.findOne({
                    $or: conditions,
                });
                if (user) {
                    if (user.email === email && conditions[0].email) {
                        return res.status(400).send("Email is already in exist");
                    }
                    if (user.phonenumber === phonenumber && conditions[0].phonenumber) {
                        return res.status(400).send("Phone number is already in exist");
                    }
                }
                next();
            }
            catch (error) {
                return res
                    .status(500)
                    .send("Register failed: " + error.message || error);
            }
        });
        this.Register = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { phonenumber, email, password } = req.body;
            try {
                const otp = helpers_1.default.generateOTP();
                const hash = yield bcrypt.hash(password, this.saltRounds);
                if (!hash) {
                    return res.status(500).send("Password encryption failed");
                }
                if (email) {
                    const token = helpers_1.default.signToken(otp, email);
                    const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;
                    helpers_1.default.sendMail(email, "Your OTP Code", mailText).then(() => {
                        return res.status(200).json({
                            message: "OTP sent",
                            token: token,
                            email: email,
                            password: hash
                        });
                    });
                }
                else {
                    const token = helpers_1.default.signToken(otp, phonenumber);
                    helpers_1.default.sendOtp(phonenumber, otp).then(() => {
                        return res.status(200).json({
                            message: "OTP sent",
                            token: token,
                            phonenumber: phonenumber,
                            password: hash
                        });
                    });
                }
            }
            catch (error) {
                return res
                    .status(500)
                    .send("Register failed: " + error.message || error);
            }
        });
        this.verifyOTP = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { input, otp, token, password } = req.body;
            try {
                const isVerified = helpers_1.default.verifyOTP(input, otp, token);
                if (isVerified.status) {
                    const userId = (0, uuid_1.v4)();
                    const newUser = new User_1.default({
                        userId,
                        name: "",
                        email: helpers_1.default.isValidEmail(input) ? input : "",
                        password: password,
                        phonenumber: !helpers_1.default.isValidEmail(input) ? input : "",
                        address: "",
                        frontLicense: "",
                        backLicense: "",
                        lincenseCar: "",
                        countFailed: 0,
                        status: "active",
                        avatar: "",
                    });
                    yield newUser.save();
                    req.session.user = newUser;
                    return res.status(200).send(isVerified.msg);
                }
                else {
                    return res.status(401).send(isVerified.msg);
                }
            }
            catch (error) {
                return res
                    .status(500)
                    .send("OTP verification failed: " + error.message || error);
            }
        });
        this.validateLogin = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { phonenumber, email, password } = req.body;
            const conditions = [];
            if (email) {
                conditions.push({ email: email });
            }
            if (phonenumber) {
                conditions.push({ phonenumber: phonenumber });
            }
            try {
                const user = yield User_1.default.findOne({
                    $or: conditions,
                });
                if (user) {
                    const failed = user.countFailed;
                    if (failed === 10) {
                        return res
                            .status(429)
                            .send(`Account is currently temporarily locked, please try again in 1 minute`);
                    }
                    if (failed === 6) {
                        return res
                            .status(429)
                            .send(`Account has been permanently locked! You have entered the wrong password too many times! Contact admin to reopen account`);
                    }
                    const isPasswordValid = yield bcrypt.compare(password, user.password);
                    if (isPasswordValid) {
                        const token = helpers_1.default.generateAccesssToken(user.email ? user.email : "");
                        const newToken = new Token_1.default({
                            userId: user.userId,
                            token: token,
                        });
                        yield newToken.save();
                        yield User_1.default.updateOne({ userId: user.userId }, { $set: { countFailed: 0 } });
                        return next();
                    }
                    else {
                        if (failed === 2) {
                            yield User_1.default.updateOne({ userId: user.userId }, { $set: { countFailed: 10 } });
                            setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                                yield User_1.default.updateOne({ userId: user.userId }, { $set: { countFailed: 3 } });
                                console.log(`Unlock account for ${user.name}`);
                            }), 60000);
                            return res.status(429).send({
                                msg: "Account has been temporarily locked for 1 minute! If you continue to enter the wrong password 3 more times, it will be permanently locked!",
                            });
                        }
                        else if (failed >= 5) {
                            yield User_1.default.updateOne({ userId: user.userId }, { $set: { countFailed: 6, status: "bannedMany" } });
                            return res.status(429).send({
                                msg: "Account has been permanently locked! You have entered the wrong password too many times! Contact admin to reopen account",
                            });
                        }
                        else {
                            yield User_1.default.updateOne({ userId: user.userId }, { $set: { countFailed: failed + 1 } });
                            return res.status(401).send({
                                msg: `Incorrect password. You have ${failed + 1} failed attempts.`,
                            });
                        }
                    }
                }
                else {
                    return res.status(404).send("User not found");
                }
            }
            catch (error) {
                return res.status(500).send({
                    success: false,
                    msg: error.message,
                });
            }
        });
        this.Login = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { phonenumber, email } = req.body;
            const conditions = [];
            if (email) {
                conditions.push({ email: email });
            }
            if (phonenumber) {
                conditions.push({ phonenumber: phonenumber });
            }
            try {
                const user = yield User_1.default.findOne({
                    $or: conditions,
                });
                if (user) {
                    if (user.status === "block") {
                        return res
                            .status(403)
                            .send("This account has been disabled, please contact hotline 18001008");
                    }
                    req.session.user = user;
                    return res.status(200).send("Login sucessfully!");
                }
            }
            catch (error) {
                return res.status(500).send(error.message);
            }
        });
        this.forgotPassword = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { phonenumber, email } = req.body;
            const conditions = [];
            if (email) {
                conditions.push({ email: email });
            }
            if (phonenumber) {
                conditions.push({ phonenumber: phonenumber });
            }
            try {
                const user = yield User_1.default.findOne({
                    $or: conditions,
                });
                if (user) {
                    if (user.status === "block" || user.countFailed === 6) {
                        return res
                            .status(403)
                            .send("This account has been disabled, please contact hotline 18001008");
                    }
                    const otp = helpers_1.default.generateOTP();
                    if (email) {
                        const token = helpers_1.default.signTokenForgot(otp, email);
                        const mailText = `Your OTP code is: ${otp}. This code is valid for 5 minutes.`;
                        helpers_1.default.sendMail(email, "Your OTP Code", mailText).then(() => {
                            return res.status(200).json({
                                message: "OTP sent",
                                token: token,
                                email: email,
                            });
                        });
                    }
                    else {
                        const token = helpers_1.default.signTokenForgot(otp, phonenumber);
                        helpers_1.default.sendOtp(phonenumber, otp).then(() => {
                            return res.status(200).json({
                                message: "OTP sent",
                                token: token,
                                phonenumber: phonenumber,
                            });
                        });
                    }
                }
                else {
                    return res.status(404).send("User not found");
                }
            }
            catch (error) {
                return res.status(500).send(error.message);
            }
        });
        this.verifyOTPForgot = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { input, otp, token } = req.body;
            try {
                const isVerified = helpers_1.default.verifyOTP(input, otp, token, "FORGOT");
                if (isVerified.status) {
                    return res.status(200).send(isVerified.msg);
                }
                else {
                    return res.status(401).send(isVerified.msg);
                }
            }
            catch (error) {
                return res
                    .status(500)
                    .send("OTP verification failed: " + error.message || error);
            }
        });
        this.confirmPassword = (req, res, next) => __awaiter(this, void 0, void 0, function* () {
            const { newPassword, confirmPassword, input } = req.body;
            try {
                const user = yield User_1.default.findOne({
                    $or: [{ email: input }, { phonenumber: input }],
                });
                if (newPassword !== confirmPassword) {
                    return res
                        .status(400)
                        .send("Password and confirm password do not match");
                }
                const hash = yield bcrypt.hash(newPassword, this.saltRounds);
                if (!hash) {
                    return res.status(500).send("Password encryption failed");
                }
                if (user) {
                    yield User_1.default.updateOne({ $or: [{ email: input }, { phonenumber: input }] }, { $set: { password: hash } });
                    return res.status(200).send("Password updated successfully");
                }
            }
            catch (error) {
                return res.status(500).send(error.message);
            }
        });
    }
}
exports.default = new UserController();
