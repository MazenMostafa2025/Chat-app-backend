// Packages
const express = require("express");
const { Server } = require("socket.io");
const http = require("http");

// Models
const User = require("../Models/userModel");
const Conversation = require("../Models/conversationModel");
const Message = require("../Models/messageModel");

// Functions
const getUserByToken = require("../utils/getUserByToken");
const getConversation = require("../utils/getConversation");
const catchAsync = require("../utils/catchAsync");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
});

const onlineUsers = new Set();

const EVENTS = {
  MESSAGE_PAGE: "messagePage",
  NEW_MESSAGE: "newMessage",
  SIDEBAR: "sidebar",
  SEEN: "seen",
  DISCONNECT: "disconnect",
};

io.on(
  "connection",
  catchAsync(async (socket) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      socket.emit("error", { message: "Token not provided" });
      return socket.disconnect(true);
    }

    const user = await getUserByToken(token);

    if (!user) {
      socket.emit("error", { message: "User not authenticated" });
      return socket.disconnect(true);
    }

    await socket.join(user._id.toString());
    onlineUsers.add(user._id.toString());

    io.emit("onlineUser", Array.from(onlineUsers));

    socket.on(
      "messagePage",
      catchAsync(async (userId) => {
        const userDetails = await User.findById(userId).select("-password");
        if (!userDetails)
          return socket.emit("error", { message: "User not found" });

        const data = {
          _id: userDetails._id,
          name: userDetails.name,
          email: userDetails.email,
          profilePic: userDetails.profilePic,
          online: onlineUsers.has(userId),
        };

        socket.emit("messageUser", data);

        // old messages
        const conversationMessages = await Conversation.findOne({
          $or: [
            { sender: user._id, receiver: userId },
            { sender: userId, receiver: user._id },
          ],
        })
          .populate("messages")
          .sort({ updatedAt: -1 });

        if (!conversationMessages) socket.emit("message", []);

        socket.emit("message", conversationMessages.messages || []);
      })
    );

    //    new message
    socket.on(
      "newMessage",
      catchAsync(async (data) => {
        if (!data.sender || !data.receiver) {
          return socket.emit("error", { message: "Invalid message data" });
        }
        let conversation = await Conversation.findOne({
          $or: [
            { sender: data.sender, receiver: data.receiver },
            { sender: data.receiver, receiver: data.sender },
          ],
        });

        if (!conversation) {
          conversation = await Conversation.create({
            sender: data.sender,
            receiver: data.receiver,
          });
        }

        const message = await Message?.create({
          text: data.text,
          imageUrl: data.imageUrl,
          videoUrl: data.videoUrl,
          msgByUser: data.msgByUserId,
        });

        if (message) {
          const updatedConversation = await Conversation.findOneAndUpdate(
            { _id: conversation._id },
            {
              $push: { messages: message?._id },
            },
            {
              new: true,
            }
          )
            .populate("messages")
            .sort({ updatedAt: -1 });

          // send new message
          io.to(data.sender).emit(
            "message",
            updatedConversation.messages || []
          );

          io.to(data.receiver).emit(
            "message",
            updatedConversation.messages || []
          );

          // send conversation to frontend
          const senderConversation = await getConversation(data.sender);
          const receiverConversation = await getConversation(data.receiver);

          io.to(data.sender).emit("conversation", senderConversation || []);
          io.to(data.receiver).emit("conversation", receiverConversation || []);
        }
      })
    );

    // side bar
    socket.on(
      "sidebar",
      catchAsync(async (userId) => {
        const conversation = await getConversation(userId);
        socket.emit("conversation", conversation);
      })
    );

    socket.on(
      "seen",
      catchAsync(async (msgByUser) => {
        let conversation = await Conversation.findOne({
          $or: [
            { sender: user?._id, receiver: msgByUser },
            { sender: msgByUser, receiver: user?._id },
          ],
        });

        const messages = conversation?.messages || [];

        await Message.updateMany(
          {
            _id: { $in: messages },
            msgByUser,
          },
          {
            $set: { seen: true },
          }
        );

        const senderConv = await getConversation(user._id.toString());
        const receiverConv = await getConversation(msgByUser);

        io.to(user._id.toString()).emit("conversation", senderConv || []);
        io.to(msgByUser).emit("conversation", receiverConv || []);
      })
    );

    socket.on("disconnect", () => {
      onlineUsers.delete(user._id.toString());
      io.emit("onlineUser", Array.from(onlineUsers));
    });
  })
);

module.exports = {
  app,
  server,
};
