const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");

router.route("/register").post(userController.registerUser);
router.route("/login").post(userController.login);
router.route("/logout").get(userController.logout);

router.use(userController.protect);

router.route("/userDetails").get(userController.userDetails);
router.route("/updateUser").patch(userController.updateUser);
router.route("/search").post(userController.searchUser);

module.exports = router;
