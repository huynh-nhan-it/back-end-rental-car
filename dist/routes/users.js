"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express = require('express');
var router = express.Router();
const userControllers_1 = __importDefault(require("../controllers/userControllers"));
router.post('/login', userControllers_1.default.validateLogin, userControllers_1.default.Login);
router.post('/register', userControllers_1.default.validateRegister, userControllers_1.default.Register);
router.post('/verifyOTP', userControllers_1.default.verifyOTP);
router.post('/forgotPassword', userControllers_1.default.forgotPassword);
router.post('/verifyOTP/forgotPassword', userControllers_1.default.verifyOTP);
router.post('/confirmPassword', userControllers_1.default.confirmPassword);
module.exports = router;
