const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Exactly two participants (pet owner & clinic). We'll store their user IDs.
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  ],
  // Last message preview
  lastMessage: {
    type: String,
  },
  // Who sent the last message (for badge direction)
  lastMessageFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Timestamp of the last message
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
});

// Index to speed-up lookup by participant list
conversationSchema.index({ participants: 1 });

module.exports = mongoose.model('Conversation', conversationSchema); 