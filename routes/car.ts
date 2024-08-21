var express = require("express");
var router = express.Router();
import CarController from "../controllers/CarController";
import AuthenToken from "../auth/authen_token";
import { upload } from "../config/multer";

/* GET home page. */
router.post("/", AuthenToken, CarController.getCars);

router.get("/:id", AuthenToken, CarController.getCarById);

router.post(
  "/add",
  AuthenToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "primaryImage", maxCount: 1 },
  ]),
  CarController.addCar
);

router.put(
  "/update",
  AuthenToken,
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "primaryImage", maxCount: 1 },
  ]),
  CarController.updateCar
);

router.delete("/delete", AuthenToken, CarController.deleteCar);

router.get("/booking/:userId", AuthenToken, CarController.getBookingsByOwner);

router.get("/favorites/:userId", AuthenToken, CarController.getFavorites);

router.post("/favorites/add", AuthenToken, CarController.addFavorite);

router.delete("/favorites/remove", AuthenToken, CarController.removeFavorite);

module.exports = router;
