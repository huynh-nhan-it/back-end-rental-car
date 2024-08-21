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
const jwt = require('jsonwebtoken');
const Token_1 = __importDefault(require("../models/Token"));
const authenticateToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    // Lấy token từ header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null)
        return res.sendStatus(401); // Không có token, trả về Unauthorized
    // Kiểm tra và xác thực token
    try {
        const tokenDoc = yield Token_1.default.findOne({ token });
        if (!tokenDoc) {
            return res.sendStatus(403); // Token không hợp lệ, trả về Forbidden
        }
        next(); // Token hợp lệ, chuyển tiếp đến middleware tiếp theo
    }
    catch (error) {
        console.error('Error verifying token:', error);
        res.status(500).send('Internal Server Error');
    }
});
module.exports = authenticateToken;
