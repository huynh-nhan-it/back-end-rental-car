var express = require('express');
var router = express.Router();
import BookingController from '../controllers/BookingController';
import AuthenToken from '../auth/authen_token';

/* GET home page. */
router.get('/history/:userId', AuthenToken, BookingController.getBookingHistory);

router.get('/status/:userId', AuthenToken, BookingController.getBookingStatus);

router.post('/create', AuthenToken, BookingController.createBooking);

router.post('/create-momo', AuthenToken, BookingController.createMoMoPayment);

router.post('/cancel', AuthenToken, BookingController.cancelBooking);

router.post('/update', AuthenToken, BookingController.updateBookingStatus);

router.post('/add/card', AuthenToken, BookingController.addPaymentCard);

router.post('/create/payment', AuthenToken, BookingController.createCardPayment);

router.post('/verify/card', AuthenToken, BookingController.verifyOTPPayment);

module.exports = router;
