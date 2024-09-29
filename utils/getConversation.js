const Conversation = require("../Models/conversationModel");
const getConversation = async (userId) => {
  if (userId) {
    const userConversation = await Conversation.find({
      $or: [{ sender: userId, receiver: userId }],
    })
      .populate("messages")
      .populate("sender")
      .populate("receiver")
      .sort({ updatedAt: -1 });

    const conversation = userConversation?.map((conv) => {
      const countUnseenMsg = conv?.reduce((prev, msg) => {
        const msgByUserId = msg?.msgByUser?.toString();
        if (msgByUserId !== userId) {
          return prev + (msg?.seen ? 0 : 1);
        }
        return prev;
      }, 0);
      return {
        _id: conv?._id,
        sender: conv?.sender,
        receiver: conv?.receiver,
        unseenMsg: countUnseenMsg,
      };
    });
    return conversation;
  }
  return [];
};

module.exports = getConversation;
