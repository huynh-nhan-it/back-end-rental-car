var express = require('express');
var router = express.Router();
import AuthenticationController from '../controllers/AuthenticationController';
import { upload } from '../config/multer';
const fields = [
    { name: 'frontLicense', maxCount: 1 },
    { name: 'backLicense', maxCount: 1 },
    { name: 'frontLincenseCar', maxCount: 1 },
    { name: 'backLincenseCar', maxCount: 1 },
];


router.post('/login', AuthenticationController.validateLogin, AuthenticationController.Login);

router.post('/loginGoogle', upload.fields(fields), AuthenticationController.LoginGoogle);

router.post('/loginFacebook', upload.fields(fields), AuthenticationController.LoginFacebook);

router.post('/register', upload.fields(fields), AuthenticationController.validateRegister, AuthenticationController.Register);

router.post('/verifyOTP', AuthenticationController.verifyOTP);

router.post('/forgotPassword', AuthenticationController.forgotPassword);

router.post('/verifyOTP/forgotPassword', AuthenticationController.verifyOTPForgot);

router.post('/confirmPassword', AuthenticationController.confirmPassword);


module.exports = router;
