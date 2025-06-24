const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { isAuthenticated } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Get all messages
router.get('/', async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('sender', 'fullName')
      .populate('receiver', 'fullName');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get conversation between two users
router.get('/conversation', async (req, res) => {
  const { user1, user2 } = req.query;
  
  if (!user1 || !user2) {
    return res.status(400).json({ message: 'Please provide both user IDs' });
  }
  
  try {
    const messages = await Message.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    })
    .sort({ timestamp: 1 })
    .populate('sender', 'fullName profilePicture')
    .populate('receiver', 'fullName profilePicture');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user conversations (list of users the user has chatted with)
router.get('/user-conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Fetch conversations where user is a participant, ordered by latest activity
    const conversations = await Conversation.find({ participants: userId })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'fullName profilePicture userType');

    const summaries = conversations.map((conv) => {
      // Identify the partner (other participant)
      const partner = conv.participants.find((p) => p._id.toString() !== userId);
      return {
        conversationId: conv._id,
        userId: partner?._id,
        partnerName: partner?.fullName,
        partnerPicture: partner?.profilePicture || '',
        partnerType: partner?.userType,
        lastMessage: conv.lastMessage,
        timestamp: conv.lastMessageAt,
        // Unread count could be calculated by counting unread msgs; quick version = 0
        unread: 0,
      };
    });

    res.json(summaries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get unread message count
router.get('/unread-count/:userId', async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.params.userId,
      read: false
    });
    
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send a new message
router.post('/', isAuthenticated,
  [
    body('sender').notEmpty().withMessage('sender is required'),
    body('receiver').notEmpty().withMessage('receiver is required'),
    // Custom validator: require either non-empty content or at least one attachment
    body().custom((value) => {
      if ((!value.content || value.content.trim() === '') && (!value.attachments || value.attachments.length === 0)) {
        throw new Error('Either content or attachments is required');
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sender, receiver, content = '', attachments = [] } = req.body;
    
    if (!sender || !receiver || ((content.trim() === '') && attachments.length === 0)) {
      return res.status(400).json({ message: 'Please provide sender, receiver and either content or attachments' });
    }
    
    const newMessage = new Message({
      sender,
      receiver,
      content: content.trim(),
      attachments,
    });
    
    try {
      const savedMessage = await newMessage.save();

      // Update conversation metadata as well (participants sorted for uniqueness)
      const participants = [sender.toString(), receiver.toString()].sort();
      await Conversation.findOneAndUpdate(
        { participants: { $all: participants, $size: 2 } },
        {
          $set: {
            lastMessage: content && content.trim() !== '' ? content : (attachments.length > 0 ? '📎 Attachment' : ''),
            lastMessageFrom: sender,
            lastMessageAt: savedMessage.timestamp,
          },
          $setOnInsert: { participants },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(201).json(savedMessage);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Mark messages as read
router.put('/mark-read', isAuthenticated, async (req, res) => {
  const { messageIds } = req.body;
  
  if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
    return res.status(400).json({ message: 'Please provide an array of message IDs' });
  }
  
  try {
    const result = await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { read: true } }
    );
    
    res.json({
      message: 'Messages marked as read',
      count: result.modifiedCount
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete a message
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const message = await Message.findByIdAndDelete(req.params.id);
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router; 