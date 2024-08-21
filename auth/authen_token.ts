const jwt = require('jsonwebtoken');
import { Request, Response, NextFunction } from 'express';
import Token from '../models/Token';

const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  // Lấy token từ header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Không có token, trả về Unauthorized

  // Kiểm tra và xác thực token
  try {
    const tokenDoc = await Token.findOne({ token });
    if (!tokenDoc) {
      return res.sendStatus(403); // Token không hợp lệ, trả về Forbidden
    }

    next(); // Token hợp lệ, chuyển tiếp đến middleware tiếp theo
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).send('Internal Server Error');
  }

};

export default authenticateToken;
