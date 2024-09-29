const globalErrorHandler = require("./controllers/errorController");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const connectDB = require("./config/connection");
const router = require("./routes/router");
const { app, server } = require("./socket/index");

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const port = process.env.PORT || 5000;
app.use("/api", router);
app.all("*", (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

connectDB().then(() => {
  server.listen(port, () => console.log("server is running on port " + port));
});
