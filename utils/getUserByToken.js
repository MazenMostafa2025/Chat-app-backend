const jwt = require("jsonwebtoken");
const User = require("../Models/userModel");
const catchAsync = require("./catchAsync");

const getUserByToken = catchAsync(async (token) => {
  if (!token)
    return {
      message: "no expired",
      logout: true,
    };
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id);
  return user;
});

module.exports = getUserByToken;
