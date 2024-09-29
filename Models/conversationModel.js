const { Schema, model } = require("mongoose");

const conversationSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    messages: [
      {
        type: Schema.Types.ObjectId,
        ref: "Message",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = model("Conversation", conversationSchema);
