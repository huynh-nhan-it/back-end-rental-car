var express = require('express');
var router = express.Router();
import AdminController from '../controllers/AdminController';

/* GET home page. */
router.post('/get-users', AdminController.getAllUsers);

router.put('/update-user-status', AdminController.updateStatusUser);
// router.get('/:carID', AdminController.getReviewsByCar);

router.get('/promotions', AdminController.getPromotions);

router.post('/create-promotion', AdminController.createPromotion);

router.put('/update-promotion/:promotionId', AdminController.updatePromotion);

module.exports = router;
