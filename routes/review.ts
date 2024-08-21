var express = require('express');
var router = express.Router();
import ReviewController from '../controllers/ReviewController';
import AuthenToken from '../auth/authen_token';

/* GET home page. */
router.post('/add', AuthenToken, ReviewController.addReview);

router.get('/:carID', AuthenToken, ReviewController.getReviewsByCar);


module.exports = router;
