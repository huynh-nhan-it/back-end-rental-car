var express = require('express');
var router = express.Router();
import UserController from '../controllers/UserController';
import AuthenToken from '../auth/authen_token';
import { upload } from '../config/multer';
const fields = [
    { name: 'frontLicense', maxCount: 1 },
    { name: 'backLicense', maxCount: 1 },
    { name: 'frontLincenseCar', maxCount: 1 },
    { name: 'backLincenseCar', maxCount: 1 },
];


/* User Router. */


router.get('/infor/:userId', AuthenToken, UserController.getInFormation);

router.get('/promotions/:userId', AuthenToken, UserController.getPromotions);

router.put('/updateInforStandard', AuthenToken, upload.single('avatar'), UserController.updateStandardInFormation);

router.put('/updateLicense', AuthenToken, upload.fields(fields), UserController.updateLicense);

router.put('/updatePrivateInfor', AuthenToken, UserController.updatePrivateInformation);

router.post('/verifyOtpContact', AuthenToken, UserController.verifyOtpContact);

router.post('/updateContact', AuthenToken, UserController.UpdateContact);

router.put('/updatePassword', AuthenToken, UserController.updatePassword);

module.exports = router;
