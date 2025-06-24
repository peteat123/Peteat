const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Map to keep track of online users and their corresponding socket IDs
const onlineUsers = new Map();

module.exports = (io) => {
  // Middleware – authenticate every Socket.IO connection
  io.use((socket, next) => {
    try {
      // Client should send token either as auth.token or query.token
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // e.g. { id, role, ... }
      return next();
    } catch (err) {
      return next(new Error('Authentication error: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;

    // Mark user as online
    onlineUsers.set(userId, socket.id);
    socket.join(userId); // Join a private room named by user ID for easy targeting

    // Handle sending messages
    socket.on('sendMessage', async ({ receiver, content = '', attachments = [] }) => {
      try {
        if (!receiver || ((content.trim() === '') && attachments.length === 0)) {
          return socket.emit('error', { message: 'receiver and either content or attachments is required' });
        }

        const newMessage = new Message({
          sender: userId,
          receiver,
          content,
          attachments,
        });

        // Save message in DB
        const savedMessage = await newMessage.save();

        // Upsert conversation document
        const lastMessagePreview = content && content.trim() !== '' ? content : (attachments.length > 0 ? '📎 Attachment' : '');

        const participantsSorted = [userId.toString(), receiver.toString()].sort();

        const convoDoc = await Conversation.findOneAndUpdate(
          { participants: { $all: participantsSorted, $size: 2 } },
          {
            $set: { lastMessage: lastMessagePreview, lastMessageAt: new Date() },
            $setOnInsert: { participants: participantsSorted },
          },
          { new: true, upsert: true }
        );

        // Emit message to receiver if online
        io.to(receiver.toString()).emit('receiveMessage', savedMessage);

        // Acknowledge sender
        socket.emit('messageSaved', savedMessage);

        // Send / update conversation summary for inbox realtime update
        const convoSummary = {
          conversationId: convoDoc?._id?.toString() || '',
          userId: userId.toString() === participantsSorted[0] ? participantsSorted[1] : participantsSorted[0],
          partnerName: undefined, // front-end will fetch on reload; optional improvement
          lastMessage: lastMessagePreview,
          timestamp: savedMessage.timestamp,
          unread: 0,
        };

        participantsSorted.forEach((uid) => {
          io.to(uid).emit('conversationUpdated', convoSummary);
        });
      } catch (err) {
        console.error('sendMessage error:', err);
        socket.emit('error', { message: 'Failed to send message', error: err.message });
      }
    });

    // Mark messages as read
    socket.on('markRead', async ({ messageIds }) => {
      try {
        await Message.updateMany({ _id: { $in: messageIds } }, { $set: { read: true } });
        socket.emit('readReceipt', { messageIds });
      } catch (err) {
        console.error('markRead error:', err);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      onlineUsers.delete(userId);
    });
  });
}; 