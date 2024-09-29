const User = require("../Models/userModel");
const catchAsync = require("../utils/catchAsync");
const bcrypt = require("bcrypt");
const AppError = require("../utils/appError");
const jwt = require("jsonwebtoken");
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie("token", token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // secure: req.secure || req.headers["x-forwarded-proto"] === "https",
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    user,
  });
};

exports.registerUser = catchAsync(async (req, res, next) => {
  const { name, email, password, profilePic } = req.body;
  const checkEmail = await User.findOne({ email });
  if (checkEmail) return next(new AppError("User already exists", 400));

  const user = await User.create({
    name,
    email,
    password,
    profilePic,
  });

  createSendToken(user, 201, req, res);
});

exports.login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return next(new AppError("Please provide email and password!", 400));
  const user = await User.findOne({ email }).select("+password");
  const verifyPassword = user.correctPassword(password, user.password);
  if (!user || !verifyPassword)
    return next(new AppError("Invalid email or password", 401));
  createSendToken(user, 200, req, res);
});

exports.logout = catchAsync(async (req, res) => {
  const cookieOptions = {
    http: true,
    secure: true,
    samesite: "None",
  };

  return res
    .cookie("token", "", cookieOptions)
    .status(200)
    .json({ status: "success", message: "logged out successfully" });
});

exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  )
    token = req.headers.authorization.split(" ")[1];
  else if (req.cookies.token) token = req.cookies.token;

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const decoded = await jwt.verify(token, process.env.JWT_SECRET_KEY);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }
  req.user = currentUser;
  next();
});

exports.userDetails = catchAsync((req, res) => {
  const user = req.user;
  return res.status(200).json({
    status: "success",
    message: "user details",
    user,
  });
});

exports.updateUser = catchAsync(async (req, res) => {
  const { userId, name, profilePic } = req.body;
  const updatedUser = await User.updateOne(
    { _id: userId },
    { name, profilePic },
    {
      new: true,
    }
  );

  if (!updateUser) next(new AppError("User not found", 404));

  return res.status(200).json({
    status: "success",
    message: "user updated",
    updatedUser,
  });
});

exports.deleteUser = catchAsync(async (req, res) => {
  const { userId } = req.body;
  const deleteUser = await User.deleteOne({ _id: userId });
  return res.status(200).json({
    status: "success",
    message: "user deleted",
    deleteUser,
  });
});

exports.searchUser = catchAsync(async (req, res) => {
  const { search } = req.body;
  const query = new RegExp(search, "i", "g");
  const users = await User.find({ $or: [{ name: query }, { email: query }] });
  return res.status(200).json({
    message: "users matching the search query",
    users,
    status: "success",
  });
});
